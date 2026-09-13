const SUPABASE_URL = 'https://apugxrwhiyvwcrpzvgxj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WoZaQe5QeUDLb764uMWEtw_78rsp8Mi';
const EVENT_ID = '9c1c1d5e-d9f1-4f6b-b323-f3c35261fc19';
let supabase = null;

const ROUTES = new Set(['home','register','event','staff']);
const isAuthCallback = (hash=location.hash)=>/(?:^#|[&#])(access_token|refresh_token|error|error_code)=/.test(hash);
let authLanding = new URLSearchParams(location.search).get('next')==='staff' || isAuthCallback();
const hashRoute = location.hash.replace('#/','');
const state = { route: authLanding ? 'staff' : (ROUTES.has(hashRoute) ? hashRoute : 'home'), session:null, profile:null, staffTab:'overview', intakeFilter:'pending', intakeRows:[], protocolRows:[], protocolQuery:'' };
const app = document.querySelector('#app');

const icon = (s)=>`<span aria-hidden="true">${s}</span>`;
const navItems = [
  ['home','Home'],['register','Register'],['event','Event app'],['staff','Staff']
];

function toast(message){
  let wrap=document.querySelector('.toast-wrap'); if(!wrap){wrap=document.createElement('div');wrap.className='toast-wrap';document.body.appendChild(wrap)}
  const el=document.createElement('div');el.className='toast';el.textContent=message;wrap.appendChild(el);setTimeout(()=>el.remove(),4200);
}
function setRoute(route){state.route=route;location.hash=`#/${route}`;render();window.scrollTo({top:0,behavior:'smooth'});} 

function layout(content){
  return `<div class="shell">
  <header class="topbar"><div class="topbar-inner">
    <a class="brand" href="#/home"><img src="/ukafwsa-mark.svg" alt="UKAF WSA"><div class="brand-copy"><strong>UKAF WSA</strong><span>Inter Service Snow Sports Championships 2027</span></div></a>
    <button class="menu" id="menuBtn" aria-label="Open navigation">Menu</button>
    <nav class="nav" id="nav">${navItems.map(([r,l])=>`<button data-route="${r}" class="${state.route===r?'active':''}">${l}</button>`).join('')}</nav>
  </div></header>
  <main class="main">${content}</main>
  <footer class="footer"><div class="footer-inner"><span>UK Armed Forces Winter Sports Association</span><span>ISSSC 2027 · Méribel · 30 Jan–6 Feb 2027</span></div></footer>
  </div>`;
}

function home(){
return `<section class="hero"><div class="hero-panel"><span class="eyebrow">${icon('❄')} ISSSC 2027</span><h1>One secure platform for the whole championship.</h1><p>Attendance, sponsor invitations, accommodation, travel, billing and live event information — designed for attendees, Protocol, Finance and the Sponsor team.</p><div class="actions"><button class="btn btn-primary" data-route="register">Register attendance</button><button class="btn btn-secondary" data-route="event">Open event app</button></div></div>
<div class="event-card"><div class="date">30</div><div class="month">January 2027</div><hr><dl><dt>Location</dt><dd>Méribel, France</dd><dt>Changeover</dt><dd>3 Feb</dd><dt>Final day</dt><dd>6 Feb</dd><dt>Lift area</dt><dd>3 Vallées</dd></dl><div class="actions"><button class="btn btn-primary" data-route="register">Start registration</button></div></div></section>
<section class="section"><div class="section-head"><div><h2>Built around the event</h2><p>Public requests go in once; the operational team controls the confirmed truth.</p></div></div><div class="grid grid-4">
${[['📝','Simple registration','One mobile-friendly form replaces the legacy attendee intake.'],['🏨','Protocol controlled','Assigned hotels, rooms, transfers and passes remain operational decisions.'],['£','Finance ready','Rate card, invoice snapshots and consolidated sponsor billing stay inside the database.'],['📣','Live event app','Programme, venues, notices, table plans, biographies and documents in one place.']].map(x=>`<article class="card"><div class="icon">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join('')}</div></section>
<section class="section grid grid-2"><div class="card"><span class="status purple">Attendee</span><h2>Your event in your pocket</h2><p>Register, then use the same web app during the week for schedules, race locations, announcements and event information. It can be installed to a phone home screen like an app.</p><div class="actions"><button class="btn btn-ghost" data-route="event">View event app</button></div></div><div class="card"><span class="status green">Staff</span><h2>One operational picture</h2><p>Protocol, Sponsor and Finance roles each get the tools they need without exposing sensitive or financial data to ordinary attendees.</p><div class="actions"><button class="btn btn-ghost" data-route="staff">Staff sign in</button></div></div></section>`;
}

const opts=(arr,placeholder='Select…')=>`<option value="">${placeholder}</option>${arr.map(v=>`<option>${v}</option>`).join('')}`;
function register(){
return `<div class="hero-mini"><span class="eyebrow">Attendance request</span><h2>ISSSC 2027 registration</h2><p>Your answers are a request. Protocol confirms accommodation, transfers, lift passes and chargeable services before billing.</p></div>
<div class="surface"><div class="surface-head"><div><strong>Attendance details</strong><div class="muted small">30 January–6 February 2027 · Méribel</div></div><span class="status purple">Secure web form</span></div><div class="surface-body">
<form id="registrationForm" class="form-grid">
<div class="field full hidden"><label>Website</label><input name="website" autocomplete="off" tabindex="-1"></div>
<div class="field checkbox full"><input type="checkbox" id="onBehalf" name="submitted_on_behalf"><div><label for="onBehalf">I am completing this on behalf of someone else</label><small>We will keep the submitter and attendee details separate.</small></div></div>
<div class="field proxy hidden"><label>Your name</label><input name="proxy_name"></div><div class="field proxy hidden"><label>Your email</label><input type="email" name="proxy_email"></div>
<div class="form-section"><h3>Attendee</h3><p>Who is attending ISSSC 2027?</p></div>
<div class="field"><label>Category *</label><select name="category" required>${opts(['Military VIP','Military Guest','Sponsor','Sponsor Guest','Royal Party','Committee','Protocol','Hill Team','Other'])}</select></div>
<div class="field"><label>Sponsor / organisation</label><input name="sponsor_name" placeholder="If applicable"></div>
<div class="field"><label>Rank / title</label><input name="title_rank"></div><div class="field"><label>Role / appointment</label><input name="role"></div>
<div class="field"><label>First name *</label><input name="first_name" required></div><div class="field"><label>Surname *</label><input name="surname" required></div>
<div class="field"><label>Post nominals</label><input name="post_nominals"></div><div class="field"><label>Email *</label><input type="email" name="email" required></div>
<div class="field"><label>Mobile</label><input name="mobile" inputmode="tel"></div><div class="field"><label>Service</label><select name="service">${opts(['Royal Navy','British Army','Royal Air Force','Civilian','Other'])}</select></div>
<div class="field"><label>Discipline</label><select name="discipline">${opts(['Alpine','Snowboard','Telemark','Nordic','Bobsleigh','Skeleton','Luge','Other','Not competing'])}</select></div>
<div class="form-section"><h3>Accommodation</h3><p>Hotel choice is a preference only. Protocol will record the assigned hotel and room separately.</p></div>
<div class="field checkbox"><input type="checkbox" name="accommodation_required" id="acc"><label for="acc">I require accommodation</label></div>
<div class="field"><label>Hotel preference</label><select name="hotel_preference">${opts(['Eterlou','Chaudanne','Savoy','Chalet','Own accommodation','No preference'])}</select></div>
<div class="field"><label>Accommodation from</label><input type="date" min="2027-01-30" max="2027-02-06" name="accommodation_from"></div><div class="field"><label>Accommodation to</label><input type="date" min="2027-01-30" max="2027-02-06" name="accommodation_to"></div>
<div class="field checkbox"><input type="checkbox" name="share_room" id="share"><label for="share">I am willing / expecting to share a room</label></div><div class="field"><label>Sharing with</label><input name="sharing_with"></div>
<div class="field"><label>Evening meal preference</label><select name="dinners_required">${opts(['Dinner with event guests each night','B&B only / no event dinner','Not sure'])}</select></div><div class="field"><label>Dietary requirements</label><textarea name="dietary_requirements" placeholder="Only information needed to support your attendance"></textarea></div>
<div class="form-section"><h3>Arrival</h3><p>Travel details help Protocol coordinate transfers.</p></div>
<div class="field"><label>Method</label><select name="arrival_method">${opts(['Flight','Train','Drive','Coach','Other'])}</select></div><div class="field"><label>Airport / station</label><input name="arrival_airport_station"></div>
<div class="field"><label>Flight / travel number</label><input name="arrival_number"></div><div class="field"><label>Arrival date & time</label><input type="datetime-local" name="arrival_datetime"></div>
<div class="field"><label>Expected time in resort</label><input type="datetime-local" name="arrival_resort_datetime"></div><div class="field checkbox"><input type="checkbox" name="arrival_transfer" id="arrTransfer"><label for="arrTransfer">Request UKAFWSA arrival transfer</label></div>
<div class="form-section"><h3>Departure</h3></div>
<div class="field"><label>Method</label><select name="departure_method">${opts(['Flight','Train','Drive','Coach','Other'])}</select></div><div class="field"><label>Airport / station</label><input name="departure_airport_station"></div>
<div class="field"><label>Flight / travel number</label><input name="departure_number"></div><div class="field"><label>Departure date & time</label><input type="datetime-local" name="departure_datetime"></div>
<div class="field"><label>Leave resort</label><input type="datetime-local" name="departure_resort_datetime"></div><div class="field checkbox"><input type="checkbox" name="departure_transfer" id="depTransfer"><label for="depTransfer">Request UKAFWSA departure transfer</label></div>
<div class="form-section"><h3>On snow</h3></div>
<div class="field checkbox"><input type="checkbox" name="lift_pass_required" id="lift"><label for="lift">I require a 3 Vallées lift pass</label></div><div class="field checkbox"><input type="checkbox" checked name="carre_neige_required" id="carre"><label for="carre">Carre Neige requested</label></div>
<div class="field"><label>First ski day</label><input type="date" min="2027-01-30" max="2027-02-06" name="first_ski_day"></div><div class="field"><label>Last ski day</label><input type="date" min="2027-01-30" max="2027-02-06" name="last_ski_day"></div>
<div class="field checkbox"><input type="checkbox" name="lessons_required" id="lessons"><label for="lessons">I would like lessons</label></div><div class="field"><label>Lesson type</label><select name="lesson_type">${opts(['Group','Private','Telemark','Not sure'])}</select></div>
<div class="field"><label>Lesson dates / preference</label><input name="lesson_dates"></div><div class="field checkbox"><input type="checkbox" name="equipment_hire_required" id="hire"><label for="hire">I need equipment hire information</label></div>
<div class="field"><label>Boot size</label><input name="boot_size"></div><div class="field"><label>Date of birth</label><input type="date" name="date_of_birth"><small>Collected only where needed for Carre Neige arrangements.</small></div>
<div class="field full"><label>Anything else Protocol should know?</label><textarea name="other_information"></textarea></div>
<div class="field full"><div class="notice warn">Submitting this form does not create a final bill. Protocol confirms what was actually supplied; Finance calculates charges from the approved event rate card.</div></div>
<div class="field full"><button class="btn btn-primary" type="submit" id="submitRegistration">Submit attendance request</button><div id="formResult"></div></div>
</form></div></div>`;
}

function eventApp(){
return `<div class="hero-mini"><span class="eyebrow">Event app</span><h2>ISSSC 2027 in Méribel</h2><p>Designed to work on mobile and install to your home screen.</p></div>
<div class="grid grid-4"><div class="card metric"><strong>30 Jan</strong><span>Opening weekend</span></div><div class="card metric"><strong>3 Feb</strong><span>Midweek changeover</span></div><div class="card metric"><strong>6 Feb</strong><span>Final day</span></div><div class="card metric"><strong>3V</strong><span>3 Vallées area</span></div></div>
<section class="section grid grid-2"><div class="surface"><div class="surface-head"><strong>Latest notices</strong><span class="status amber">Live during event</span></div><div class="surface-body"><div class="list"><div class="list-row"><div><strong>Welcome to ISSSC 2027</strong><small>Official announcements and operational updates will appear here.</small></div><span class="status purple">Info</span></div><div class="list-row"><div><strong>Race locations</strong><small>Venue maps and last-minute changes will be published from the staff portal.</small></div><span class="status green">Venue</span></div></div></div></div>
<div class="surface"><div class="surface-head"><strong>Your event tools</strong></div><div class="surface-body grid grid-2"><div class="card"><div class="icon">📅</div><h3>Programme</h3><p>Daily schedule and ceremonies.</p></div><div class="card"><div class="icon">📍</div><h3>Locations</h3><p>Race and event venues.</p></div><div class="card"><div class="icon">🍽</div><h3>Table plans</h3><p>Published dinner seating plans.</p></div><div class="card"><div class="icon">👤</div><h3>Biographies</h3><p>VIP, guest and key personnel bios.</p></div></div></div></section>
<div class="notice">Attendee sign-in and personalised booking summary will be switched on once the first registrations have been reviewed and linked to accounts.</div>`;
}

function staffLogin(){
return `<div class="login-box"><div class="brand-lockup"><img src="/ukafwsa-mark.svg" alt=""><div><h2 style="margin:0">Staff portal</h2><div class="muted">Protocol · Sponsor · Finance · Content</div></div></div><p class="muted">Enter your authorised email address. A secure sign-in link will be sent if your Supabase authentication settings permit it.</p><form id="loginForm" class="form-grid"><div class="field full"><label>Email</label><input name="email" type="email" required placeholder="name@example.com"></div><div class="field full"><button class="btn btn-primary" type="submit">Send sign-in link</button></div><div id="loginResult" class="field full"></div></form></div>`;
}
function staffDashboard(){
const role=state.profile?.app_role || 'authenticated';
return `<div class="dashboard-shell"><aside class="side"><h3>Staff portal</h3>${[['overview','Overview'],['intake','New registrations'],['protocol','Protocol'],['sponsors','Sponsors'],['finance','Finance'],['content','Event content']].map(([r,l])=>`<button data-stafftab="${r}" class="${state.staffTab===r?'active':''}">${l}</button>`).join('')}<button id="signOutBtn">Sign out</button></aside><div class="dash-main"><div class="hero-mini"><span class="eyebrow">Role: ${role}</span><h2>${staffTitle()}</h2><p>${staffSubtitle()}</p></div><div id="staffPanel">${staffPanel()}</div></div></div>`;
}
function staffTitle(){return ({overview:'Operational overview',intake:'Registration intake',protocol:'Protocol operations',sponsors:'Sponsor management',finance:'Finance & billing',content:'Event app content'})[state.staffTab]}
function staffSubtitle(){return ({overview:'One view of the event workflow.',intake:'Review public attendee requests before they become canonical records.',protocol:'Confirm hotel, room, transfer, lift pass and usage data.',sponsors:'Permanent organisations with event-year sponsorship and invitations.',finance:'Review rates, billing readiness and immutable invoice snapshots.',content:'Publish announcements, programme, venues, biographies and table plans.'})[state.staffTab]}
function staffPanel(){
if(state.staffTab==='overview') return `<div class="grid grid-4"><div class="card metric"><strong id="mPending">—</strong><span>Pending registrations</span></div><div class="card metric"><strong id="mAttendees">—</strong><span>Attendees</span></div><div class="card metric"><strong id="mSponsors">—</strong><span>Event sponsors</span></div><div class="card metric"><strong id="mInvoices">—</strong><span>Invoices</span></div></div><section class="section"><div class="surface"><div class="surface-head"><strong>Workflow</strong></div><div class="surface-body grid grid-3"><div class="card"><span class="status purple">1</span><h3>Review intake</h3><p>Public form submissions remain requests until Protocol accepts them.</p></div><div class="card"><span class="status purple">2</span><h3>Confirm services</h3><p>Assigned hotel, room, travel, passes and extras become the billable truth.</p></div><div class="card"><span class="status purple">3</span><h3>Issue invoice</h3><p>Finance reviews approved rates and snapshots immutable invoice lines.</p></div></div></div></section>`;
if(state.staffTab==='intake') return `<div class="surface"><div class="surface-head"><div><strong>Registration review</strong><div class="muted small">Open a request to review every submitted detail before making a decision.</div></div><div class="intake-tools"><label class="small muted" for="intakeFilter">Show</label><select id="intakeFilter"><option value="pending">Pending</option><option value="review_required">Needs follow-up</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="all">All</option></select><button class="btn btn-ghost" id="refreshIntake">Refresh</button></div></div><div class="surface-body"><div id="intakeTable" class="empty">Loading registrations…</div><div id="intakeDetail"></div></div></div>`;
if(state.staffTab==='protocol') return `<div class="surface"><div class="surface-head"><div><strong>Attendee operations</strong><div class="muted small">Maintain the approved attendee record, then confirm accommodation, travel and lift-pass services.</div></div><div class="protocol-tools"><label class="small muted" for="protocolSearch">Find attendee</label><input id="protocolSearch" type="search" placeholder="Name, email or organisation" value="${esc(state.protocolQuery)}"><button class="btn btn-ghost" id="refreshProtocol">Refresh</button></div></div><div class="surface-body"><div id="protocolTable" class="empty">Loading attendees…</div><div id="protocolDetail"></div></div></div>`;
if(state.staffTab==='sponsors') return `<div class="surface"><div class="surface-head"><strong>Event sponsors</strong><button class="btn btn-primary" disabled>Add sponsor</button></div><div class="surface-body"><div id="sponsorTable" class="empty">Loading sponsors…</div></div></div>`;
if(state.staffTab==='finance') return `<div class="grid grid-3"><div class="card"><span class="status amber">Proposed</span><h3>2027 rate card</h3><p>Rates remain proposed until approved. Unknown VAT is never guessed.</p></div><div class="card"><span class="status green">Protected</span><h3>Invoice snapshots</h3><p>Issued invoice lines preserve quantity, unit price, net, VAT and gross values.</p></div><div class="card"><span class="status purple">Supported</span><h3>Consolidated billing</h3><p>Sponsor invoices can group attendees by billing organisation while retaining attendee breakdown.</p></div></div><section class="section"><div class="surface"><div class="surface-head"><strong>Invoices</strong></div><div class="surface-body"><div id="invoiceTable" class="empty">Loading invoices…</div></div></div></section>`;
return `<div class="grid grid-3"><div class="card"><div class="icon">📣</div><h3>Announcements</h3><p>Create priority messages and expiry times.</p></div><div class="card"><div class="icon">📅</div><h3>Programme</h3><p>Publish schedule items by venue and audience.</p></div><div class="card"><div class="icon">📄</div><h3>Documents & table plans</h3><p>Publish versioned event resources without rebuilding the app.</p></div></div>`;
}
function staff(){return state.session ? staffDashboard() : staffLogin();}

function render(){
  const content = state.route==='register'?register():state.route==='event'?eventApp():state.route==='staff'?staff():home();
  app.innerHTML=layout(content);bind();
  if(state.route==='staff' && state.session) loadStaffData();
}
function bind(){
  document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>setRoute(b.dataset.route)));
  const menu=document.querySelector('#menuBtn'),nav=document.querySelector('#nav');if(menu) menu.onclick=()=>nav.classList.toggle('open');
  const ob=document.querySelector('#onBehalf');if(ob) ob.onchange=()=>document.querySelectorAll('.proxy').forEach(x=>x.classList.toggle('hidden',!ob.checked));
  const reg=document.querySelector('#registrationForm');if(reg) reg.addEventListener('submit',submitRegistration);
  const login=document.querySelector('#loginForm');if(login) login.addEventListener('submit',sendLoginLink);
  document.querySelectorAll('[data-stafftab]').forEach(b=>b.onclick=()=>{state.staffTab=b.dataset.stafftab;render()});
  const out=document.querySelector('#signOutBtn');if(out) out.onclick=async()=>{await supabase.auth.signOut();state.session=null;state.profile=null;render();};
  const ref=document.querySelector('#refreshIntake');if(ref) ref.onclick=loadIntake;
  const filter=document.querySelector('#intakeFilter');if(filter){filter.value=state.intakeFilter;filter.onchange=()=>{state.intakeFilter=filter.value;loadIntake()};}
  const protocolRefresh=document.querySelector('#refreshProtocol');if(protocolRefresh)protocolRefresh.onclick=loadProtocol;
  const protocolSearch=document.querySelector('#protocolSearch');if(protocolSearch)protocolSearch.oninput=()=>{state.protocolQuery=protocolSearch.value;renderProtocolRows();};
}

function formObject(form){
 const fd=new FormData(form),obj={};
 for(const [k,v] of fd.entries()) obj[k]=v;
 form.querySelectorAll('input[type=checkbox]').forEach(c=>obj[c.name]=c.checked);
 return obj;
}
async function submitRegistration(e){
 e.preventDefault();const form=e.currentTarget;const btn=document.querySelector('#submitRegistration');const result=document.querySelector('#formResult');
 if(!supabase){result.innerHTML='<div class="notice error">The secure registration service is still connecting. Please wait a moment and try again.</div>';return}
 const body=formObject(form);if(body.website){form.reset();result.innerHTML='<div class="notice success">Thank you.</div>';return}
 btn.disabled=true;btn.textContent='Submitting…';result.innerHTML='';
 const row={event_id:EVENT_ID,source:'web',invitation_code:new URLSearchParams(location.search).get('invite'),submitted_on_behalf:!!body.submitted_on_behalf,submitter_name:body.submitted_on_behalf?body.proxy_name:`${body.first_name} ${body.surname}`,submitter_email:body.submitted_on_behalf?body.proxy_email:body.email,attendee_email:body.email,processing_status:'pending',mapping_version:'web_v1',raw_payload:body};
 const {error}=await supabase.from('intake_submissions').insert(row);
 if(error){console.error(error);result.innerHTML='<div class="notice error">We could not save your registration. Please try again or contact the Protocol team.</div>';btn.disabled=false;btn.textContent='Submit attendance request';return}
 form.reset();result.innerHTML='<div class="notice success"><strong>Registration received.</strong> Protocol will review your request and confirm the operational details separately.</div>';btn.textContent='Submitted';toast('Attendance request received');
}
async function sendLoginLink(e){
 e.preventDefault();const email=new FormData(e.currentTarget).get('email');const box=document.querySelector('#loginResult');box.innerHTML='<div class="notice">Sending secure sign-in link…</div>';
 if(!supabase){box.innerHTML='<div class="notice error">The secure sign-in service is still connecting. Please wait a moment and try again.</div>';return}
 const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/?next=staff`}});
 box.innerHTML=error?`<div class="notice error">${error.message}</div>`:'<div class="notice success">Check your email for the secure sign-in link.</div>';
}
async function loadProfile(){
 if(!state.session){state.profile=null;return}
 const {data}=await supabase.from('profiles').select('id,display_name,app_role,active').eq('id',state.session.user.id).maybeSingle();state.profile=data||null;
}
async function loadStaffData(){
 if(state.staffTab==='overview'){
  const [i,a,s,n]=await Promise.all([
    supabase.from('intake_submissions').select('*',{count:'exact',head:true}).eq('processing_status','pending'),
    supabase.from('attendees').select('*',{count:'exact',head:true}),
    supabase.from('event_sponsors').select('*',{count:'exact',head:true}).eq('event_id',EVENT_ID),
    supabase.from('invoices').select('*',{count:'exact',head:true}).eq('event_id',EVENT_ID)
  ]);
  [['mPending',i.count],['mAttendees',a.count],['mSponsors',s.count],['mInvoices',n.count]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v??'—'});
 }
 if(state.staffTab==='intake') loadIntake();
 if(state.staffTab==='protocol') loadProtocol();
 if(state.staffTab==='sponsors') loadSponsors();
 if(state.staffTab==='finance') loadInvoices();
}
async function loadIntake(){
 const el=document.querySelector('#intakeTable');if(!el)return;el.textContent='Loading registrations…';
 let query=supabase.from('intake_submissions').select('id,submitted_at,submitted_on_behalf,submitter_name,submitter_email,attendee_email,processing_status,protocol_reviewed_at,review_notes,mapped_attendee_id,raw_payload').eq('event_id',EVENT_ID).order('submitted_at',{ascending:false}).limit(100);
 if(state.intakeFilter!=='all')query=query.eq('processing_status',state.intakeFilter);
 const {data,error}=await query;
 if(error){el.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;return} if(!data?.length){state.intakeRows=[];el.innerHTML='<div class="empty">No registrations in this view.</div>';return}
 state.intakeRows=data;
 el.innerHTML=`<div class="table-scroll"><table class="data-table intake-table"><thead><tr><th>Attendee</th><th>Category</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>${data.map(r=>`<tr><td><strong>${esc(`${r.raw_payload?.first_name||''} ${r.raw_payload?.surname||''}`.trim()||'Unnamed attendee')}</strong><br><small>${esc(r.attendee_email||'')}</small></td><td>${esc(r.raw_payload?.category||'')}</td><td>${new Date(r.submitted_at).toLocaleString('en-GB')}</td><td><span class="status ${statusClass(r.processing_status)}">${esc(statusLabel(r.processing_status))}</span></td><td><button class="btn btn-ghost btn-small" data-review-intake="${r.id}">Review</button></td></tr>`).join('')}</tbody></table></div>`;
 document.querySelectorAll('[data-review-intake]').forEach(button=>button.onclick=()=>openIntake(button.dataset.reviewIntake));
}

