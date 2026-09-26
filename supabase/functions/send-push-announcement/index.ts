import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" },
});
const normalise = (value: unknown) => String(value || "").trim().toLowerCase();

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization") || "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Unauthorised" }, 401);

  const { data: profile } = await userClient.from("profiles").select("id,app_role,active").eq("id", userData.user.id).maybeSingle();
  if (!profile?.active || !["admin", "content_manager", "protocol", "operations"].includes(profile.app_role)) {
    return json({ error: "Insufficient permissions" }, 403);
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* handled below */ }
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  if (body.action === "status") {
    const [configuration, subscriptions] = await Promise.all([
      service.from("push_configuration").select("config_name").eq("config_name", "default").eq("active", true).maybeSingle(),
      service.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    return json({ enabled: !!configuration.data, active_subscriptions: subscriptions.count || 0 });
  }

  const announcementId = body.announcement_id;
  if (!announcementId) return json({ error: "Missing announcement_id" }, 400);

  const [configuration, announcementResult, subscriptionResult] = await Promise.all([
    service.from("push_configuration").select("*").eq("config_name", "default").eq("active", true).maybeSingle(),
    service.from("announcements").select("id,title,body,priority,event_id,published,push_notification,action_url,audience").eq("id", announcementId).maybeSingle(),
    service.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth_key").eq("active", true),
  ]);
  if (configuration.error || !configuration.data) return json({ error: "Push configuration unavailable" }, 500);
  if (announcementResult.error || !announcementResult.data) return json({ error: "Notification not found" }, 404);
  if (!announcementResult.data.published) return json({ error: "Notification must be published first" }, 400);
  if (!announcementResult.data.push_notification) return json({ error: "Notification is not marked for browser delivery" }, 400);
  if (subscriptionResult.error) return json({ error: "Unable to load enrolled devices" }, 500);

  const announcement = announcementResult.data;
  const { data: event, error: eventError } = await service.from("events").select("is_test,delivery_disabled").eq("id", announcement.event_id).single();
  if (eventError || !event || event.is_test || event.delivery_disabled) return json({ error: "External delivery is disabled for this event" }, 403);
  const subscriptions = subscriptionResult.data || [];
  const audience = (announcement.audience || ["all"]).map(normalise);
  let eligible = subscriptions;

  if (!audience.includes("all")) {
    const userIds = [...new Set(subscriptions.map(subscription => subscription.user_id))];
    const [profileResult, linkResult] = await Promise.all([
      userIds.length
        ? service.from("profiles").select("id,attendee_id,app_role,active").in("id", userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? service.from("user_attendee_links").select("user_id,attendee_id,attendees(id,category,service,event_id)").in("user_id", userIds).eq("event_id", announcement.event_id)
        : Promise.resolve({ data: [] }),
    ]);
    const profiles = profileResult.data || [];
    const directIds = profiles.map(item => item.attendee_id).filter(Boolean);
    const directResult = directIds.length
      ? await service.from("attendees").select("id,category,service,event_id").in("id", directIds)
      : { data: [] };
    const attendeeByUser = new Map<string, Record<string, unknown>>();
    for (const item of profiles) {
      const attendee = (directResult.data || []).find(row => row.id === item.attendee_id && row.event_id === announcement.event_id);
      if (attendee) attendeeByUser.set(item.id, attendee);
    }
    for (const link of linkResult.data || []) {
      const attendee = (link as { attendees?: Record<string, unknown> }).attendees;
      if (attendee) attendeeByUser.set(link.user_id, attendee);
    }
    const profileByUser = new Map(profiles.map(item => [item.id, item]));
    eligible = subscriptions.filter(subscription => {
      const userProfile = profileByUser.get(subscription.user_id);
      const attendee = attendeeByUser.get(subscription.user_id);
      if (audience.includes("staff") && userProfile?.active && userProfile.app_role !== "attendee") return true;
      if (!attendee) return false;
      if (audience.includes("attendees")) return true;
      return audience.includes(`category:${normalise(attendee.category)}`) || audience.includes(`service:${normalise(attendee.service)}`);
    });
  }

  const audit = await service.from("notification_deliveries").insert({
    event_id: announcement.event_id,
    announcement_id: announcement.id,
    requested_by: userData.user.id,
    audience,
    eligible_count: eligible.length,
    delivery_status: "processing",
  }).select("id").single();
  if (audit.error || !audit.data) return json({ error: "Unable to create the notification delivery audit" }, 500);

  webpush.setVapidDetails(configuration.data.subject, configuration.data.vapid_public_key, configuration.data.vapid_private_key);
  let delivered = 0;
  let failed = 0;
  const payload = JSON.stringify({
    title: announcement.title,
    body: announcement.body,
    url: announcement.action_url || "/#/event",
    tag: `announcement-${announcement.id}`,
    urgent: announcement.priority === "urgent",
  });
  for (const subscription of eligible) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
      }, payload);
      delivered += 1;
    } catch (error) {
      failed += 1;
      const statusCode = (error as { statusCode?: number })?.statusCode || 0;
      if (statusCode === 404 || statusCode === 410) {
        await service.from("push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", subscription.id);
      }
    }
  }

  const completedAt = new Date().toISOString();
  const deliveryStatus = failed === 0 ? "completed" : delivered > 0 ? "partial" : "failed";
  await Promise.all([
    service.from("notification_deliveries").update({
      completed_at: completedAt,
      delivered_count: delivered,
      failure_count: failed,
      delivery_status: deliveryStatus,
      error_message: failed ? `${failed} enrolled device${failed === 1 ? "" : "s"} rejected delivery.` : null,
    }).eq("id", audit.data.id),
    service.from("announcements").update({
      push_sent_at: completedAt,
      push_sent_by: userData.user.id,
      push_delivery_count: delivered,
      push_failure_count: failed,
    }).eq("id", announcement.id),
  ]);

  return json({ ok: true, eligible: eligible.length, delivered, failed, delivery_id: audit.data.id });
});
