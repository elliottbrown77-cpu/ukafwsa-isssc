import {readFileSync,writeFileSync} from 'node:fs';
import {loadDB} from '../tests/load-db.mjs';
const db=await loadDB();
const admin='10000000-0000-4000-8000-000000000035';
try{
 await db.exec(`insert into auth.users(id) values('${admin}');insert into profiles(id,app_role,active) values('${admin}','admin',true);select set_config('request.jwt.claim.sub','${admin}',false);`);
 await db.exec(readFileSync('.local/replay/seed.sql','utf8'));
 const manifest=JSON.parse(readFileSync('.local/replay/manifest.json','utf8'));
 const expected=JSON.parse(readFileSync('.local/replay/expected.json','utf8'));
 const actual=(await db.query(`select a.id,coalesce((select sum(accommodation_charge) from stay_charge_periods where attendee_id=a.id),0) accommodation,coalesce((select sum(total_charge) from lift_passes where attendee_id=a.id),0) lift_pass,coalesce((select sum(total_charge) from usage_extras where attendee_id=a.id),0) extras from attendees a where event_id=$1`,[manifest.event_id])).rows;
 const findings=[];let total=0;
 for(const person of actual){
 const rows=expected.filter(r=>r.attendee_id===person.id);const exp=rows.reduce((v,r)=>v+r.gross,0);
 await db.query("select save_finance_transfer_package($1,null,true,'Historic 2026 replay: no transfer or admin package was charged')",[person.id]);
 await db.query('select mark_finance_attendee_checked($1,false,null)',[person.id]);
 const invoiceId=(await db.query('select create_finance_individual_draft($1) id',[person.id])).rows[0].id;
 const inv=(await db.query('select gross_total from invoices where id=$1',[invoiceId])).rows[0];
 const value=Number(inv.gross_total);total+=value;
 const lines=(await db.query('select source_type,rate_code,net_amount,vat_amount,gross_amount from invoice_lines where invoice_id=$1',[invoiceId])).rows;
 const groups={accommodation:0,lift_pass:0,champagne_net:0,champagne_vat:0,dinner:0,lesson:0};
 for(const line of lines){const code=line.rate_code||'';const category=line.source_type==='stay'?'accommodation':line.source_type==='lift_pass'?'lift_pass':code==='2026_CHAMPAGNE'?'champagne_net':code==='2026_CHAMPAGNE_VAT'?'champagne_vat':code.includes('DINNER')?'dinner':code.includes('LESSON')?'lesson':null;if(category)groups[category]+=Number(line.gross_amount);}
 for(const [category,actual] of Object.entries(groups)){const expected=rows.reduce((sum,row)=>sum+row[category],0);if(Math.abs(actual-expected)>.005)findings.push({attendee_id:person.id,category,expected,actual});}

 if(Math.abs(value-exp)>.005)findings.push({attendee_id:person.id,expected:exp,actual:value,delta:Math.round((value-exp)*100)/100});
 }
 const result={...manifest,engine_invoice_count:actual.length,engine_gross_total:Math.round(total*100)/100,expected_gross_total:manifest.billing_total,mismatches:findings};
 writeFileSync('.local/replay/reconciliation.json',JSON.stringify(result,null,2));console.log(JSON.stringify({people:actual.length,total:result.engine_gross_total,expected:manifest.billing_total,mismatch_count:findings.length,findings},null,2));
 if(findings.length)process.exitCode=1;
}catch(e){console.error(e.message,e.where||'',e.detail||'');process.exitCode=1;}finally{await db.close();}