function statusLabel(status){return ({pending:'Pending',review_required:'Needs follow-up',accepted:'Accepted',rejected:'Rejected',mapped:'Mapped',error:'Error'})[status]||status||'Unknown';}
function statusClass(status){return ({accepted:'green',rejected:'red',error:'red',review_required:'purple',pending:'amber'})[status]||'purple';}
function present(value,fallback='Not provided'){return value===true?'Yes':value===false?'No':value?esc(String(value).replace('T',' ')):fallback;}
function detailRows(rows){return `<dl class="review-grid">${rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${present(value)}</dd></div>`).join('')}</dl>`;}
function canReviewIntake(){return ['admin','protocol','operations'].includes(state.profile?.app_role);}

function openIntake(id){
 const row=state.intakeRows.find(item=>item.id===id),el=document.querySelector('#intakeDetail');if(!row||!el)return;
 const p=row.raw_payload||{};
 const actions=canReviewIntake()&&row.processing_status!=='accepted'?`<div class="review-actions"><div class="field"><label for="reviewNotes">Review notes</label><textarea id="reviewNotes" placeholder="Optional internal note">${esc(row.review_notes||'')}</textarea></div><div id="reviewResult"></div><div class="actions"><button class="btn btn-primary" data-intake-decision="accepted">Approve and create attendee</button><button class="btn btn-ghost" data-intake-decision="review_required">Needs follow-up</button><button class="btn btn-danger" data-intake-decision="rejected">Reject</button></div></div>`:`<div class="notice ${row.processing_status==='accepted'?'success':''}">${row.processing_status==='accepted'?'This request has been approved and linked to an attendee record.':'You have read-only access to this registration.'}</div>`;
 el.innerHTML=`<section class="review-panel"><div class="review-heading"><div><span class="status ${statusClass(row.processing_status)}">${esc(statusLabel(row.processing_status))}</span><h3>${esc(`${p.title_rank||''} ${p.first_name||''} ${p.surname||''}`.trim()||'Registration')}</h3><p>${esc(row.attendee_email||'')}</p></div><button class="btn btn-ghost btn-small" id="closeIntake">Close</button></div>
 <div class="review-sections"><section><h4>Attendee</h4>${detailRows([['Category',p.category],['Organisation',p.sponsor_name],['Role / appointment',p.role],['Service',p.service],['Discipline',p.discipline],['Mobile',p.mobile],['Post nominals',p.post_nominals]])}</section>
 <section><h4>Accommodation</h4>${detailRows([['Required',p.accommodation_required],['Hotel preference',p.hotel_preference],['From',p.accommodation_from],['To',p.accommodation_to],['Room share',p.share_room],['Sharing with',p.sharing_with],['Evening meals',p.dinners_required],['Dietary requirements',p.dietary_requirements]])}</section>
 <section><h4>Arrival</h4>${detailRows([['Method',p.arrival_method],['Airport / station',p.arrival_airport_station],['Travel number',p.arrival_number],['Date and time',p.arrival_datetime],['Expected in resort',p.arrival_resort_datetime],['Transfer requested',p.arrival_transfer]])}</section>
 <section><h4>Departure</h4>${detailRows([['Method',p.departure_method],['Airport / station',p.departure_airport_station],['Travel number',p.departure_number],['Date and time',p.departure_datetime],['Leave resort',p.departure_resort_datetime],['Transfer requested',p.departure_transfer]])}</section>
 <section><h4>On snow</h4>${detailRows([['Lift pass',p.lift_pass_required],['Carre Neige',p.carre_neige_required],['First ski day',p.first_ski_day],['Last ski day',p.last_ski_day],['Lessons',p.lessons_required],['Lesson type',p.lesson_type],['Lesson dates',p.lesson_dates],['Equipment hire',p.equipment_hire_required],['Boot size',p.boot_size],['Date of birth',p.date_of_birth]])}</section>
 <section><h4>Submission</h4>${detailRows([['Submitted',new Date(row.submitted_at).toLocaleString('en-GB')],['On behalf of attendee',row.submitted_on_behalf],['Submitted by',row.submitter_name],['Submitter email',row.submitter_email],['Other information',p.other_information],['Review notes',row.review_notes]])}</section></div>${actions}</section>`;
 document.querySelector('#closeIntake').onclick=()=>{el.innerHTML='';};
 document.querySelectorAll('[data-intake-decision]').forEach(button=>button.onclick=()=>reviewIntake(row,button.dataset.intakeDecision));
 el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function reviewIntake(row,decision){
 if(!canReviewIntake())return;
 const label=statusLabel(decision);
 if((decision==='accepted'||decision==='rejected')&&!window.confirm(`${label} this registration?`))return;
 const result=document.querySelector('#reviewResult'),buttons=[...document.querySelectorAll('[data-intake-decision]')],notes=document.querySelector('#reviewNotes')?.value||null;
 buttons.forEach(button=>button.disabled=true);result.innerHTML='<div class="notice">Saving review…</div>';
 const {error}=await supabase.rpc('review_intake_submission',{p_submission_id:row.id,p_decision:decision,p_review_notes:notes});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;buttons.forEach(button=>button.disabled=false);return;}
 toast(decision==='accepted'?'Attendee created':'Review saved');
 await loadIntake();
 const detail=document.querySelector('#intakeDetail');if(detail)detail.innerHTML=`<div class="notice success">${decision==='accepted'?'Registration approved and attendee created.':'Registration marked as '+esc(statusLabel(decision).toLowerCase())+'.'}</div>`;
}

function protocolStatusLabel(status){return ({expected:'Expected',confirmed:'Confirmed',declined:'Declined',cancelled:'Cancelled'})[status]||status||'Unknown';}
function protocolStatusClass(status){return status==='confirmed'?'green':(['declined','cancelled'].includes(status)?'red':'purple');}
function canEditProtocol(){return ['admin','protocol','operations'].includes(state.profile?.app_role);}
function selectedOptions(values,current,placeholder='Select…'){
 const items=current&&!values.includes(current)?[current,...values]:values;
 return `<option value="">${placeholder}</option>${items.map(value=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(value)}</option>`).join('')}`;
}

