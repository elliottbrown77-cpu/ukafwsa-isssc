import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFileSync,existsSync,mkdirSync} from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><main id="main"></main><script type="module">
import {createReports,createLiftApprovals} from '/reports.js';
window.calls=[];window.failExport=new URLSearchParams(location.search).has("fail");
const rows=[{id:'1',attendee_id:'1',first_name:'Élodie',surname:'Example',category:'Sponsor',status:'confirmed',date:'2026-02-01',notes:'=1+1'},{id:'2',attendee_id:'2',first_name:'Test',surname:'Other',category:'Protocol',status:'pending',date:'2026-02-02',notes:'Safe'}];
const client={from:()=>({select:()=>({eq:()=>({eq:async()=>({data:[]}),order:async()=>({data:[]})})})}),rpc:async(name,args)=>{window.calls.push({name,args});if(name==='get_staff_report')return {data:rows.filter(r=>!args.p_filters.search||r.surname.includes(args.p_filters.search))};if(window.failExport)return {error:{message:'Audit write failed'}};if(name==='export_staff_report')return {data:{audit_id:'audit-123',rows:rows.filter(r=>!args.p_filters.search||r.surname.includes(args.p_filters.search))}};return {data:[]};}};
const reports=createReports({client,eventId:'test-event',getProfile:()=>({id:'admin',app_role:'admin'}),escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),toast:()=>{},openAttendee:id=>window.opened=id});
document.querySelector('#main').innerHTML=reports.markup();await reports.load();
</script></body></html>`;
const server=createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);if(name==='/'){res.setHeader('content-type','text/html');res.end(html);return;}const file=path.resolve('.'+name);if(!file.startsWith(process.cwd()+path.sep)||!existsSync(file)){res.statusCode=404;res.end();return;}res.setHeader('content-type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/plain');res.end(readFileSync(file));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
if(process.argv.includes('--serve')){console.log(`Browser fixture: http://127.0.0.1:${server.address().port}`);await new Promise(()=>{});}
let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByText('2 rows',{exact:true}).waitFor();
 await page.locator('input[name=search]').fill('Example');await page.getByRole('button',{name:'Apply filters'}).click();await page.getByText('1 rows',{exact:true}).waitFor();
 const csvWait=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();const csv=await csvWait;assert.ok(csv.suggestedFilename().endsWith('.csv'));await page.getByText('Export prepared. Audit reference: audit-123').waitFor();
 const excelWait=page.waitForEvent('download');await page.getByRole('button',{name:'Export Excel',exact:true}).click();const excel=await excelWait;assert.ok(excel.suggestedFilename().endsWith('.xlsx'));
 await page.evaluate(()=>window.failExport=true);await page.getByRole('button',{name:'Export CSV',exact:true}).click();await page.getByText('Export failed: Audit write failed').waitFor();
 await page.getByRole('button',{name:'Example',exact:true}).click();assert.equal(await page.evaluate(()=>window.opened),'1');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('.report-grid').isVisible());
 mkdirSync('.local',{recursive:true});await page.screenshot({path:'.local/reports-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Browser checks passed: filtering, CSV, XLSX, audit failure, attendee link and mobile rendering.');
}catch(e){console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
