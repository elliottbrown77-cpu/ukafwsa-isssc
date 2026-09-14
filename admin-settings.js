export function createAdminSettings({client,eventId,getProfile,escapeHtml,toast}){
  const h=escapeHtml;
  const roles=[
    ['admin','Administrator'],['protocol','Protocol'],['finance','Finance'],
    ['sponsor_manager','Sponsor manager'],['operations','Operations'],
    ['content_manager','Content manager'],['read_only','Read only']
  ];
  const state={staff:[],email:null,capabilities:null,editing:null,loading:false};
  const value=(v)=>h(v??'');
  const selected=(a,b)=>a===b?' selected':'';
  const checked=(v)=>v?' checked':'';
  const roleLabel=(role)=>roles.find(([key])=>key===role)?.[1]||role;
  const dateTime=(v)=>v?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'Never';
  const isAdmin=()=>getProfile()?.app_role==='admin';

  function markup(){
    return `<div class="admin-settings" id="adminSettings"><section class="surface"><div class="surface-head"><div><strong>Staff access</strong><div class="muted small">Approve staff email addresses, assign roles and deactivate access. Changes take effect on the next request.</div></div><button class="btn btn-primary" id="addStaffAccess">Add staff member</button></div><div class="surface-body"><div id="staffAccessList" class="empty">Loading staff access…</div><div id="staffAccessEditor"></div></div></section><section class="section"><div class="surface"><div class="surface-head"><div><strong>Email sending</strong><div class="muted small">Control the address used for ISSSC invoice emails. Provider credentials remain protected and are never displayed here.</div></div><button class="btn btn-ghost" id="refreshAdminSettings">Refresh</button></div><div class="surface-body"><div id="emailSettingsPanel" class="empty">Loading email settings…</div></div></div></section></div>`;
  }

  async function load(){
    if(!isAdmin()||state.loading)return;
    state.loading=true;
    try{
      const [staff,email,capabilities]=await Promise.all([
        client.rpc('admin_list_staff_access'),
        client.rpc('admin_get_email_settings',{p_event_id:eventId}),
        client.functions.invoke('invoice-delivery',{body:{action:'capabilities',event_id:eventId}})
      ]);
      if(staff.error)throw staff.error;
      if(email.error)throw email.error;
      state.staff=staff.data||[];
      state.email=email.data?.[0]||null;
      state.capabilities=capabilities.error?{email_configured:false,error:capabilities.error.message}:capabilities.data;
      render();
    }catch(error){
      const list=document.querySelector('#staffAccessList');if(list)list.innerHTML=`<div class="notice error">${value(error.message||'Unable to load Admin settings.')}</div>`;
    }finally{state.loading=false}
  }

  function render(){renderStaff();renderEmail();bindInner()}
  function renderStaff(){
    const el=document.querySelector('#staffAccessList');if(!el)return;
    if(!state.staff.length){el.innerHTML='<div class="empty">No staff email addresses have been approved yet.</div>';return}
    el.innerHTML=`<div class="table-scroll"><table class="data-table admin-staff-table"><thead><tr><th>Staff member</th><th>Role</th><th>Account</th><th>Access</th><th></th></tr></thead><tbody>${state.staff.map(row=>`<tr><td><strong>${value(row.display_name||row.email)}</strong><small>${value(row.email)}${row.user_id===getProfile()?.id?' · You':''}</small></td><td>${value(roleLabel(row.app_role))}</td><td><span class="status ${row.user_id?'green':'amber'}">${row.user_id?'Signed in':'Awaiting first sign-in'}</span>${row.user_id?`<small>Last sign-in: ${value(dateTime(row.last_sign_in_at))}</small>`:''}</td><td><span class="status ${row.active?'green':'red'}">${row.active?'Active':'Inactive'}</span></td><td><button class="btn btn-ghost btn-small" data-edit-staff-access="${row.access_id}">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  function staffEditor(){
    const row=state.staff.find(item=>item.access_id===state.editing)||{};
    const isExisting=!!row.access_id;
    return `<form id="staffAccessForm" class="record-form admin-editor"><div class="review-heading"><div><span class="status purple">${isExisting?'Staff access':'New staff member'}</span><h3>${isExisting?value(row.display_name||row.email):'Approve an email address'}</h3><p>${isExisting?'Update the role or deactivate access.':'The person uses this address on the Staff sign-in page.'}</p></div><button class="btn btn-ghost btn-small" id="closeStaffAccessEditor" type="button">Close</button></div><div class="form-grid"><div class="field"><label>Email address *</label><input name="email" type="email" maxlength="320" required value="${value(row.email||'')}"${isExisting?' readonly':''}></div><div class="field"><label>Display name</label><input name="display_name" maxlength="120" value="${value(row.display_name||'')}"></div><div class="field"><label>Staff role *</label><select name="app_role" required>${roles.map(([key,label])=>`<option value="${key}"${selected(row.app_role||'read_only',key)}>${label}</option>`).join('')}</select></div><div class="field checkbox"><input id="staffAccessActive" name="active" type="checkbox"${checked(isExisting?row.active:true)}><div><label for="staffAccessActive">Active access</label><small>Untick to block the account immediately while retaining its audit history.</small></div></div></div><div class="notice">New staff do not need to be created in Supabase. After this is saved, they enter the approved address on the Staff sign-in page and receive the assigned role on first sign-in.</div><div class="service-actions"><button class="btn btn-primary" type="submit">Save staff access</button><div class="service-save-result"></div></div></form>`;
  }
  function renderEditor(){const el=document.querySelector('#staffAccessEditor');if(el)el.innerHTML=state.editing===null?'':staffEditor()}

  function renderEmail(){
    const el=document.querySelector('#emailSettingsPanel');if(!el)return;
    const current=state.email||{};
    const capabilities=state.capabilities||{};
    const from=current.invoice_from_email||capabilities.sender||'';
    const name=current.invoice_sender_name||capabilities.sender_name||'UKAF WSA';
    const reply=current.invoice_reply_to||capabilities.reply_to||'';
    const active=state.email?state.email.active:capabilities.sending_active!==false;
    const providerReady=!!capabilities.provider_configured;
    el.innerHTML=`<div class="admin-email-status"><div class="card"><span class="status ${providerReady?'green':'amber'}">${providerReady?'Connected':'Setup required'}</span><strong>Email provider</strong><small>${providerReady?'The secure provider key is available.':'The secure Resend provider key still needs to be connected once.'}</small></div><div class="card"><span class="status ${capabilities.email_configured?'green':'amber'}">${capabilities.email_configured?'Ready':'Not ready'}</span><strong>Invoice email</strong><small>${capabilities.email_configured?`Currently sends from ${value(capabilities.sender)}`:'Save a verified sender address and ensure the provider is connected.'}</small></div></div><form id="emailSettingsForm" class="record-form admin-email-form"><div class="form-grid"><div class="field"><label>Sender name *</label><input name="invoice_sender_name" maxlength="100" required value="${value(name)}" placeholder="UKAF WSA"></div><div class="field"><label>Invoice sender email *</label><input name="invoice_from_email" type="email" maxlength="320" required value="${value(from)}" placeholder="invoices@example.org"></div><div class="field"><label>Reply-to email</label><input name="invoice_reply_to" type="email" maxlength="320" value="${value(reply)}" placeholder="finance@example.org"><small>Replies to invoice emails will go here. Leave blank to use the sender address.</small></div><div class="field checkbox"><input id="emailSendingActive" name="active" type="checkbox"${checked(active)}><div><label for="emailSendingActive">Invoice email sending active</label><small>Turn this off to prevent invoice emails being sent.</small></div></div></div><div class="notice warn"><strong>Sender verification:</strong> the invoice sender address must use a domain verified with the email provider. Saving an address here does not bypass that provider check.</div><div class="service-actions"><button class="btn btn-primary" type="submit">Save email settings</button><div class="service-save-result"></div></div></form><div class="admin-auth-note"><strong>Staff sign-in emails</strong><p>Authentication links are sent by the secure sign-in service. Staff access is controlled by the approved list above; SMTP credentials and provider secrets are deliberately not exposed in the website.</p></div>`;
  }

  async function saveStaff(form){
    const data=new FormData(form),button=form.querySelector('[type="submit"]'),result=form.querySelector('.service-save-result');
    button.disabled=true;result.textContent='';
    const response=await client.rpc('admin_save_staff_access',{p_email:data.get('email'),p_display_name:data.get('display_name')||'',p_app_role:data.get('app_role'),p_active:data.has('active')});
    button.disabled=false;
    if(response.error){result.innerHTML=`<div class="notice error">${value(response.error.message)}</div>`;return}
    toast('Staff access saved');state.editing=null;await load();
  }
  async function saveEmail(form){
    const data=new FormData(form),button=form.querySelector('[type="submit"]'),result=form.querySelector('.service-save-result');
    button.disabled=true;result.textContent='';
    const response=await client.rpc('admin_save_email_settings',{p_event_id:eventId,p_invoice_from_email:data.get('invoice_from_email'),p_invoice_sender_name:data.get('invoice_sender_name'),p_invoice_reply_to:data.get('invoice_reply_to')||'',p_active:data.has('active')});
    button.disabled=false;
    if(response.error){result.innerHTML=`<div class="notice error">${value(response.error.message)}</div>`;return}
    toast('Email settings saved');await load();
  }

  function bindInner(){
    renderEditor();
    document.querySelectorAll('[data-edit-staff-access]').forEach(button=>button.onclick=()=>{state.editing=button.dataset.editStaffAccess;renderEditor();bindEditor();document.querySelector('#staffAccessEditor')?.scrollIntoView({behavior:'smooth',block:'start'})});
    bindEditor();
    const emailForm=document.querySelector('#emailSettingsForm');if(emailForm)emailForm.onsubmit=event=>{event.preventDefault();saveEmail(emailForm)};
  }
  function bindEditor(){
    const close=document.querySelector('#closeStaffAccessEditor');if(close)close.onclick=()=>{state.editing=null;renderEditor()};
    const form=document.querySelector('#staffAccessForm');if(form)form.onsubmit=event=>{event.preventDefault();saveStaff(form)};
  }
  function bind(){
    const add=document.querySelector('#addStaffAccess');if(add)add.onclick=()=>{state.editing='new';renderEditor();bindEditor();document.querySelector('#staffAccessEditor')?.scrollIntoView({behavior:'smooth',block:'start'})};
    const refresh=document.querySelector('#refreshAdminSettings');if(refresh)refresh.onclick=load;
    bindInner();
  }

  return {markup,bind,load};
}