async function loadProtocol(){
 const el=document.querySelector('#protocolTable');if(!el)return;el.textContent='Loading attendees…';
 const {data,error}=await supabase.from('attendees').select('id,attendance_status,category,display_company,title_rank,first_name,surname,known_as,post_nominals,email,mobile,service,discipline,position_role,dietary_requirements,date_of_birth,equipment_hire_required,boot_size,attendee_notes,protocol_notes,data_checked,checked_at,created_at').eq('event_id',EVENT_ID).order('surname').order('first_name').limit(500);
 if(error){el.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;return;}
 state.protocolRows=data||[];renderProtocolRows();
}

function renderProtocolRows(){
 const el=document.querySelector('#protocolTable');if(!el)return;
 const term=state.protocolQuery.trim().toLowerCase();
 const rows=state.protocolRows.filter(a=>!term||[a.first_name,a.surname,a.email,a.display_company,a.category].some(value=>String(value||'').toLowerCase().includes(term)));
 if(!rows.length){el.innerHTML='<div class="empty">No attendees match this view.</div>';return;}
 el.innerHTML=`<div class="table-scroll"><table class="data-table protocol-table"><thead><tr><th>Attendee</th><th>Category</th><th>Organisation</th><th>Attendance</th><th>Data</th><th></th></tr></thead><tbody>${rows.map(a=>`<tr><td><strong>${esc(`${a.title_rank||''} ${a.first_name||''} ${a.surname||''}`.trim())}</strong><br><small>${esc(a.email||'')}</small></td><td>${esc(a.category||'')}</td><td>${esc(a.display_company||'—')}</td><td><span class="status ${protocolStatusClass(a.attendance_status)}">${esc(protocolStatusLabel(a.attendance_status))}</span></td><td><span class="status ${a.data_checked?'green':'amber'}">${a.data_checked?'Checked':'Needs review'}</span></td><td><button class="btn btn-ghost btn-small" data-open-attendee="${a.id}">Open</button></td></tr>`).join('')}</tbody></table></div>`;
 document.querySelectorAll('[data-open-attendee]').forEach(button=>button.onclick=()=>openProtocolAttendee(button.dataset.openAttendee));
}

