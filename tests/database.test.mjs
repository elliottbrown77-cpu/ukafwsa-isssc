import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDB} from './load-db.mjs';
const ids={admin:'10000000-0000-0000-0000-000000000001',protocol:'10000000-0000-0000-0000-000000000002',viewer:'10000000-0000-0000-0000-000000000003',attendee:'10000000-0000-0000-0000-000000000004',event:'20000000-0000-0000-0000-000000000001',test:'20000000-0000-0000-0000-000000000002',person:'30000000-0000-0000-0000-000000000001',lift:'40000000-0000-0000-0000-000000000001'};
let db;
async function actor(name){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${ids[name]||''}',false);set role authenticated;`)}
async function rpc(name,args){return (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args)).rows[0].result;}
async function root(sql){await db.exec('reset role;');return db.exec(sql);}
const proposed={required:true,start_date:'2027-01-30',end_date:'2027-02-03',carre_neige_required:true,chargeable:true,rate_code:'2027_LIFT_CARRE',protocol_confirmed:true,notes:'Extended pass'};
test('v35 database workflow',async t=>{
 db=await loadDB();
 await root(`insert into auth.users(id) values ${['admin','protocol','viewer','attendee'].map(k=>`('${ids[k]}')`).join(',')};
 insert into public.profiles(id,app_role,active) values ('${ids.admin}','admin',true),('${ids.protocol}','protocol',true),('${ids.viewer}','read_only',true),('${ids.attendee}','attendee',true);
 insert into public.events(id,name,event_year,start_date,end_date,invoice_prefix) values('${ids.event}','Live',2027,'2027-01-30','2027-02-06','ISSSC2027');
 select set_config('request.jwt.claim.sub','${ids.admin}',false);
 insert into public.events(id,name,event_year,start_date,end_date,invoice_prefix,is_test,delivery_disabled) values('${ids.test}','Replay',2026,'2026-01-30','2026-02-07','TEST-2026',true,true);
 insert into public.attendees(id,event_id,first_name,surname,category) values('${ids.person}','${ids.event}','Test','Person','Sponsor');
 insert into public.rate_card(event_id,rate_code,charge_category,description,unit,unit_price,status) values('${ids.event}','2027_LIFT_CARRE','lift_pass','Pass','day',65,'approved');
 insert into public.lift_passes(id,attendee_id,required,start_date,end_date,carre_neige_required,chargeable,rate_code,protocol_confirmed) values('${ids.lift}','${ids.person}',true,'2027-01-30','2027-02-02',true,true,'2027_LIFT_CARRE',true);`);
 await t.test('all reports execute with real schema',async()=>{await actor('admin');for(const key of ['master','hotels','lift_passes','equipment','lessons','transport'])assert.ok(Array.isArray(await rpc('get_staff_report',[ids.event,key,{}])));});
 await t.test('unauthorised reports and anonymous entry denied',async()=>{await actor('attendee');await assert.rejects(rpc('get_staff_report',[ids.event,'master',{}]),/Staff access/);await actor('viewer');await assert.rejects(rpc('get_staff_report',[ids.event,'master',{}]),/permission/);await db.exec('reset role;set role anon;');await assert.rejects(rpc('get_staff_report',[ids.event,'master',{}]),/permission denied/);});
 await t.test('view grant does not imply export and no private helper access',async()=>{await actor('admin');await rpc('admin_set_report_permission',[ids.event,ids.viewer,'hotels',true,false]);await actor('viewer');assert.equal((await rpc('get_staff_report',[ids.event,'hotels',{}])).length,1);await assert.rejects(rpc('export_staff_report',[ids.event,'hotels','csv',{},['surname']]),/permission/);await assert.rejects(db.query('select * from private.report_rows($1,$2)',[ids.event,'master']),/permission denied/);});
 await t.test('transport available to Protocol, specialist data has no finance',async()=>{await actor('protocol');const rows=await rpc('get_staff_report',[ids.event,'transport',{}]);assert.equal(rows.length,1);assert.equal('email' in rows[0],false);assert.equal('gross_total' in rows[0],false);await assert.rejects(rpc('get_staff_report',[ids.test,'transport',{}]),/Admin only/);});
 await t.test('export audit is server-authored, filtered and immutable',async()=>{await actor('admin');const data=await rpc('export_staff_report',[ids.event,'master','csv',{search:'Person'},['surname']]);assert.deepEqual(data.rows,[{surname:'Person'}]);const audit=(await db.query('select * from report_export_audit where id=$1',[data.audit_id])).rows[0];assert.equal(audit.actor_id,ids.admin);assert.equal(audit.row_count,1);await assert.rejects(db.query('delete from report_export_audit where id=$1',[data.audit_id]),/permission denied/);});
 await t.test('confirmed pass blocks direct Admin and legacy RPC writes',async()=>{await actor('admin');assert.equal((await db.query('update lift_passes set notes=$1 where id=$2 returning id',['bypass',ids.lift])).rows.length,0);await root('');await assert.rejects(db.query('update lift_passes set notes=$1 where id=$2',['bypass',ids.lift]),/Admin approval/);await actor('admin');await assert.rejects(rpc('save_protocol_lift_pass',[ids.person,ids.lift,true,'2027-01-30','2027-02-04',true,true,'2027_LIFT_CARRE',true,'bypass']),/Admin approval/);});
 let request;
 await t.test('justification mandatory, duplicate pending request denied, no immediate mutation',async()=>{await actor('protocol');await assert.rejects(rpc('request_lift_change',[ids.lift,proposed,'  ']),/justification/);request=await rpc('request_lift_change',[ids.lift,proposed,'Attendee extended stay']);await assert.rejects(rpc('request_lift_change',[ids.lift,proposed,'Duplicate']),/unique constraint/);await root('');assert.equal((await db.query('select total_charge from lift_passes where id=$1',[ids.lift])).rows[0].total_charge,'260.00');});
 await t.test('only Admin can approve; approval applies change once and retains audit',async()=>{await actor('protocol');await assert.rejects(rpc('review_lift_change',[request,true,'Approved']),/Not authorised/);await actor('admin');await rpc('review_lift_change',[request,true,'Dates checked']);await assert.rejects(rpc('review_lift_change',[request,true,'Again']),/Pending request/);await root('');const row=(await db.query('select * from lift_passes where id=$1',[ids.lift])).rows[0];assert.equal(row.total_charge,'325.00');const req=(await db.query('select * from lift_change_requests where id=$1',[request])).rows[0];assert.equal(req.status,'approved');assert.equal(req.before_data.total_charge,260);assert.equal(req.after_data.total_charge,325);assert.equal((await db.query('select * from private.lift_approval_context')).rows.length,0);});
 await t.test('rejection requires note and preserves operational values',async()=>{await actor('protocol');const id=await rpc('request_lift_change',[ids.lift,{...proposed,end_date:'2027-02-04'},'Another day']);await actor('admin');await assert.rejects(rpc('review_lift_change',[id,false,'']),/note required/);await rpc('review_lift_change',[id,false,'Not authorised by attendee']);assert.equal((await db.query('select status from lift_change_requests where id=$1',[id])).rows[0].status,'rejected');});
 await t.test('replay isolation applies to existing RPCs and direct reads',async()=>{
  await actor('protocol');await assert.rejects(rpc('get_protocol_attendee_service_overview',[ids.test]),/Admin only/);
  assert.equal((await db.query('select id from events where id=$1',[ids.test])).rows.length,0);
  await actor('admin');await root('');await assert.rejects(db.query('update events set is_test=false where id=$1',[ids.test]),/cannot become live/);
  await assert.rejects(db.query("update events set active=true where id=$1",[ids.test]),/test_event_delivery_disabled/);
 });
 await t.test('master workbook exports all related sheets with authoritative audits',async()=>{
  await actor('admin');const sheets=await rpc('export_master_workbook',[ids.event,{search:'Person'}]);assert.equal(sheets.length,8);assert.equal(sheets[0].rows.length,1);assert.ok(sheets.every(s=>s.audit_id));
  await actor('viewer');await assert.rejects(rpc('export_master_workbook',[ids.event,{}]),/permission/);
 });
 await t.test('deactivated staff lose report and request access immediately',async()=>{
  await root(`update profiles set active=false where id='${ids.protocol}'`);await actor('protocol');await assert.rejects(rpc('get_staff_report',[ids.event,'transport',{}]),/Staff access/);await assert.rejects(rpc('request_lift_change',[ids.lift,proposed,'Need change']),/Not authorised/);
  await root(`update profiles set active=true where id='${ids.protocol}'`);
 });
 await t.test('test delivery is blocked at the database boundary',async()=>{
  await actor('admin');await assert.rejects(db.query("insert into announcements(event_id,title,body,push_notification) values($1,'Replay','Do not send',true)",[ids.test]),/cannot be sent/);
  await root('');await assert.rejects(db.query("insert into invoice_deliveries(event_id,invoice_id,recipient_email,subject,delivery_status) values($1,gen_random_uuid(),'x@example.invalid','Test','pending')",[ids.test]),/delivery is disabled/);
 });
 await t.test('approval rebuilds draft but preserves locked invoice and flags Finance',async()=>{
  await root(`insert into invoices(event_id,attendee_id,invoice_type,invoice_reference,status) values('${ids.event}','${ids.person}','individual','DRAFT','draft');insert into invoices(event_id,attendee_id,invoice_type,invoice_reference,status,gross_total) values('${ids.event}','${ids.person}','individual','LOCKED','approved',123);`);
  await actor('protocol');const id=await rpc('request_lift_change',[ids.lift,{...proposed,end_date:'2027-02-04'},'Extended visit']);await actor('admin');await rpc('review_lift_change',[id,true,'Approved']);
  const inv=(await db.query("select invoice_reference,gross_total from invoices order by invoice_reference")).rows;
  assert.equal(Number(inv.find(i=>i.invoice_reference==='DRAFT').gross_total),390);assert.equal(Number(inv.find(i=>i.invoice_reference==='LOCKED').gross_total),123);
  assert.match((await db.query('select finance_action from lift_change_requests where id=$1',[id])).rows[0].finance_action,/adjustment required/);
 });
 await t.test('test records cannot reference live attendee parents',async()=>{
  await actor('admin');await root('');
  await assert.rejects(db.query("insert into invoices(event_id,attendee_id,invoice_type,invoice_reference,status) values($1,$2,'individual','TEST-CROSS','draft')",[ids.test,ids.person]),/cannot be linked/);
 });
 await t.test('request rejects null boolean fields before storing a proposal',async()=>{
  await actor('protocol');await assert.rejects(rpc('request_lift_change',[ids.lift,{...proposed,chargeable:null},'Invalid input']),/Boolean values required/);
 });
 await t.test('new privileged endpoints deny anonymous execution and tables enable RLS',async()=>{
  await root('');
  const functions=['get_staff_report(uuid,text,jsonb)','export_staff_report(uuid,text,text,jsonb,text[])','export_master_workbook(uuid,jsonb)','request_lift_change(uuid,jsonb,text)','review_lift_change(uuid,boolean,text)','admin_set_report_permission(uuid,uuid,text,boolean,boolean)'];
  for(const f of functions)assert.equal((await db.query("select has_function_privilege('anon',$1,'execute') allowed",['public.'+f])).rows[0].allowed,false);
  const tables=(await db.query("select relrowsecurity from pg_class where oid in ('report_permissions'::regclass,'report_export_audit'::regclass,'lift_change_requests'::regclass)")).rows;
  assert.equal(tables.length,3);assert.ok(tables.every(t=>t.relrowsecurity));
 });
 await db.close();
});
