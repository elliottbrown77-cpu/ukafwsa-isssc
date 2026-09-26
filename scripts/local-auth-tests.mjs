// Real local Supabase Auth/PostgREST integration. Refuses non-loopback URLs.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const cli='node_modules/supabase/bin/supabase';
const config=JSON.parse(execFileSync(cli,['status','--workdir','.local/stack','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const url=config.API_URL;assert.equal(new URL(url).hostname,'127.0.0.1','Local testing only');
const anon=config.ANON_KEY,service=config.SERVICE_ROLE_KEY;
assert.ok(anon&&service,'Local API keys missing');
const docker=process.env.ISSSC_DOCKER||'/Applications/Rancher Desktop.app/Contents/Resources/resources/darwin/bin/docker';
const dockerArgs=process.env.DOCKER_HOST?[]:['--context','rancher-desktop'];
function sql(query){return execFileSync(docker,[...dockerArgs,'exec','-i','supabase_db_isssc-v35-local','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:query,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();}
async function api(path,body,token=service,method='POST'){
 const response=await fetch(url+path,{method,headers:{apikey:anon,Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>null);return {status:response.status,ok:response.ok,data};
}
async function rpc(name,args,token){return api('/rest/v1/rpc/'+name,args,token);}
const event='26352026-0000-4000-8000-000000000035';
const live='9c1c1d5e-d9f1-4f6b-b323-f3c35261fc19';
const accounts={};
for(const role of ['admin','protocol','operations','finance','read_only','attendee']){
 const email=`local-${role}@example.invalid`,password=randomBytes(24).toString('base64url');
 const existing=await api('/auth/v1/admin/users?page=1&per_page=1000',undefined,service,'GET');assert.ok(existing.ok,JSON.stringify(existing.data));
 let user=existing.data.users.find(u=>u.email===email);
 if(user){const r=await api('/auth/v1/admin/users/'+user.id,{password,email_confirm:true},service,'PUT');assert.ok(r.ok,JSON.stringify(r.data));}
 else {const r=await api('/auth/v1/admin/users',{email,password,email_confirm:true});assert.ok(r.ok,JSON.stringify(r.data));user=r.data;}
 sql(`update public.profiles set app_role='${role}',active=true where id='${user.id}';`);
 const login=await api('/auth/v1/token?grant_type=password',{email,password},anon);assert.ok(login.ok,JSON.stringify(login.data));
 accounts[role]={id:user.id,email,token:login.data.access_token};
}
const admin=accounts.admin;
if(sql(`select count(*) from public.events where id='${event}'`) === '0')sql(`select set_config('request.jwt.claim.sub','${admin.id}',false);`+readFileSync('.local/replay/seed.sql','utf8'));
if(sql(`select count(*) from public.events where id='${live}'`) === '0')sql(`insert into public.events(id,name,event_year,start_date,end_date,invoice_prefix,active) values('${live}','LOCAL synthetic 2027',2027,'2027-01-30','2027-02-06','LOCAL-2027',true);`);
const results=[];
async function check(name,fn){await fn();results.push({name,passed:true});console.log('PASS',name);}
const reportArgs={p_event_id:event,p_report_key:'master',p_filters:{}};
await check('real Admin login reads all six replay reports',async()=>{
 for(const key of ['master','hotels','lift_passes','equipment','lessons','transport']){const r=await rpc('get_staff_report',{...reportArgs,p_report_key:key},admin.token);assert.ok(r.ok,JSON.stringify(r.data));if(key==='master')assert.equal(r.data.length,129);}
});
await check('all non-Admin roles and anonymous cannot read the replay',async()=>{
 for(const actor of [...Object.values(accounts).filter(a=>a!==admin),{token:anon}]){
  const r=await rpc('get_staff_report',reportArgs,actor.token);assert.ok(!r.ok);
  const table=await api(`/rest/v1/attendees?event_id=eq.${event}&select=id`,undefined,actor.token,'GET');assert.ok(!table.ok||table.data.length===0);
 }
});
await check('Protocol default transport access is limited to live context',async()=>{
 const r=await rpc('get_staff_report',{...reportArgs,p_event_id:live,p_report_key:'transport'},accounts.protocol.token);assert.ok(r.ok,JSON.stringify(r.data));
 const denied=await rpc('get_staff_report',{...reportArgs,p_event_id:live},accounts.protocol.token);assert.ok(!denied.ok);
});
await check('view and export grants are separate and revocable',async()=>{
 const args={p_event_id:live,p_user_id:accounts.finance.id,p_report_key:'hotels',p_view:true,p_export:false};
 let r=await rpc('admin_set_report_permission',args,admin.token);assert.ok(r.ok,JSON.stringify(r.data));
 r=await rpc('get_staff_report',{...reportArgs,p_event_id:live,p_report_key:'hotels'},accounts.finance.token);assert.ok(r.ok,JSON.stringify(r.data));
 const exp={p_event_id:live,p_report_key:'hotels',p_format:'csv',p_filters:{},p_columns:['surname']};
 r=await rpc('export_staff_report',exp,accounts.finance.token);assert.ok(!r.ok);
 r=await rpc('admin_set_report_permission',{...args,p_export:true},admin.token);assert.ok(r.ok);
 r=await rpc('export_staff_report',exp,accounts.finance.token);assert.ok(r.ok,JSON.stringify(r.data));
 r=await rpc('admin_set_report_permission',{...args,p_view:false},admin.token);assert.ok(r.ok);
 r=await rpc('export_staff_report',exp,accounts.finance.token);assert.ok(!r.ok);
});
await check('export audit records real identity and cannot be deleted',async()=>{
 const r=await rpc('export_staff_report',{...reportArgs,p_format:'csv',p_columns:['surname']},admin.token);assert.ok(r.ok,JSON.stringify(r.data));assert.equal(r.data.rows.length,129);
 const row=await api(`/rest/v1/report_export_audit?id=eq.${r.data.audit_id}`,undefined,admin.token,'GET');assert.ok(row.ok);assert.equal(row.data[0].actor_id,admin.id);assert.equal(row.data[0].row_count,129);
 const del=await api(`/rest/v1/report_export_audit?id=eq.${r.data.audit_id}`,undefined,admin.token,'DELETE');assert.ok(!del.ok);
});
await check('complete workbook contains eight audited sheets',async()=>{
 const r=await rpc('export_master_workbook',{p_event_id:event,p_filters:{}},admin.token);assert.ok(r.ok,JSON.stringify(r.data));assert.equal(r.data.length,8);assert.ok(r.data.every(s=>s.audit_id));
});
await check('deactivation invalidates report access with existing JWT',async()=>{
 sql(`update public.profiles set active=false where id='${accounts.protocol.id}';`);
 try {const r=await rpc('get_staff_report',{...reportArgs,p_event_id:live,p_report_key:'transport'},accounts.protocol.token);assert.ok(!r.ok);}finally{sql(`update public.profiles set active=true where id='${accounts.protocol.id}';`);}
});
await check('confirmed lift request, rejection and approval through authenticated RPCs',async()=>{
 const person=randomUUID(),lift=randomUUID();
 sql(`insert into attendees(id,event_id,first_name,surname,category) values('${person}','${live}','Local','Approval check','Sponsor');
 insert into rate_card(event_id,rate_code,charge_category,description,unit,unit_price,status) values('${live}','LOCAL_LIFT','lift_pass','Local test','day',65,'approved') on conflict do nothing;
 insert into lift_passes(id,attendee_id,required,start_date,end_date,carre_neige_required,chargeable,rate_code,protocol_confirmed) values('${lift}','${person}',true,'2027-01-30','2027-02-02',true,true,'LOCAL_LIFT',true);
 insert into invoices(event_id,attendee_id,invoice_type,invoice_reference,status) values('${live}','${person}','individual','LOCAL-DRAFT-${person}','draft');
 insert into invoices(event_id,attendee_id,invoice_type,invoice_reference,status,gross_total) values('${live}','${person}','individual','LOCAL-LOCKED-${person}','approved',123);`);
 const proposal={required:true,start_date:'2027-01-30',end_date:'2027-02-03',carre_neige_required:true,chargeable:true,rate_code:'LOCAL_LIFT',protocol_confirmed:true,notes:'Local authenticated test'};
 const args={p_lift_pass_id:lift,p_proposed:proposal,p_justification:''};
 let r=await rpc('request_lift_change',args,accounts.protocol.token);assert.ok(!r.ok);
 args.p_justification='Testing extended stay';r=await rpc('request_lift_change',args,accounts.protocol.token);assert.ok(r.ok,JSON.stringify(r.data));let request=r.data;
 assert.equal(sql(`select total_charge from lift_passes where id='${lift}'`),'260.00');
 r=await rpc('review_lift_change',{p_request_id:request,p_approve:true,p_review_note:'Unauthorised'},accounts.protocol.token);assert.ok(!r.ok);
 r=await rpc('review_lift_change',{p_request_id:request,p_approve:false,p_review_note:'Reject test'},admin.token);assert.ok(r.ok,JSON.stringify(r.data));
 r=await rpc('request_lift_change',args,accounts.protocol.token);assert.ok(r.ok,JSON.stringify(r.data));request=r.data;
 r=await rpc('review_lift_change',{p_request_id:request,p_approve:true,p_review_note:'Approved test'},admin.token);assert.ok(r.ok,JSON.stringify(r.data));
 assert.equal(sql(`select total_charge from lift_passes where id='${lift}'`),'325.00');
 assert.equal(sql(`select gross_total from invoices where attendee_id='${person}' and status='draft'`),'325.00');
 assert.equal(Number(sql(`select gross_total from invoices where attendee_id='${person}' and status='approved'`)),123);
 r=await rpc('review_lift_change',{p_request_id:request,p_approve:true,p_review_note:'Duplicate'},admin.token);assert.ok(!r.ok);
 const legacy=await rpc('save_protocol_lift_pass',{p_attendee_id:person,p_lift_pass_id:lift,p_required:true,p_start_date:'2027-01-30',p_end_date:'2027-02-04',p_carre_neige_required:true,p_chargeable:true,p_rate_code:'LOCAL_LIFT',p_protocol_confirmed:true,p_notes:'Bypass'},admin.token);assert.ok(!legacy.ok);
});
await check('existing Finance views work with actual grants and hide replay from non-Admin',async()=>{
 for(const view of ['v_finance_charge_estimates','v_invoice_readiness','v_finance_attendee_queue']){
  const r=await api('/rest/v1/'+view+'?limit=1',undefined,admin.token,'GET');assert.ok(r.ok,view+': '+JSON.stringify(r.data));
  const denied=await api('/rest/v1/'+view+'?event_id=eq.'+event,undefined,accounts.finance.token,'GET');assert.ok(denied.ok,JSON.stringify(denied.data));assert.equal(denied.data.length,0);
 }
});
await check('real Finance creates separate and combined split bills with exact totals',async()=>{
 const person=randomUUID(),other=randomUUID(),org=randomUUID();
 sql(`insert into organisations(id,organisation_name,billing_email) values('${org}','LOCAL Billing company ${org}','billing@example.invalid');
 insert into event_sponsors(event_id,organisation_id,active) values('${live}','${org}',true);
 insert into attendees(id,event_id,first_name,surname,email,category) values('${person}','${live}','Local','Split billing','split@example.invalid','Sponsor'),('${other}','${live}','Local','Company billing','company-person@example.invalid','Sponsor');
 insert into rate_card(event_id,rate_code,description,charge_category,unit,unit_price,vat_rate,status) values('${live}','LOCAL_SPLIT_LESSON','Local split lesson','lesson','session',100,20,'approved'),('${live}','2027_ADMIN_ONLY','Local admin','admin','package',0,0,'approved') on conflict do nothing;
 insert into usage_extras(attendee_id,category,quantity,rate_code,chargeable) values('${person}','lesson',1,'LOCAL_SPLIT_LESSON',true),('${other}','lesson',1,'LOCAL_SPLIT_LESSON',true);`);
 const actor=accounts.finance.token;
 for(const id of [person,other]){
  let r=await rpc('save_finance_transfer_package',{p_attendee_id:id,p_rate_code:null,p_waived:true,p_notes:'Local split test'},actor);assert.ok(r.ok,JSON.stringify(r.data));
  r=await rpc('mark_finance_attendee_checked',{p_attendee_id:id,p_exception_flag:false,p_exception_reason:null},actor);assert.ok(r.ok,JSON.stringify(r.data));
 }
 async function save(id,layout,kind,value){const got=await rpc('get_attendee_billing_plan',{p_attendee_id:id},actor);assert.ok(got.ok,JSON.stringify(got.data));
 const r=await rpc('save_attendee_billing_plan',{p_attendee_id:id,p_organisation_id:org,p_company_layout:layout,p_allocations:Object.fromEntries(got.data.charges.map(c=>[c.charge_key,{kind,value}])),p_signature:got.data.signature,p_revision:got.data.plan?.revision||0},actor);assert.ok(r.ok,JSON.stringify(r.data));}
 await save(person,'separate','amount',30);
 const created=await rpc('create_attendee_billing_drafts',{p_attendee_id:person},actor);assert.ok(created.ok,JSON.stringify(created.data));assert.equal(created.data.length,2);
 assert.equal(Number(sql(`select gross_total from invoices where attendee_id='${person}' and invoice_type='individual' and status='ready_for_review'`)),90);
 assert.equal(Number(sql(`select gross_total from invoices where attendee_id='${person}' and invoice_type='consolidated_company' and status='ready_for_review'`)),30);
 await save(person,'combined','percent',50);await save(other,'combined','percent',100);
 const concurrent=await Promise.all([rpc('create_attendee_billing_drafts',{p_attendee_id:person},actor),rpc('create_attendee_billing_drafts',{p_attendee_id:other},actor)]);assert.ok(concurrent.every(r=>r.ok),JSON.stringify(concurrent));
 assert.equal(sql(`select count(*) from invoices where billing_account_organisation_id='${org}' and attendee_id is null and status='ready_for_review'`),'1');
 assert.equal(Number(sql(`select gross_total from invoices where billing_account_organisation_id='${org}' and attendee_id is null and status='ready_for_review'`)),180);
 const anonRead=await rpc('get_attendee_billing_plan',{p_attendee_id:person},anon);assert.ok(!anonRead.ok);
 const protocolWrite=await rpc('create_attendee_billing_drafts',{p_attendee_id:person},accounts.protocol.token);assert.ok(!protocolWrite.ok);
 const replayPerson=sql(`select id from attendees where event_id='${event}' limit 1`);
 const replayDenied=await rpc('get_attendee_billing_plan',{p_attendee_id:replayPerson},actor);assert.ok(!replayDenied.ok);
 const audit=await api(`/rest/v1/billing_plan_audit?attendee_id=eq.${person}&select=id`,undefined,actor,'GET');assert.ok(audit.ok);assert.equal(audit.data.length,2);
});
await check('real Auth billing replay matches all 129 historic calculated totals',async()=>{
 const expected=JSON.parse(readFileSync('.local/replay/expected.json','utf8'));
 const totals=new Map();for(const row of expected)totals.set(row.attendee_id,(totals.get(row.attendee_id)||0)+row.gross);
 let total=0;
 for(const [id,amount] of totals){
  let r=await rpc('save_finance_transfer_package',{p_attendee_id:id,p_rate_code:null,p_waived:true,p_notes:'Historic replay: no transfer or admin package was charged'},admin.token);assert.ok(r.ok,JSON.stringify(r.data));
  r=await rpc('mark_finance_attendee_checked',{p_attendee_id:id,p_exception_flag:false,p_exception_reason:null},admin.token);assert.ok(r.ok,JSON.stringify(r.data));
  r=await rpc('create_finance_individual_draft',{p_attendee_id:id},admin.token);assert.ok(r.ok,JSON.stringify(r.data));
  const invoice=await api('/rest/v1/invoices?id=eq.'+r.data+'&select=gross_total',undefined,admin.token,'GET');assert.ok(invoice.ok,JSON.stringify(invoice.data));
  const value=Number(invoice.data[0].gross_total);assert.ok(Math.abs(value-amount)<0.005,'Historic billing mismatch for '+id);total+=value;
 }
 assert.equal(totals.size,129);assert.equal(Math.round(total*100),19694500);
});
await check('Edge PDF access and invoice delivery honour test isolation',async()=>{
 const invoice=sql(`select id from invoices where event_id='${event}' and status='ready_for_review' limit 1`),run=randomUUID();assert.ok(invoice);
 sql(`select set_config('request.jwt.claim.sub','${admin.id}',false);
 insert into transfer_runs(id,event_id,direction,transfer_name,departure_at,pickup_location,destination) values('${run}','${event}','arrival','TEST Local transfer','2026-02-01T10:00:00+01:00','Test airport','Test hotel');`);
 let r=await api('/functions/v1/invoice-delivery',{action:'document',invoice_id:invoice},accounts.finance.token);assert.equal(r.status,403,JSON.stringify(r.data));assert.match(r.data.error,/Event access denied/);
 r=await api('/functions/v1/invoice-delivery',{action:'send',invoice_id:invoice,recipient_email:'nobody@example.invalid',subject:'Local test'},admin.token);assert.equal(r.status,403,JSON.stringify(r.data));assert.match(r.data.error,/delivery is disabled/);
 r=await api('/functions/v1/transfer-manifest',{action:'document',transfer_run_id:run},accounts.protocol.token);assert.equal(r.status,403,JSON.stringify(r.data));assert.match(r.data.error,/Event access denied/);
 r=await api('/functions/v1/transfer-manifest',{action:'document',transfer_run_id:run},admin.token);assert.equal(r.status,200,JSON.stringify(r.data));
});
await check('Edge handlers reject anonymous and invalid tokens',async()=>{
 for(const name of ['invoice-delivery','transfer-manifest','send-push-announcement'])for(const token of [anon,'invalid-token']){
  const r=await api('/functions/v1/'+name,{},token);assert.equal(r.status,401,name+': '+JSON.stringify(r.data));
 }
});
await check('real Auth bulk workflow: twenty training invoices and duplicate-safe captured dispatch',async()=>{
 const training='e1000000-0000-4000-8000-000000000001';
 if(sql(`select count(*) from events where id='${training}'`)==='0')sql(`select set_config('request.jwt.claim.sub','${admin.id}',false);
 insert into events(id,name,event_year,start_date,end_date,invoice_prefix,is_test,delivery_disabled,active,invoice_issuer_name,invoice_issuer_address,invoice_payment_instructions,billing_configuration_confirmed) values('${training}','ISSSC 2028 BULK TRAINING',2028,'2028-01-30','2028-02-06','TEST-BULK',true,true,false,'Training issuer','Training address','Training only: use the payment link. No money is due.',true);
 insert into rate_card(event_id,rate_code,description,charge_category,unit,unit_price,vat_rate,status) values('${training}','BULK_LESSON','Training lesson','lesson','session',100,20,'approved'),('${training}','2028_ADMIN_ONLY','Training admin','admin','package',0,0,'approved');
 insert into attendees(id,event_id,first_name,surname,email,category) select ('e2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${training}','Training '||n,'Person '||n,'training'||n||'@example.invalid','Sponsor' from generate_series(1,20)n;
 insert into usage_extras(attendee_id,category,quantity,rate_code,chargeable) select id,'lesson',1,'BULK_LESSON',true from attendees where event_id='${training}';`);
 const call=async(name,args)=>{const r=await rpc(name,args,admin.token);assert.ok(r.ok,JSON.stringify(r.data));return r.data;};
 for(const sheet of ['registrations','hotels','lift_passes','services','transport','transfer_review','charges','billing','invoices'])await call('get_bulk_workspace',{p_event_id:training,p_sheet:sheet});
 const rows=await call('get_bulk_workspace',{p_event_id:training,p_sheet:'registrations'});assert.equal(rows.length,20);
 let invoices=await call('get_bulk_workspace',{p_event_id:training,p_sheet:'invoices'});
 if(!invoices.length){
  for(const row of rows)await call('save_finance_transfer_package',{p_attendee_id:row.id,p_rate_code:null,p_waived:true,p_notes:'Synthetic training waiver'});
  for(const action of ['check','generate']){const r=await call('bulk_billing_action',{p_event_id:training,p_action:action,p_ids:rows.map(r=>r.id)});assert.ok(r.every(x=>x.ok),JSON.stringify(r));}
  invoices=await call('get_bulk_workspace',{p_event_id:training,p_sheet:'invoices'});
  for(const row of invoices)await call('save_bulk_cell',{p_event_id:training,p_sheet:'invoices',p_id:row.id,p_version:row.version,p_patch:{payment_link:`https://pay.example.invalid/training/${row.id}`},p_reason:null});
  const r=await call('bulk_billing_action',{p_event_id:training,p_action:'confirm',p_ids:invoices.map(r=>r.id)});assert.ok(r.every(x=>x.ok),JSON.stringify(r));
 }
 assert.equal(invoices.length,20);
 const jobs=await call('queue_invoice_dispatch',{p_event_id:training,p_ids:invoices.map(r=>r.id),p_capture:true});assert.ok(jobs.every(x=>x.ok),JSON.stringify(jobs));
 for(const r of jobs){const sent=await api('/functions/v1/invoice-delivery',{action:'dispatch',job_id:r.job.id},admin.token);assert.ok(sent.ok&&sent.data.ok,JSON.stringify(sent));}
 const repeat=await api('/functions/v1/invoice-delivery',{action:'dispatch',job_id:jobs[0].job.id},admin.token);assert.ok(repeat.ok&&repeat.data.ok);assert.equal(repeat.data.job.status,'captured');
 const captured=await api('/rest/v1/invoice_dispatch_jobs?event_id=eq.'+training+'&select=status,captured_payload,pdf_sha256',undefined,admin.token,'GET');assert.ok(captured.ok);assert.equal(captured.data.length,20);assert.ok(captured.data.every(j=>j.status==='captured'&&j.captured_payload.attachment_bytes>1000&&j.pdf_sha256.length===64));assert.equal(new Set(captured.data.map(j=>j.captured_payload.payment_link)).size,20);
 assert.equal(sql(`select count(*) from invoice_deliveries where event_id='${training}'`),'0','Captures must not send email');
 const denied=await rpc('get_bulk_workspace',{p_event_id:training,p_sheet:'invoices'},accounts.finance.token);assert.ok(!denied.ok);
 const pdf=await fetch(url+'/functions/v1/invoice-delivery',{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+admin.token,'Content-Type':'application/json'},body:JSON.stringify({action:'document',invoice_id:invoices[0].id})});assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');
});
await check('authenticated registration corrections and Finance airport charge update the source records',async()=>{
 const person=randomUUID(),booking=randomUUID(),intake=randomUUID(),travel=randomUUID();
 sql(`insert into attendees(id,event_id,first_name,surname,email,category) values('${person}','${live}','Local','Workspace correction','workspace@example.invalid','Sponsor');
 insert into booking_requests(id,event_id,attendee_id,status,first_name,surname,email,lesson_type,source_payload) values('${booking}','${live}','${person}','accepted','Local','Workspace correction','workspace@example.invalid','Group','{"lesson_type":"Group","custom_question":"Original"}');
 insert into intake_submissions(id,event_id,mapped_attendee_id,raw_payload) values('${intake}','${live}','${person}','{"lesson_type":"Group","custom_question":"Original"}');
 insert into travel_records(id,attendee_id,direction,transfer_requested,transfer_chargeable,protocol_confirmed) values('${travel}','${person}','arrival',true,false,true);`);
 const get=async(sheet,token=admin.token)=>{const r=await rpc('get_bulk_workspace',{p_event_id:live,p_sheet:sheet},token);assert.ok(r.ok,JSON.stringify(r.data));return r.data;};
 let row=(await get('registrations')).find(r=>r.id===person);assert.equal(row.requested.custom_question,'Original');
 let r=await rpc('save_bulk_cell',{p_event_id:live,p_sheet:'registrations',p_id:person,p_version:row.version,p_patch:{submitted_custom_question:'Corrected',submitted_lesson_type:'Private'},p_reason:'Local correction'},admin.token);assert.ok(r.ok,JSON.stringify(r.data));
 row=(await get('registrations')).find(r=>r.id===person);
 r=await rpc('save_bulk_cell',{p_event_id:live,p_sheet:'registrations',p_id:person,p_version:row.version,p_patch:{lesson_type:'Individual'},p_reason:'Local booking correction'},admin.token);assert.ok(r.ok,JSON.stringify(r.data));
 row=(await get('registrations')).find(r=>r.id===person);assert.equal(row.requested.lesson_type,'Individual');assert.equal(row.requested.custom_question,'Corrected');
 assert.equal(sql(`select lesson_type||':'||(source_payload->>'custom_question') from booking_requests where id='${booking}'`),'Individual:Corrected');
 assert.equal(sql(`select (raw_payload->>'lesson_type')||':'||(raw_payload->>'custom_question') from intake_submissions where id='${intake}'`),'Individual:Corrected');
 const exported=await rpc('export_bulk_workspace',{p_event_id:live,p_sheet:'registrations',p_format:'csv',p_ids:[person],p_columns:['submitted_lesson_type','submitted_custom_question'],p_filters:{}},admin.token);assert.ok(exported.ok,JSON.stringify(exported.data));assert.equal(exported.data.rows[0].submitted_custom_question,'Corrected');
 let review=(await get('transfer_review',accounts.finance.token)).find(r=>r.id===travel);
 r=await rpc('save_bulk_cell',{p_event_id:live,p_sheet:'transfer_review',p_id:travel,p_version:review.version,p_patch:{transfer_chargeable:true,billing_reviewed:true,billing_review_notes:'Confirmed airport journey'},p_reason:'Agreed airport charge'},accounts.finance.token);assert.ok(r.ok,JSON.stringify(r.data));
 review=(await get('transfer_review',accounts.finance.token)).find(r=>r.id===travel);assert.equal(review.transfer_chargeable,true);assert.equal(review.billing_reviewed,true);
});
mkdirSync('.local',{recursive:true});writeFileSync('.local/auth-test-results.json',JSON.stringify({tested_at:new Date().toISOString(),environment:'local Supabase',results},null,2));
// Only local publishable configuration reaches the static app. Never expose service role keys.
execFileSync(process.execPath,['scripts/build.mjs']);
const app=readFileSync('dist/app.js','utf8').replace(/const SUPABASE_URL = '[^']+';/,`const SUPABASE_URL = '${url}';`).replace(/const SUPABASE_KEY = '[^']+';/,`const SUPABASE_KEY = '${anon}';`);
assert.ok(!app.includes('apugxrwhiyvwcrpzvgxj.supabase.co'));writeFileSync('dist/app.js',app);
console.log(`${results.length} real-auth checks passed. Local app built for http://127.0.0.1:53535.`);