async function openProtocolAttendee(id){
 const attendee=state.protocolRows.find(item=>item.id===id),el=document.querySelector('#protocolDetail');if(!attendee||!el)return;
 const editable=canEditProtocol(),disabled=editable?'':' disabled';
 el.innerHTML=`<section class="record-panel"><div class="review-heading"><div><span class="status ${protocolStatusClass(attendee.attendance_status)}">${esc(protocolStatusLabel(attendee.attendance_status))}</span><h3>${esc(`${attendee.title_rank||''} ${attendee.first_name||''} ${attendee.surname||''}`.trim())}</h3><p>${esc(attendee.email||'')}</p></div><button class="btn btn-ghost btn-small" id="closeProtocol">Close</button></div>
 <form id="attendeeCoreForm" class="form-grid record-form">
 <div class="form-section"><h3>Core attendee record</h3><p>Changes here are audited and will return the record to “Needs review”.</p></div>
 <div class="field"><label>Attendance status *</label><select name="attendance_status" required${disabled}>${selectedOptions(['expected','confirmed','declined','cancelled'],attendee.attendance_status)}</select></div>
 <div class="field"><label>Category *</label><select name="category" required${disabled}>${selectedOptions(['Military VIP','Military Guest','Sponsor','Sponsor Guest','Royal Party','Committee','Protocol','Hill Team','Other'],attendee.category)}</select></div>
 <div class="field"><label>Rank / title</label><input name="title_rank" value="${esc(attendee.title_rank||'')}"${disabled}></div><div class="field"><label>Known as</label><input name="known_as" value="${esc(attendee.known_as||'')}"${disabled}></div>
 <div class="field"><label>First name *</label><input name="first_name" required value="${esc(attendee.first_name||'')}"${disabled}></div><div class="field"><label>Surname *</label><input name="surname" required value="${esc(attendee.surname||'')}"${disabled}></div>
 <div class="field"><label>Post nominals</label><input name="post_nominals" value="${esc(attendee.post_nominals||'')}"${disabled}></div><div class="field"><label>Organisation / display company</label><input name="display_company" value="${esc(attendee.display_company||'')}"${disabled}></div>
 <div class="field"><label>Role / appointment</label><input name="position_role" value="${esc(attendee.position_role||'')}"${disabled}></div><div class="field"><label>Service</label><select name="service"${disabled}>${selectedOptions(['Royal Navy','British Army','Royal Air Force','Civilian','Other'],attendee.service)}</select></div>
 <div class="field"><label>Discipline</label><select name="discipline"${disabled}>${selectedOptions(['Alpine','Snowboard','Telemark','Nordic','Bobsleigh','Skeleton','Luge','Other','Not competing'],attendee.discipline)}</select></div><div class="field"><label>Email</label><input name="email" type="email" value="${esc(attendee.email||'')}"${disabled}></div>
 <div class="field"><label>Mobile</label><input name="mobile" inputmode="tel" value="${esc(attendee.mobile||'')}"${disabled}></div><div class="field"><label>Date of birth</label><input name="date_of_birth" type="date" value="${esc(attendee.date_of_birth||'')}"${disabled}></div>
 <div class="field checkbox"><input name="equipment_hire_required" id="protocolHire" type="checkbox" ${attendee.equipment_hire_required?'checked':''}${disabled}><label for="protocolHire">Equipment hire information required</label></div><div class="field"><label>Boot size</label><input name="boot_size" value="${esc(attendee.boot_size||'')}"${disabled}></div>
 <div class="field full"><label>Dietary requirements</label><textarea name="dietary_requirements"${disabled}>${esc(attendee.dietary_requirements||'')}</textarea></div>
 <div class="field full"><label>Attendee notes</label><textarea name="attendee_notes"${disabled}>${esc(attendee.attendee_notes||'')}</textarea></div>
 <div class="field full"><label>Protocol notes</label><textarea name="protocol_notes"${disabled}>${esc(attendee.protocol_notes||'')}</textarea></div>
 ${editable?'<div class="field full"><button class="btn btn-primary" id="saveAttendee" type="submit">Save attendee details</button><div id="attendeeSaveResult"></div></div>':'<div class="field full"><div class="notice">You have read-only access to this attendee record.</div></div>'}
 </form><div class="form-section services-heading"><h3>Operational services</h3><p>Requested details are shown alongside confirmed operational records.</p></div><div id="protocolServices" class="empty">Loading accommodation, travel and lift-pass records…</div></section>`;
 document.querySelector('#closeProtocol').onclick=()=>{el.innerHTML='';};
 const form=document.querySelector('#attendeeCoreForm');if(form&&editable)form.onsubmit=event=>saveAttendeeCore(event,attendee.id);
 el.scrollIntoView({behavior:'smooth',block:'start'});
 const [intake,stays,travel,lift]=await Promise.all([
  supabase.from('intake_submissions').select('raw_payload').eq('mapped_attendee_id',id).maybeSingle(),
  supabase.from('stay_charge_periods').select('requested_location,requested_check_in,requested_check_out,actual_check_in,actual_check_out,billing_from,billing_to,package_type,protocol_confirmed,accommodation_locations(name),room_types(name)').eq('attendee_id',id).order('created_at'),
  supabase.from('travel_records').select('direction,method_of_transport,airport_station,flight_travel_number,travel_datetime,resort_datetime,transfer_requested,transfer_service,transfer_chargeable,protocol_confirmed').eq('attendee_id',id).order('direction'),
  supabase.from('lift_passes').select('required,pass_type,start_date,end_date,carre_neige_required,chargeable,pass_days,total_charge,protocol_confirmed').eq('attendee_id',id).maybeSingle()
 ]);
 if(document.querySelector('#protocolServices'))renderProtocolServices(intake.data?.raw_payload||{},stays.data||[],travel.data||[],lift.data||null,[intake.error,stays.error,travel.error,lift.error].filter(Boolean));
}

