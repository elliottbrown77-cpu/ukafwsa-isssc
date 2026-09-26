export const REPORTS={master:'Master attendees',hotels:'Hotel allocations',lift_passes:'Lift passes',equipment:'Equipment hire',lessons:'Lessons',transport:'Transport'};
export const label=k=>k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
export function safeCell(value){const s=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);return /^[\s\uFEFF]*[=+@-]/.test(s)||/^[\t\r\n]/.test(s)?"'"+s:s;}
export function toCSV(rows,columns){return '\uFEFF'+[columns.map(label),...rows.map(r=>columns.map(c=>safeCell(r[c])))].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');}
export function sortRows(rows,key,asc=true){return [...rows].sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''),undefined,{numeric:true})*(asc?1:-1));}
export async function workbookBuffer(ExcelJS,sheets){const book=new ExcelJS.Workbook();book.creator='ISSSC';for(const {name,rows,columns} of sheets){const sheet=book.addWorksheet(name.slice(0,31));sheet.columns=columns.map(key=>({header:label(key),key,width:24}));rows.forEach(row=>sheet.addRow(Object.fromEntries(columns.map(c=>[c,typeof row[c]==='number'?row[c]:safeCell(row[c])]))));sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(rows.length+1,1),column:columns.length}};sheet.getRow(1).font={bold:true};}return book.xlsx.writeBuffer();}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function createReports({client,eventId,getProfile,escapeHtml:h,toast,openAttendee}){
 const state={report:'',rows:[],columns:[],selected:[],permissions:[],filters:{},sort:'surname',asc:true,loading:false,generation:0};
 const admin=()=>getProfile()?.app_role==='admin';
 const allowed=k=>admin()||(['protocol','operations'].includes(getProfile()?.app_role)&&k==='transport')||state.permissions.some(p=>p.report_key===k);
 const exportable=k=>admin()||(['protocol','operations'].includes(getProfile()?.app_role)&&k==='transport')||state.permissions.some(p=>p.report_key===k&&p.can_export);
 function markup(){return '<section class="surface"><div class="surface-body" id="reportsPanel" aria-live="polite">Loading report permissions…</div></section>';}
 async function load(){
 const perms=await client.from('report_permissions').select('report_key,can_export').eq('event_id',eventId).eq('user_id',getProfile().id);
 if(perms.error){showError(perms.error);return;}state.permissions=perms.data||[];
 if(!REPORTS[state.report]||!allowed(state.report))state.report=Object.keys(REPORTS).find(allowed)||'';
 if(!state.report){document.querySelector('#reportsPanel').textContent='No reports assigned. Ask Admin to grant report access.';return;}
 await refresh();
 }
 function showError(e){const el=document.querySelector('#reportsPanel');if(el)el.innerHTML=`<div class="notice error">${h(e.message||String(e))}</div>`;}
 async function refresh(){const gen=++state.generation;state.loading=true;render();
 const {data,error}=await client.rpc('get_staff_report',{p_event_id:eventId,p_report_key:state.report,p_filters:state.filters});
 if(gen!==state.generation)return;state.loading=false;
 if(error){showError(error);return;}state.rows=data||[];
 const columns=[...new Set(state.rows.flatMap(Object.keys))].filter(k=>!['id','attendee_id'].includes(k));
 if(columns.length){state.columns=columns;state.selected=state.selected.filter(c=>columns.includes(c));if(!state.selected.length)state.selected=columns;}
 render();}
 function render(){const el=document.querySelector('#reportsPanel');if(!el)return;
 el.innerHTML=`<div class="report-toolbar"><label>Report<select id="reportChoice">${Object.entries(REPORTS).filter(([k])=>allowed(k)).map(([k,v])=>`<option value="${k}" ${state.report===k?'selected':''}>${v}</option>`).join('')}</select></label><form id="reportFilters"><label>Search<input name="search" value="${h(state.filters.search||'')}" placeholder="Name, company or detail"></label><label>Category<input name="category" value="${h(state.filters.category||'')}" placeholder="Exact category"></label><label>Status<input name="status" value="${h(state.filters.status||'')}" placeholder="e.g. pending"></label><label>From<input type="date" name="from" value="${h(state.filters.from||'')}"></label><label>To<input type="date" name="to" value="${h(state.filters.to||'')}"></label><button class="btn btn-primary">Apply filters</button></form></div>
 <div class="report-actions"><strong>${state.loading?'Loading…':`${state.rows.length} rows`}</strong><button class="btn btn-ghost" id="exportCSV" ${state.loading||!exportable(state.report)||!state.selected.length?'disabled':''}>Export CSV</button><button class="btn btn-ghost" id="exportXLSX" ${state.loading||!exportable(state.report)||!state.selected.length?'disabled':''}>Export Excel</button>${exportable('master')&&state.report==='master'?'<button class="btn btn-ghost" id="exportWorkbook">Complete workbook</button>':''}</div>
 <details><summary>Choose columns</summary><div class="report-columns">${state.columns.map(c=>`<label><input type="checkbox" data-report-column="${h(c)}" ${state.selected.includes(c)?'checked':''}> ${h(label(c))}</label>`).join('')}</div></details>
 <p class="muted small">Exports include all matching rows and selected columns, with the current sort order. Every export records your account, event, filters, fetched columns and row count. Sorting and transport grouping fields are fetched even when hidden. Times include their recorded offset. Select a name to open the attendee.</p>
 <div class="report-grid" tabindex="0" aria-label="${REPORTS[state.report]}"><table class="data-table"><thead><tr>${state.selected.map(c=>`<th aria-sort="${state.sort===c?(state.asc?'ascending':'descending'):'none'}"><button data-report-sort="${h(c)}">${h(label(c))}${state.sort===c?(state.asc?' ↑':' ↓'):''}</button></th>`).join('')}</tr></thead><tbody>${sortRows(state.rows,state.sort,state.asc).map(r=>`<tr>${state.selected.map(c=>`<td>${c==='surname'||c==='first_name'?`<button class="report-name" data-report-attendee="${h(r.attendee_id)}">${h(typeof r[c]==='object'&&r[c]!==null?JSON.stringify(r[c]):r[c]??'')}</button>`:h(typeof r[c]==='object'&&r[c]!==null?JSON.stringify(r[c]):r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>${!state.rows.length&&!state.loading?'<p>No matching records.</p>':''}</div><div id="exportResult" role="status"></div>`;
 el.querySelector('#reportChoice').onchange=e=>{state.report=e.target.value;state.columns=[];state.selected=[];state.filters={};refresh();};
 el.querySelector('#reportFilters').onsubmit=e=>{e.preventDefault();state.filters=Object.fromEntries(new FormData(e.target));refresh();};
 el.querySelectorAll('[data-report-sort]').forEach(b=>b.onclick=()=>{state.asc=state.sort===b.dataset.reportSort?!state.asc:true;state.sort=b.dataset.reportSort;render();});
 el.querySelectorAll('[data-report-column]').forEach(b=>b.onchange=()=>{state.selected=state.columns.filter(c=>c===b.dataset.reportColumn?b.checked:state.selected.includes(c));render();});
 el.querySelectorAll('[data-report-attendee]').forEach(b=>b.onclick=()=>openAttendee(b.dataset.reportAttendee));
 el.querySelector('#exportCSV').onclick=()=>exportReport('csv');el.querySelector('#exportXLSX').onclick=()=>exportReport('xlsx');
 const all=el.querySelector('#exportWorkbook');if(all)all.onclick=()=>exportReport('xlsx',true);
 }
 async function exportReport(format,complete=false){const el=document.querySelector('#exportResult');el.textContent='Preparing audited export…';document.querySelectorAll('#exportCSV,#exportXLSX,#exportWorkbook').forEach(b=>b.disabled=true);
 try{
 const sheets=[];const audits=[];
 if(complete){const {data,error}=await client.rpc('export_master_workbook',{p_event_id:eventId,p_filters:{...state.filters,sort:state.sort,ascending:state.asc}});if(error)throw error;for(const sheet of data){sheets.push({...sheet,name:REPORTS[sheet.name]||label(sheet.name),rows:sortRows(sheet.rows,state.sort,state.asc)});audits.push(sheet.audit_id);}}
 for(const key of complete?[]:[state.report]){
 let columns=state.selected;

 const {data,error}=await client.rpc('export_staff_report',{p_event_id:eventId,p_report_key:key,p_format:format,p_filters:{...state.filters,sort:state.sort,ascending:state.asc},p_columns:[...new Set([...columns,state.sort,...(format==='xlsx'&&key==='transport'?['direction','run','status']:[])])]});if(error)throw error;
 sheets.push({name:REPORTS[key],rows:sortRows(data.rows,state.sort,state.asc),columns});audits.push(data.audit_id);
 }
 if(format==='xlsx'&&!complete&&state.report==='transport'){const sheet=sheets.pop();for(const [name,predicate] of [['Arrivals',r=>r.direction==='arrival'],['Departures',r=>r.direction==='departure'],['Transfer runs',r=>!!r.run],['Unassigned travellers',r=>r.status==='unassigned']])sheets.push({name,columns:sheet.columns,rows:sheet.rows.filter(predicate)});}
 const base=`ISSSC-${eventId}-${complete?'complete':state.report}-${new Date().toISOString().slice(0,10)}`;
 if(format==='csv')download(toCSV(sheets[0].rows,sheets[0].columns),base+'.csv','text/csv;charset=utf-8');
 else{if(!globalThis.ExcelJS)await import('/vendor/exceljs-4.4.0.min.js');download(await workbookBuffer(globalThis.ExcelJS,sheets),base+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}
 el.textContent=`Export prepared. Audit reference${audits.length>1?'s':''}: ${audits.join(', ')}`;
 }catch(e){el.textContent=`Export failed: ${e.message}`;}finally{document.querySelectorAll('#exportCSV,#exportXLSX,#exportWorkbook').forEach(b=>b.disabled=false);}
 }
 return {markup,load};
}

export function createLiftApprovals({client,eventId,escapeHtml:h,toast}){
 function markup(){return '<section class="surface"><div class="surface-body" id="liftApprovals">Loading lift-pass changes…</div></section>';}
 async function load(){const {data,error}=await client.from('lift_change_requests').select('*,attendees(first_name,surname)').eq('event_id',eventId).order('requested_at',{ascending:false});const el=document.querySelector('#liftApprovals');if(!el)return;
 if(error){el.textContent=error.message;return;}
 el.innerHTML=(data||[]).map(r=>`<article class="approval-card"><h3>Lift-pass change · ${h(r.status)}</h3><p>Attendee: ${h(r.attendees?[r.attendees.first_name,r.attendees.surname].join(' '):r.attendee_id)} · Requested ${h(r.requested_at)} by ${h(r.requested_by)}</p><p><strong>Justification:</strong> ${h(r.justification)}</p><div class="table-scroll"><table class="data-table"><thead><tr><th>Field</th><th>Current at request</th><th>Proposed</th></tr></thead><tbody>${Object.entries(r.proposed_data).map(([k,v])=>`<tr><th>${h(label(k))}</th><td>${h(r.before_data[k]??'')}</td><td>${h(v??'')}</td></tr>`).join('')}</tbody></table></div>${r.status==='pending'?`<form data-review="${h(r.id)}"><label>Review note<textarea name="note" maxlength="4000"></textarea></label><button class="btn btn-primary" value="approve">Approve change</button><button class="btn btn-ghost" value="reject">Reject change</button><div role="status"></div></form>`:`<p>${h(r.review_note||'')} · ${h(r.finance_action||'')} · Reviewed ${h(r.reviewed_at)} by ${h(r.reviewed_by)}</p>`}</article>`).join('')||'<p>No change requests.</p>';
 el.querySelectorAll('[data-review]').forEach(f=>f.onsubmit=async e=>{e.preventDefault();const buttons=f.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);const {error}=await client.rpc('review_lift_change',{p_request_id:f.dataset.review,p_approve:e.submitter.value==='approve',p_review_note:new FormData(f).get('note')});if(error){f.querySelector('[role=status]').textContent=error.message;buttons.forEach(b=>b.disabled=false);}else{toast('Review recorded');await load();}});
 }
 return {markup,load};
}
