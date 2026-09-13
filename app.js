const SUPABASE_URL = 'https://apugxrwhiyvwcrpzvgxj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WoZaQe5QeUDLb764uMWEtw_78rsp8Mi';
const EVENT_ID = '9c1c1d5e-d9f1-4f6b-b323-f3c35261fc19';
let supabase = null;

const ROUTES = new Set(['home','register','event','staff']);
const isAuthCallback = (hash=location.hash)=>/(?:^#|[&#])(access_token|refresh_token|error|error_code)=/.test(hash);
let authLanding = new URLSearchParams(location.search).get('next')==='staff' || isAuthCallback();
const hashRoute = location.hash.replace('#/','');
const state = { route: authLanding ? 'staff' : (ROUTES.has(hashRoute) ? hashRoute : 'home'), session:null, profile:null, staffTab:'overview' };
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
if(state.staffTab==='intake') return `<div class="surface"><div class="surface-head"><strong>Pending web registrations</strong><button class="btn btn-ghost" id="refreshIntake">Refresh</button></div><div class="surface-body"><div id="intakeTable" class="empty">Loading registrations…</div></div></div>`;
if(state.staffTab==='protocol') return `<div class="grid grid-3"><div class="card"><div class="icon">🏨</div><h3>Accommodation</h3><p>Manage assigned location, room type, stay segments and approved exceptions.</p></div><div class="card"><div class="icon">🚌</div><h3>Travel & transfers</h3><p>Confirm arrival/departure details and chargeable transfer services.</p></div><div class="card"><div class="icon">🎿</div><h3>Lift passes & usage</h3><p>Confirm pass dates, Carre Neige and daily extras.</p></div></div><section class="section"><div class="notice">The database structures are already in place. The next interface build will add editable attendee records and rate-assisted selectors here.</div></section>`;
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
 if(state.staffTab==='sponsors') loadSponsors();
 if(state.staffTab==='finance') loadInvoices();
}
async function loadIntake(){
 const el=document.querySelector('#intakeTable');if(!el)return;el.textContent='Loading registrations…';
 const {data,error}=await supabase.from('intake_submissions').select('id,submitted_at,attendee_email,processing_status,raw_payload').eq('event_id',EVENT_ID).order('submitted_at',{ascending:false}).limit(100);
 if(error){el.innerHTML=`<div class="notice error">${error.message}</div>`;return} if(!data?.length){el.innerHTML='<div class="empty">No registrations yet.</div>';return}
 el.innerHTML=`<div class="table-scroll"><table class="data-table"><thead><tr><th>Attendee</th><th>Category</th><th>Submitted</th><th>Status</th></tr></thead><tbody>${data.map(r=>`<tr><td><strong>${esc(`${r.raw_payload?.first_name||''} ${r.raw_payload?.surname||''}`)}</strong><br><small>${esc(r.attendee_email||'')}</small></td><td>${esc(r.raw_payload?.category||'')}</td><td>${new Date(r.submitted_at).toLocaleString('en-GB')}</td><td><span class="status amber">${esc(r.processing_status)}</span></td></tr>`).join('')}</tbody></table></div>`;
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
