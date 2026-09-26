import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { createTransferManifestPdf } from "./transfer-pdf.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Disposition",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers:{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store"},
});
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown) => String(value ?? "").trim();

Deno.serve(async request => {
  if(request.method === "OPTIONS") return new Response("ok",{headers:cors});
  if(request.method !== "POST") return json({error:"Method not allowed"},405);
  const supabaseUrl=Deno.env.get("SUPABASE_URL"),anonKey=Deno.env.get("SUPABASE_ANON_KEY"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!supabaseUrl||!anonKey||!serviceKey)return json({error:"Service configuration is incomplete"},503);
  const authHeader=request.headers.get("Authorization")||"";
  const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
  const {data:userData,error:userError}=await userClient.auth.getUser();
  if(userError||!userData.user)return json({error:"Unauthorised"},401);
  const {data:profile}=await userClient.from("profiles").select("app_role,active").eq("id",userData.user.id).maybeSingle();
  if(!profile?.active||!["admin","protocol","operations","read_only"].includes(profile.app_role))return json({error:"Insufficient permissions"},403);
  let body:Record<string,unknown>={};
  try{body=await request.json();}catch{return json({error:"Invalid JSON"},400);}
  if(clean(body.action)!=="document")return json({error:"Unknown action"},400);
  const runId=clean(body.transfer_run_id);if(!uuidPattern.test(runId))return json({error:"A valid transfer is required"},400);
  const service=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  try{
    const {data:run,error:runError}=await service.from("transfer_runs").select("*").eq("id",runId).single();
    if(runError||!run)throw new Error(runError?.message||"Transfer not found");
    const {data:event,error:eventError}=await service.from("events").select("is_test,event_year").eq("id",run.event_id).single();
    if(eventError||!event||(event.is_test&&profile.app_role!=="admin"))return json({error:"Event access denied"},403);
    const {data:passengers,error:passengerError}=await service.from("transfer_passengers").select("passenger_name_snapshot,passenger_mobile_snapshot,pickup_override,passenger_notes,sort_order").eq("transfer_run_id",runId).order("sort_order");
    if(passengerError)throw new Error(passengerError.message);
    const bytes=await createTransferManifestPdf(run,passengers||[],event.event_year,event.is_test);
    const filename=`${clean(run.transfer_name).replace(/[^A-Za-z0-9._-]+/g,"-")||"transfer"}-manifest.pdf`;
    return new Response(bytes,{status:200,headers:{...cors,"content-type":"application/pdf","content-disposition":`inline; filename="${filename}"`,"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
  }catch(error){return json({error:clean(error instanceof Error?error.message:error)||"Manifest generation failed"},400);}
});
