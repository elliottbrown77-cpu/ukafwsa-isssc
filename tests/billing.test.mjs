import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDB} from './load-db.mjs';
import {companyShare} from '../billing.js';
const admin='a0000000-0000-4000-8000-000000000001',finance='a0000000-0000-4000-8000-000000000002',protocol='a0000000-0000-4000-8000-000000000003',event='b0000000-0000-4000-8000-000000000001',org='c0000000-0000-4000-8000-000000000001',a='d0000000-0000-4000-8000-000000000001',b='d0000000-0000-4000-8000-000000000002';
test('payer plans preserve money and prevent duplicate billing',async t=>{
 const db=await loadDB();const rpc=async(name,args)=>(await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;
 const actor=async id=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);
 try{
 await db.exec(`insert into auth.users(id) values('${admin}'),('${finance}'),('${protocol}');insert into profiles(id,app_role,active) values('${admin}','admin',true),('${finance}','finance',true),('${protocol}','protocol',true);
 insert into events(id,name,event_year,start_date,end_date,invoice_prefix) values('${event}','Billing test',2027,'2027-01-30','2027-02-06','BILL');
 insert into organisations(id,organisation_name,billing_email) values('${org}','Test Company','company@example.invalid');
 insert into event_sponsors(event_id,organisation_id,active) values('${event}','${org}',true);
 insert into attendees(id,event_id,first_name,surname,email,category,data_checked,checked_by,checked_at) values('${a}','${event}','First','Payer','first@example.invalid','Sponsor',true,'${admin}',now()),('${b}','${event}','Second','Payer','second@example.invalid','Sponsor',true,'${admin}',now());
 insert into rate_card(event_id,rate_code,description,charge_category,unit,unit_price,vat_rate,status) values('${event}','LESSON','Lesson','lesson','session',105,20,'approved'),('${event}','EQUIP','Equipment','equipment','item',99.99,20,'approved'),('${event}','2027_ADMIN_ONLY','Admin','admin','package',0,0,'approved');
 insert into usage_extras(attendee_id,category,quantity,rate_code,chargeable) values('${a}','lesson',1,'LESSON',true),('${a}','equipment',1,'EQUIP',true),('${b}','lesson',1,'LESSON',true);`);
 await actor(finance);for(const id of [a,b]){await rpc('save_finance_transfer_package',[id,null,true,'Test waiver']);await rpc('mark_finance_attendee_checked',[id,false,null]);}
 let first,second,ids;
 const save=async(id,data,layout,allocs,revision=0,company=org)=>rpc('save_attendee_billing_plan',[id,company,layout,allocs,data.signature,revision]);
 const shares=(data,fn)=>Object.fromEntries(data.charges.map(c=>[c.charge_key,fn(c)]));
 await t.test('non-Finance and anonymous cannot allocate charges',async()=>{await actor(protocol);await assert.rejects(rpc('get_attendee_billing_plan',[a]),/Not authorised/);await db.exec('reset role;set role anon;');await assert.rejects(rpc('get_attendee_billing_plan',[a]),/permission denied/);await actor(finance);});
 await t.test('all source charges and VAT are included once',async()=>{first=await rpc('get_attendee_billing_plan',[a]);assert.equal(first.charges.length,2);assert.equal(first.charges.reduce((s,c)=>s+Number(c.gross_amount),0),245.99);});
 await t.test('over-allocation, omitted items and stale snapshots are rejected',async()=>{
 await assert.rejects(save(a,first,'separate',{}),/every current charge/);
 await assert.rejects(save(a,first,'separate',shares(first,()=>({kind:'percent',value:101}))),/Company share/);
 await assert.rejects(save(a,first,'separate',shares(first,()=>({kind:'amount',value:999}))),/Company share/);
 await assert.rejects(save(a,{...first,signature:'stale'},'separate',shares(first,()=>({kind:'percent',value:0}))),/Charges changed/);
 });
 await t.test('company account creation and whole-item billing need no sponsorship',async()=>{
 const company=await rpc('create_finance_billing_company',[event,{name:'Non-sponsor company',email:'accounts@example.invalid'}]);
 const id='d0000000-0000-4000-8000-000000000003';
 await db.exec('reset role;');await db.exec(`insert into attendees(id,event_id,first_name,surname,email,category) values('${id}','${event}','Third','Payer','third@example.invalid','Sponsor');insert into usage_extras(attendee_id,category,quantity,rate_code,chargeable) values('${id}','lesson',1,'LESSON',true);`);await actor(finance);
 await rpc('save_finance_transfer_package',[id,null,true,'Test waiver']);await rpc('mark_finance_attendee_checked',[id,false,null]);
 const data=await rpc('get_attendee_billing_plan',[id]);
 await save(id,data,'separate',shares(data,()=>({kind:'percent',value:100})),0,company);
 let created=await rpc('create_attendee_billing_drafts',[id]);assert.equal(created.length,1);assert.equal((await db.query('select invoice_type from invoices where id=$1',[created[0]])).rows[0].invoice_type,'consolidated_company');
 await save(id,data,'separate',shares(data,()=>({kind:'percent',value:0})),1,null);
 created=await rpc('create_attendee_billing_drafts',[id]);assert.equal(created.length,1);assert.equal((await db.query('select invoice_type from invoices where id=$1',[created[0]])).rows[0].invoice_type,'individual');
 await db.exec('reset role;');await db.exec(`update invoices set status='cancelled' where attendee_id='${id}';`);await actor(finance);
 });
 await t.test('fixed amount and percentage split produces separate company and personal bills',async()=>{
 const plan=await save(a,first,'separate',shares(first,c=>c.description==='Lesson'?{kind:'amount',value:40}:{kind:'percent',value:33.33}));assert.equal(plan.revision,1);
 ids=await rpc('create_attendee_billing_drafts',[a]);assert.equal(ids.length,2);
 const invoices=(await db.query('select invoice_type,attendee_id,gross_total from invoices where id=any($1::uuid[]) order by invoice_type',[ids])).rows;
 assert.equal(invoices[0].invoice_type,'consolidated_company');assert.equal(invoices[0].attendee_id,a);assert.equal(Number(invoices[0].gross_total),79.99);assert.equal(Number(invoices[1].gross_total),166);
 const totals=(await db.query('select sum(net_amount) net,sum(vat_amount) vat,sum(gross_amount) gross from invoice_lines where invoice_id=any($1::uuid[])',[ids])).rows[0];assert.equal(Number(totals.net),204.99);assert.equal(Number(totals.vat),41);assert.equal(Number(totals.gross),245.99);
 });
 await t.test('repeat generation reuses drafts, legacy full billing is blocked and plans are audited',async()=>{
 assert.deepEqual(await rpc('create_attendee_billing_drafts',[a]),ids);await assert.rejects(rpc('create_finance_individual_draft',[a]),/saved billing plan/);
 assert.equal((await db.query(`select count(*)::int n from billing_plan_audit where attendee_id='${a}'`)).rows[0].n,1);
 await assert.rejects(db.exec('delete from billing_plan_audit'),/permission denied/);
 await assert.rejects(save(a,first,'separate',shares(first,()=>({kind:'percent',value:0}))),/Billing plan changed/);
 });
 await t.test('combined company invoice contains company shares from both attendees only',async()=>{
 await save(a,first,'combined',shares(first,c=>({kind:'percent',value:c.description==='Lesson'?100:0})),1);
 second=await rpc('get_attendee_billing_plan',[b]);await save(b,second,'combined',shares(second,()=>({kind:'percent',value:50})));
 ids=await rpc('create_attendee_billing_drafts',[a]);const company=(await db.query("select * from invoices where id=any($1::uuid[]) and invoice_type='consolidated_company'",[ids])).rows[0];assert.equal(company.attendee_id,null);assert.equal(Number(company.gross_total),189);
 const bIds=await rpc('create_attendee_billing_drafts',[b]);assert.ok(bIds.includes(company.id));
 const total=(await db.query("select sum(gross_total) gross from invoices where status='ready_for_review'")).rows[0];assert.equal(Number(total.gross),371.99);
 });
 await t.test('source changes stop confirmation and require a refreshed allocation',async()=>{
 await db.exec('reset role;');await db.exec(`update usage_extras set quantity=2 where attendee_id='${b}' and category='lesson';`);await actor(finance);await rpc('mark_finance_attendee_checked',[b,false,null]);
 await assert.rejects(rpc('create_attendee_billing_drafts',[b]),/Charges changed/);
 const company=(await db.query("select id from invoices where attendee_id is null and status='ready_for_review'")).rows[0].id;
 await assert.rejects(rpc('advance_finance_invoice',[company,'approved',null,null,null]),/allocation or charges changed/);
 second=await rpc('get_attendee_billing_plan',[b]);await save(b,second,'combined',shares(second,()=>({kind:'percent',value:50})),1);ids=await rpc('create_attendee_billing_drafts',[b]);
 });
 await t.test('confirmation snapshots company recipient and prevents payer changes',async()=>{
 const company=(await db.query("select id from invoices where id=any($1::uuid[]) and invoice_type='consolidated_company'",[ids])).rows[0].id;
 await rpc('advance_finance_invoice',[company,'approved',null,null,null]);
 assert.equal((await db.query('select recipient_name_snapshot from invoices where id=$1',[company])).rows[0].recipient_name_snapshot,'Test Company');
 await assert.rejects(save(b,second,'separate',shares(second,()=>({kind:'percent',value:0})),2),/confirmed invoice/);
 });
 }finally{await db.close();}
});
test('company preview handles whole items, percentages and amounts',()=>{assert.equal(companyShare({gross_amount:119.99},{kind:'percent',value:33.33}),39.99);assert.equal(companyShare({gross_amount:126},{kind:'amount',value:40}),40);assert.equal(companyShare({gross_amount:126},{kind:'percent',value:100}),126);});
