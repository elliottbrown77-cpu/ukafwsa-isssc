import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { createInvoicePdf, InvoiceDocument, InvoiceLine } from "./invoice-pdf.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Disposition",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const printable = (value: unknown) => String(value ?? "").trim();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] || character);
const money = (value: unknown) => new Intl.NumberFormat("en-GB", {
  style: "currency", currency: "GBP",
}).format(Number(value || 0));
const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
};
const sha256 = async (bytes: Uint8Array) => Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
).map((byte) => byte.toString(16).padStart(2, "0")).join("");
const safeFilename = (value: unknown) => printable(value).replace(/[^A-Za-z0-9._-]+/g, "-") || "invoice";

type AdminClient = ReturnType<typeof createClient>;

async function loadEmailSettings(service: AdminClient, eventId: string) {
  if (!uuidPattern.test(eventId)) return null;
  const { data, error } = await service.from("event_email_settings")
    .select("invoice_from_email,invoice_sender_name,invoice_reply_to,active")
    .eq("event_id", eventId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as {
    invoice_from_email: string | null;
    invoice_sender_name: string | null;
    invoice_reply_to: string | null;
    active: boolean;
  } | null;
}

async function loadInvoice(service: AdminClient, invoiceId: string) {
  const { data: invoice, error: invoiceError } = await service.from("invoices").select([
    "id", "event_id", "attendee_id", "billing_account_organisation_id", "invoice_type",
    "invoice_reference", "status", "issue_date", "due_date", "purchase_order_reference",
    "payment_link", "notes", "net_total", "vat_total", "gross_total", "pdf_path",
    "pdf_generated_at", "pdf_sha256", "approved_at", "issued_at", "paid_at",
    "issuer_name_snapshot", "issuer_address_snapshot", "issuer_legal_details_snapshot",
    "payment_instructions_snapshot", "invoice_footer_snapshot", "recipient_name_snapshot",
    "recipient_email_snapshot", "recipient_address_snapshot", "event_name_snapshot",
    "event_start_date_snapshot", "event_end_date_snapshot",
  ].join(",")).eq("id", invoiceId).single();
  if (invoiceError || !invoice) throw new Error(invoiceError?.message || "Invoice not found");

  const lines: InvoiceLine[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await service.from("invoice_lines")
      .select("attendee_id,attendee_name_snapshot,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,created_at")
      .eq("invoice_id", invoiceId).order("created_at").order("id").range(offset,offset+499);
    if (page.error) throw new Error(page.error.message);
    lines.push(...page.data);
    if (page.data.length < 500) break;
  }
  if (!lines?.length) throw new Error("Invoice has no charge lines");
  return { invoice: invoice as InvoiceDocument & Record<string, unknown>, lines: lines as InvoiceLine[] };
}

async function invoicePdf(service: AdminClient, invoice: InvoiceDocument & Record<string, unknown>, lines: InvoiceLine[]) {
  if (invoice.pdf_path && ["issued", "paid"].includes(String(invoice.status))) {
    const { data, error } = await service.storage.from("invoice-documents").download(String(invoice.pdf_path));
    if (!error && data) {
      const bytes = new Uint8Array(await data.arrayBuffer());
      return { bytes, hash: printable(invoice.pdf_sha256) || await sha256(bytes), path: String(invoice.pdf_path) };
    }
  }

  const bytes = await createInvoicePdf(invoice, lines);
  const hash = await sha256(bytes);
  let path: string | null = null;
  if (["issued", "paid"].includes(String(invoice.status))) {
    path = `${invoice.event_id}/${safeFilename(invoice.invoice_reference)}.pdf`;
    const upload = await service.storage.from("invoice-documents").upload(path, bytes, {
      contentType: "application/pdf",
      cacheControl: "31536000",
      upsert: false,
    });
    if (upload.error && !/already exists|duplicate/i.test(upload.error.message)) throw new Error(upload.error.message);
    if (upload.error) {
      const existing = await service.storage.from("invoice-documents").download(path);
      if (existing.error || !existing.data) throw new Error(existing.error?.message || "Stored invoice could not be loaded");
      const storedBytes = new Uint8Array(await existing.data.arrayBuffer());
      return { bytes: storedBytes, hash: await sha256(storedBytes), path };
    }
    const { error: updateError } = await service.from("invoices").update({
      pdf_path: path,
      pdf_generated_at: new Date().toISOString(),
      pdf_sha256: hash,
      updated_at: new Date().toISOString(),
    }).eq("id", invoice.id);
    if (updateError) throw new Error(updateError.message);
  }
  return { bytes, hash, path };
}

function emailHtml(invoice: InvoiceDocument, recipientName: string) {
  const siteUrl = Deno.env.get("SITE_URL") || "https://ukafwsa-isssc.netlify.app";
  return `<!doctype html><html><body style="margin:0;background:#f2f7fb;color:#0b1b2d;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f7fb;padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d7e2ec">
  <tr><td style="background:#071d2b;padding:22px 28px"><img src="${escapeHtml(siteUrl)}/ukafwsa-mark.svg" width="54" height="57" alt="UKAF WSA" style="vertical-align:middle"><span style="display:inline-block;vertical-align:middle;color:#ffffff;font-size:20px;font-weight:700;margin-left:16px">UKAF WSA<br><span style="font-size:12px;font-weight:400;color:#c7d5df">${escapeHtml(invoice.event_name_snapshot || "Inter Service Snow Sports Championships")}</span></span></td></tr>
  <tr><td style="padding:30px 32px"><p style="margin:0 0 18px">Dear ${escapeHtml(recipientName || "attendee")},</p>
  <h1 style="font-size:25px;margin:0 0 12px;color:#0b1b2d">Your ISSSC invoice</h1>
  <p style="line-height:1.6;margin:0 0 20px">Please find invoice <strong>${escapeHtml(invoice.invoice_reference)}</strong> attached as a PDF. The total due is <strong>${escapeHtml(money(invoice.gross_total))}</strong>.</p>
  <div style="background:#f2f7fb;border-radius:12px;padding:18px;margin:0 0 20px"><strong>Payment instructions</strong><div style="white-space:pre-line;line-height:1.5;margin-top:8px">${escapeHtml(invoice.payment_instructions_snapshot || "Please refer to the attached invoice.")}</div></div>
  ${invoice.payment_link ? `<p style="margin:0 0 20px"><a href="${escapeHtml(invoice.payment_link)}" style="background:#6e29bf;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:9px;display:inline-block;font-weight:700">Open payment link</a></p>` : ""}
  <p style="line-height:1.6;margin:0">If you have a query about the charges, please reply to this email and quote ${escapeHtml(invoice.invoice_reference)}.</p></td></tr>
  <tr><td style="padding:18px 32px;background:#f7f9fb;color:#66758a;font-size:12px">${escapeHtml(invoice.invoice_footer_snapshot || "UK Armed Forces Winter Sports Association")}</td></tr>
  </table></td></tr></table></body></html>`;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Service configuration is incomplete" }, 503);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }, auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Unauthorised" }, 401);
  const { data: profile } = await userClient.from("profiles").select("app_role,active")
    .eq("id", userData.user.id).maybeSingle();
  if (!profile?.active || !["admin", "finance", "read_only"].includes(profile.app_role)) {
    return json({ error: "Insufficient permissions" }, 403);
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  let action = printable(body.action);
  const canSend = ["admin", "finance"].includes(profile.app_role);
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const fallbackFromEmail = Deno.env.get("INVOICE_FROM_EMAIL") || "";
  const fallbackReplyTo = Deno.env.get("INVOICE_REPLY_TO") || "";
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  if (action === "capabilities") {
    try {
      const settings = await loadEmailSettings(service, printable(body.event_id));
      const active = settings ? settings.active : true;
      const fromEmail = active ? printable(settings?.invoice_from_email || fallbackFromEmail) : "";
      return json({
        email_configured: Boolean(resendKey && fromEmail),
        provider_configured: Boolean(resendKey),
        provider: "resend",
        sender: fromEmail || null,
        sender_name: active ? printable(settings?.invoice_sender_name || "UKAF WSA") : null,
        reply_to: active ? printable(settings?.invoice_reply_to || fallbackReplyTo) || null : null,
        settings_source: settings ? "admin" : "server_fallback",
        sending_active: active,
      });
    } catch (error) {
      return json({ error: printable(error instanceof Error ? error.message : error) || "Could not load email settings" }, 500);
    }
  }

  let deliveryUncertain = false;
  let job: Record<string, any> | null = null;
  const finishJob = async (status: string, values: Record<string, unknown> = {}) => {
    if (!job) return;
    const { error } = await service.from("invoice_dispatch_jobs").update({status, ...values, updated_at: new Date().toISOString()}).eq("id", job.id);
    if (error) throw new Error(error.message);
  };
  if (action === "dispatch") {
    if (!canSend || !uuidPattern.test(printable(body.job_id))) return json({error: "A valid dispatch job and Finance access are required"}, 403);
    const claim = await service.rpc("claim_invoice_dispatch_service", {p_job_id: body.job_id, p_actor_id: userData.user.id});
    if (claim.error) return json({error: claim.error.message}, 400);
    if (!claim.data.claimed) return json({ok: ["accepted", "captured"].includes(claim.data.job.status), job: claim.data.job});
    job = claim.data.job;
    body.invoice_id = job!.invoice_id;
    body.recipient_email = job!.recipient_email;
    body.subject = job!.subject;
    action = "send";
  }
  const invoiceId = printable(body.invoice_id);
  if (!uuidPattern.test(invoiceId)) return json({ error: "A valid invoice is required" }, 400);

  try {
    if (action === "document") {
      const loaded = await loadInvoice(service, invoiceId);
      const { data: documentEvent, error: documentEventError } = await service.from("events").select("is_test").eq("id", loaded.invoice.event_id).single();
      if (documentEventError || !documentEvent || (documentEvent.is_test && profile.app_role !== "admin")) return json({ error: "Event access denied" }, 403);
      if (!["approved", "issued", "paid"].includes(String(loaded.invoice.status))) {
        return json({ error: "Confirm the invoice before generating its PDF" }, 409);
      }
      const document = await invoicePdf(service, loaded.invoice, loaded.lines);
      const filename = `${safeFilename(loaded.invoice.invoice_reference)}.pdf`;
      return new Response(document.bytes, {
        status: 200,
        headers: {
          ...cors,
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="${filename}"`,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }

    if (action !== "send") return json({ error: "Unknown action" }, 400);
    if (!canSend) return json({ error: "Insufficient permissions" }, 403);

    const recipientEmail = printable(body.recipient_email).toLowerCase();
    const subject = printable(body.subject);
    if (!emailPattern.test(recipientEmail) || recipientEmail.length > 320) return json({ error: "Enter a valid recipient email address" }, 400);
    if (!subject || subject.length > 250) return json({ error: "Enter an email subject of 250 characters or fewer" }, 400);

    const initial = await loadInvoice(service, invoiceId);
    const { data: event, error: eventError } = await service.from("events").select("is_test,delivery_disabled").eq("id", initial.invoice.event_id).single();
    if (job?.capture_only) {
      if (eventError || !event?.is_test || profile.app_role !== "admin") throw new Error("Capture requires an Admin-only test event");
      if (!["approved", "issued"].includes(String(initial.invoice.status))) throw new Error("Confirm invoice before capture");
      const document = await createInvoicePdf(initial.invoice, initial.lines);
      await finishJob("captured", {pdf_sha256: await sha256(document), captured_payload: {
        recipient: recipientEmail, subject, html: emailHtml(initial.invoice, printable(initial.invoice.recipient_name_snapshot)),
        invoice_reference: initial.invoice.invoice_reference, payment_link: initial.invoice.payment_link,
        payment_instructions: initial.invoice.payment_instructions_snapshot, gross_total: initial.invoice.gross_total,
        attachment_bytes: document.length, simulated: true,
      }});
      return json({ok:true, simulated:true, job_id:job.id});
    }
    if (eventError || !event || event.is_test || event.delivery_disabled) { if (job) throw new Error("External delivery is disabled for this event"); return json({error:"External delivery is disabled for this event"},403); }
    const settings = await loadEmailSettings(service, printable(initial.invoice.event_id));
    const sendingActive = settings ? settings.active : true;
    const fromEmail = sendingActive ? printable(settings?.invoice_from_email || fallbackFromEmail) : "";
    const senderName = sendingActive ? printable(settings?.invoice_sender_name || "UKAF WSA") : "";
    const replyTo = sendingActive ? printable(settings?.invoice_reply_to || fallbackReplyTo) : "";
    if (!resendKey || !fromEmail) {
      throw new Error(sendingActive ? "Invoice email is not fully configured. An administrator must set a sender address and connect the email provider." : "Invoice email sending is disabled in Admin settings.");
    }

    const claim = await service.rpc("claim_invoice_delivery_service", {p_invoice_id: invoiceId, p_actor_id: userData.user.id, p_recipient: recipientEmail, p_subject: subject});
    if (claim.error) throw new Error(claim.error.message);
    const delivery = {id: claim.data};
    let providerStarted = false;
    let knownRejected = false;
    let providerAccepted = false;
    let providerMessageId: string | null = null;
    try {
      const issue = await service.rpc("issue_invoice_for_delivery_service", {p_invoice_id: invoiceId, p_actor_id: userData.user.id});
      if (issue.error) throw new Error(issue.error.message);
      const loaded = await loadInvoice(service, invoiceId);
      const recipientName = printable(loaded.invoice.recipient_name_snapshot);
      const document = await invoicePdf(service, loaded.invoice, loaded.lines);
      providerStarted = true;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `invoice-delivery-${delivery.id}`,
        },
        body: JSON.stringify({
          from: senderName ? `${senderName} <${fromEmail}>` : fromEmail,
          to: [recipientEmail],
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject,
          html: emailHtml(loaded.invoice, recipientName),
          attachments: [{
            filename: `${safeFilename(loaded.invoice.invoice_reference)}.pdf`,
            content: bytesToBase64(document.bytes),
          }],
          tags: [
            { name: "type", value: "invoice" },
            { name: "invoice", value: safeFilename(loaded.invoice.invoice_reference).slice(0, 256) },
          ],
        }),
      });
      const providerResult = await response.json().catch(() => ({}));
      if (!response.ok || !providerResult?.id) {
        knownRejected = response.status >= 400 && response.status < 500 && response.status !== 408;
        throw new Error(printable(providerResult?.message || providerResult?.error || `Email provider returned ${response.status}`));
      }
      providerAccepted = true;
      providerMessageId = printable(providerResult.id);
      const acceptedAt = new Date().toISOString();
      const deliveryUpdate = await service.from("invoice_deliveries").update({
        delivery_status: "accepted",
        provider_message_id: providerMessageId,
        accepted_at: acceptedAt,
        pdf_sha256: document.hash,
        error_message: null,
      }).eq("id", delivery.id);
      if (deliveryUpdate.error) throw new Error(deliveryUpdate.error.message);
      const invoiceUpdate = await service.from("invoices").update({
        sent_at: acceptedAt,
        pdf_sha256: document.hash,
        updated_at: acceptedAt,
      }).eq("id", invoiceId);
      if (invoiceUpdate.error) throw new Error(invoiceUpdate.error.message);
      await finishJob("accepted", {delivery_id:delivery.id});
      return json({ ok: true, delivery_id: delivery.id, provider_message_id: providerMessageId, accepted_at: acceptedAt });
    } catch (error) {
      if (providerAccepted || (providerStarted && !knownRejected)) {
        deliveryUncertain = true;
        await service.from("invoice_deliveries").update({
          provider_message_id: providerMessageId,
          error_message: "Delivery outcome needs verification. Do not resend until Finance checks the provider log.",
        }).eq("id", delivery.id);
        await finishJob("unknown", {delivery_id:delivery.id,error_message:"Delivery outcome needs provider verification; do not resend."});
        return json({ error: "Delivery outcome needs provider verification; do not resend." }, 500);
      }
      await service.from("invoice_deliveries").update({
        delivery_status: "failed",
        error_message: printable(error instanceof Error ? error.message : error).slice(0, 1000),
      }).eq("id", delivery.id);
      await finishJob("failed", {delivery_id:delivery.id,error_message:printable(error instanceof Error ? error.message : error)});
      throw error;
    }
  } catch (error) {
    const message = printable(error instanceof Error ? error.message : error) || "Invoice delivery failed";
    if (job && !deliveryUncertain) {
      await service.from("invoice_dispatch_jobs").update({status:"failed",error_message:message,updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","processing");
    }
    return json({ error: message }, 400);
  }
});
