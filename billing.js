// Finance allocation editor. Amounts shown here are previews; the database
// validates the current charge snapshot and calculates the invoice amounts.
export function companyShare(charge,allocation){
 const value=Number(allocation?.value||0),gross=Number(charge.gross_amount||0);
 return allocation?.kind==='amount'?value:Math.round((gross*value/100+Number.EPSILON)*100)/100;
}
export async function mountBillingEditor({el,supabase,attendeeId,eventId,organisations,onSaved,onDrafts,isCurrent}){
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(v||0));
 el.innerHTML='<p>Loading individual and company billing…</p>';
 const {data,error}=await supabase.rpc('get_attendee_billing_plan',{p_attendee_id:attendeeId});
 if(!isCurrent()||!el.isConnected)return;
 if(error){el.innerHTML=`<div class="notice error">${escape(error.message)}</div>`;return;}
 const plan=data.plan,charges=data.charges;
 const allocations=Object.fromEntries(charges.map(c=>[c.charge_key,plan?.allocations?.[c.charge_key]||{kind:'percent',value:0}]));
 const choice=a=>a.kind==='amount'?'amount':Number(a.value)===0?'individual':Number(a.value)===100?'company':'percent';
 el.innerHTML=`<form class="billing-plan-form"><div class="finance-review-heading"><div><h4>Individual and company billing</h4><p>Choose who pays each item. Company shares can go on a separate invoice for this attendee or one combined company invoice. The individual pays the remainder.</p></div></div>
 <div class="form-grid compact-grid"><div class="field"><label>Company account<select name="company"><option value="">No company — individual pays</option>${organisations.map(o=>`<option value="${escape(o.id)}" ${plan?.organisation_id===o.id?'selected':''}>${escape(o.billing_name||o.organisation_name)}</option>`).join('')}</select></label></div><div class="field"><label>Company invoice format<select name="layout"><option value="separate" ${plan?.company_layout!=='combined'?'selected':''}>Separate company invoice for this attendee</option><option value="combined" ${plan?.company_layout==='combined'?'selected':''}>One combined invoice for selected company attendees</option></select></label></div></div>
 <details class="finance-review-section"><summary>Add a company billing account</summary><div class="form-grid compact-grid">${[['name','Company name'],['email','Billing email'],['address1','Address line 1'],['address2','Address line 2'],['town','Town / city'],['county','County / region'],['postcode','Postcode'],['country','Country']].map(([key,label])=>`<div class="field"><label>${label}<input name="new-${key}" type="${key==='email'?'email':'text'}"></label></div>`).join('')}</div><button type="button" class="btn btn-ghost" data-add-company>Add company account</button><div class="new-company-result" role="status"></div></details>
 <div class="service-actions"><button type="button" class="btn btn-ghost btn-small" data-all="individual">Individual pays all</button><button type="button" class="btn btn-ghost btn-small" data-all="company">Company pays all</button></div>
 <div class="table-scroll"><table class="data-table"><thead><tr><th>Item</th><th>Total incl. VAT</th><th>Paid by</th><th>Company share</th></tr></thead><tbody>${charges.map((c,i)=>`<tr data-charge-index="${i}"><td>${escape(c.description)}<br><small>${escape(c.source_type.replaceAll('_',' '))}</small></td><td>${money(c.gross_amount)}</td><td><select aria-label="Payer for ${escape(c.description)}" name="payer-${i}">${[['individual','Individual pays all'],['company','Company pays all'],['percent','Company percentage'],['amount','Company amount (£)']].map(([v,label])=>`<option value="${v}" ${choice(allocations[c.charge_key])===v?'selected':''}>${label}</option>`).join('')}</select></td><td><input aria-label="Company share for ${escape(c.description)}" name="share-${i}" type="number" min="0" step="0.01" value="${escape(allocations[c.charge_key].value)}"><small class="share-preview"></small></td></tr>`).join('')}</tbody></table></div>
 ${charges.length?'':'<p>No chargeable items yet. Confirm operational charges before allocating billing.</p>'}
 <div class="notice billing-plan-totals" aria-live="polite"></div><p class="small muted">Combined invoices include only attendees whose saved plans select the same company and combined format. Saving replaces unconfirmed drafts. Confirmed invoices require a Finance adjustment.</p>
 <div class="service-actions"><button class="btn btn-primary" type="submit" ${charges.length?'':'disabled'}>Save billing allocation</button><button class="btn btn-ghost" type="button" data-drafts ${plan?'':'disabled'}>Create / rebuild allocated drafts</button></div><div class="billing-plan-result" role="status"></div></form>`;
 const form=el.querySelector('form'),result=el.querySelector('.billing-plan-result'),drafts=el.querySelector('[data-drafts]');
 let saved=!!plan,revision=plan?.revision||0,busy=false;
 function read(){return Object.fromEntries(charges.map((c,i)=>{const mode=form.elements[`payer-${i}`].value;return [c.charge_key,{kind:mode==='amount'?'amount':'percent',value:mode==='individual'?0:mode==='company'?100:Number(form.elements[`share-${i}`].value)}];}));}
 function renderTotals(dirty=true){
  if(dirty){saved=false;drafts.disabled=true;}
  const shares=read();let total=0,company=0;
  charges.forEach((c,i)=>{const mode=form.elements[`payer-${i}`].value,input=form.elements[`share-${i}`],share=companyShare(c,shares[c.charge_key]);input.disabled=mode==='individual'||mode==='company';input.max=mode==='amount'?c.gross_amount:100;if(input.disabled)input.value=mode==='company'?100:0;el.querySelector(`[data-charge-index="${i}"] .share-preview`).textContent=`${money(share)} company · ${money(Number(c.gross_amount)-share)} individual`;total+=Number(c.gross_amount);company+=share;});
  el.querySelector('.billing-plan-totals').textContent=`Company: ${money(company)} · Individual: ${money(total-company)} · Total: ${money(total)}`;
 }
 form.addEventListener('input',()=>renderTotals());form.addEventListener('change',()=>renderTotals());
 el.querySelectorAll('[data-all]').forEach(button=>button.onclick=()=>{charges.forEach((c,i)=>{form.elements[`payer-${i}`].value=button.dataset.all;});renderTotals();});
 el.querySelector('[data-add-company]').onclick=async()=>{
  if(busy)return;const details=Object.fromEntries(['name','email','address1','address2','town','county','postcode','country'].map(key=>[key,form.elements[`new-${key}`].value.trim()]));
  const feedback=el.querySelector('.new-company-result');if(!details.name){feedback.textContent='Enter a company name.';return;}
  if(!form.elements['new-email'].checkValidity()){feedback.textContent='Enter a valid billing email.';return;}
  busy=true;form.inert=true;const button=el.querySelector('[data-add-company]');button.disabled=true;feedback.textContent='Adding account…';
  const response=await supabase.rpc('create_finance_billing_company',{p_event_id:eventId,p_details:details});
  if(!isCurrent()||!el.isConnected)return;busy=false;form.inert=false;button.disabled=false;
  if(response.error){feedback.textContent=response.error.message;return;}
  const option=document.createElement('option');option.value=response.data;option.textContent=details.name;form.elements.company.append(option);form.elements.company.value=response.data;
  feedback.textContent='Company account added and selected.';renderTotals();
 };
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;const allocations=read();
  if(charges.some(c=>{const a=allocations[c.charge_key],n=companyShare(c,a);return !Number.isFinite(n)||n<0||n>Number(c.gross_amount)||(a.kind==='percent'&&a.value>100);})) {result.textContent='Check each company share: it cannot exceed the item total or 100%.';return;}
  if(charges.some(c=>companyShare(c,allocations[c.charge_key])>0)&&!form.elements.company.value){result.textContent='Choose the company that will pay these shares.';return;}
  busy=true;form.inert=true;const button=form.querySelector('[type="submit"]');button.disabled=true;result.textContent='Saving…';
  const response=await supabase.rpc('save_attendee_billing_plan',{p_attendee_id:attendeeId,p_organisation_id:form.elements.company.value||null,p_company_layout:form.elements.layout.value,p_allocations:allocations,p_signature:data.signature,p_revision:revision});
  if(!isCurrent()||!el.isConnected)return;
  busy=false;form.inert=false;button.disabled=false;if(response.error){result.textContent=response.error.message;return;}
  revision=response.data.revision;saved=true;drafts.disabled=false;result.textContent='Billing allocation saved. Create the allocated drafts when all billing checks are complete.';await onSaved(response.data);
 };
 drafts.onclick=async()=>{if(!saved||busy)return;busy=true;form.inert=true;drafts.disabled=true;result.textContent='Creating allocated drafts…';const response=await supabase.rpc('create_attendee_billing_drafts',{p_attendee_id:attendeeId});if(!isCurrent()||!el.isConnected)return;busy=false;form.inert=false;drafts.disabled=false;if(response.error){result.textContent=response.error.message;return;}result.textContent=`${response.data.length} invoice(s) ready for review.`;await onDrafts(response.data);};
 renderTotals(false);
}