function renderProtocolServices(request,stays,travel,lift,errors){
 const el=document.querySelector('#protocolServices');if(!el)return;
 if(errors.length){el.innerHTML=`<div class="notice error">Some operational records could not be loaded: ${esc(errors.map(error=>error.message).join('; '))}</div>`;return;}
 const staySummary=stays.length?stays.map(stay=>`<div class="service-record"><span class="status ${stay.protocol_confirmed?'green':'amber'}">${stay.protocol_confirmed?'Confirmed':'Draft'}</span>${detailRows([['Location',stay.accommodation_locations?.name||stay.requested_location],['Room',stay.room_types?.name],['Actual stay',stay.actual_check_in&&stay.actual_check_out?`${stay.actual_check_in} to ${stay.actual_check_out}`:null],['Billing period',stay.billing_from&&stay.billing_to?`${stay.billing_from} to ${stay.billing_to}`:null],['Package',stay.package_type]])}</div>`).join(''):`<span class="status amber">Not assigned</span>${detailRows([['Requested location',request.hotel_preference],['Requested stay',request.accommodation_from&&request.accommodation_to?`${request.accommodation_from} to ${request.accommodation_to}`:null],['Room share',request.share_room],['Sharing with',request.sharing_with],['Evening meals',request.dinners_required]])}`;
 const travelSummary=travel.length?travel.map(item=>`<div class="service-record"><span class="status ${item.protocol_confirmed?'green':'amber'}">${esc(item.direction||'Travel')} · ${item.protocol_confirmed?'Confirmed':'Draft'}</span>${detailRows([['Method',item.method_of_transport],['Airport / station',item.airport_station],['Travel number',item.flight_travel_number],['Travel time',item.travel_datetime],['Resort time',item.resort_datetime],['Transfer requested',item.transfer_requested],['Transfer service',item.transfer_service],['Chargeable',item.transfer_chargeable]])}</div>`).join(''):`<span class="status amber">Not confirmed</span>${detailRows([['Arrival',request.arrival_method],['Arrival point',request.arrival_airport_station],['Arrival number',request.arrival_number],['Arrival time',request.arrival_datetime],['Arrival transfer',request.arrival_transfer],['Departure',request.departure_method],['Departure point',request.departure_airport_station],['Departure number',request.departure_number],['Departure time',request.departure_datetime],['Departure transfer',request.departure_transfer]])}`;
 const liftSummary=lift?`<span class="status ${lift.protocol_confirmed?'green':'amber'}">${lift.protocol_confirmed?'Confirmed':'Draft'}</span>${detailRows([['Required',lift.required],['Pass type',lift.pass_type],['Dates',lift.start_date&&lift.end_date?`${lift.start_date} to ${lift.end_date}`:null],['Carre Neige',lift.carre_neige_required],['Chargeable',lift.chargeable],['Pass days',lift.pass_days],['Total charge',lift.total_charge==null?null:`£${Number(lift.total_charge).toFixed(2)}`]])}`:`<span class="status amber">Not configured</span>${detailRows([['Requested',request.lift_pass_required],['Requested dates',request.first_ski_day&&request.last_ski_day?`${request.first_ski_day} to ${request.last_ski_day}`:null],['Carre Neige',request.carre_neige_required]])}`;
 el.className='ops-grid';el.innerHTML=`<section class="ops-card"><h4>Accommodation</h4>${staySummary}</section><section class="ops-card"><h4>Travel and transfers</h4>${travelSummary}</section><section class="ops-card"><h4>Lift pass</h4>${liftSummary}</section>`;
}

async function saveAttendeeCore(event,id){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=document.querySelector('#saveAttendee'),result=document.querySelector('#attendeeSaveResult');
 button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc('update_attendee_core',{
  p_attendee_id:id,p_attendance_status:body.attendance_status,p_category:body.category,p_display_company:body.display_company||null,p_title_rank:body.title_rank||null,p_first_name:body.first_name,p_surname:body.surname,p_known_as:body.known_as||null,p_post_nominals:body.post_nominals||null,p_email:body.email||null,p_mobile:body.mobile||null,p_service:body.service||null,p_discipline:body.discipline||null,p_position_role:body.position_role||null,p_dietary_requirements:body.dietary_requirements||null,p_date_of_birth:body.date_of_birth||null,p_equipment_hire_required:!!body.equipment_hire_required,p_boot_size:body.boot_size||null,p_attendee_notes:body.attendee_notes||null,p_protocol_notes:body.protocol_notes||null
 });
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Save attendee details';return;}
 toast('Attendee details saved');await loadProtocol();openProtocolAttendee(id);
}

async function loadSponsors(){
 const el=document.querySelector('#sponsorTable');if(!el)return;const {data,error}=await supabase.from('event_sponsors').select('id,sponsor_status,room_allocation,active,organisations(organisation_name,short_name)').eq('event_id',EVENT_ID).order('created_at');
 if(error){el.innerHTML=`<div class="notice error">${error.message}</div>`;return}if(!data?.length){el.innerHTML='<div class="empty">No event sponsors have been added yet.</div>';return}
 el.innerHTML=`<div class="table-scroll"><table class="data-table"><thead><tr><th>Organisation</th><th>Status</th><th>Rooms</th><th>Active</th></tr></thead><tbody>${data.map(r=>`<tr><td>${esc(r.organisations?.organisation_name||'')}</td><td>${esc(r.sponsor_status||'')}</td><td>${r.room_allocation??0}</td><td>${r.active?'Yes':'No'}</td></tr>`).join('')}</tbody></table></div>`;
}
async function loadInvoices(){
 const el=document.querySelector('#invoiceTable');if(!el)return;const {data,error}=await supabase.from('invoices').select('invoice_reference,status,gross_total,issue_date').eq('event_id',EVENT_ID).order('created_at',{ascending:false}).limit(100);
 if(error){el.innerHTML=`<div class="notice error">${error.message}</div>`;return}if(!data?.length){el.innerHTML='<div class="empty">No invoices yet.</div>';return}
 el.innerHTML=`<div class="table-scroll"><table class="data-table"><thead><tr><th>Reference</th><th>Status</th><th>Gross</th><th>Issue date</th></tr></thead><tbody>${data.map(r=>`<tr><td>${esc(r.invoice_reference||'Draft')}</td><td>${esc(r.status||'')}</td><td>£${Number(r.gross_total||0).toFixed(2)}</td><td>${esc(r.issue_date||'')}</td></tr>`).join('')}</tbody></table></div>`;
}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

window.addEventListener('hashchange',()=>{
 if(authLanding && !location.hash.startsWith('#/')) return;
 const route=location.hash.replace('#/','');state.route=ROUTES.has(route)?route:'home';render();
});

function finishAuthLanding(){
 if(!authLanding)return;
 authLanding=false;state.route='staff';history.replaceState(null,'',`${location.pathname}#/staff`);
}

// Render the public experience before connecting to the remote data service.
// This prevents a slow or blocked dependency/session request from leaving a blank page.
render();

async function initialiseBackend(){
 try{
  const {createClient}=await import('/supabase-client.js');
  supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await supabase.auth.getSession();state.session=session;if(session)finishAuthLanding();await loadProfile();
  supabase.auth.onAuthStateChange(async(_event,nextSession)=>{state.session=nextSession;if(nextSession)finishAuthLanding();await loadProfile();if(state.route==='staff')render();});
  if(state.route==='staff')render();
 }catch(error){
  console.error('Secure service connection failed',error);
  if(state.route==='staff')toast('The secure staff service is currently unavailable.');
 }
}

initialiseBackend();
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
