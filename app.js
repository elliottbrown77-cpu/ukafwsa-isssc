const SUPABASE_URL = 'https://apugxrwhiyvwcrpzvgxj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WoZaQe5QeUDLb764uMWEtw_78rsp8Mi';
const EVENT_ID = '9c1c1d5e-d9f1-4f6b-b323-f3c35261fc19';
const TRAVEL_DATE_START = '2027-01-27';
const TRAVEL_DATE_END = '2027-02-09';
let supabase = null;

const ROUTES = new Set(['home','register','event','staff']);
const isAuthCallback = (hash=location.hash)=>/(?:^#|[&#])(access_token|refresh_token|error|error_code)=/.test(hash);
let authLanding = new URLSearchParams(location.search).get('next')==='staff' || isAuthCallback();
const hashRoute = location.hash.replace('#/','');
const state = { route: authLanding ? 'staff' : (ROUTES.has(hashRoute) ? hashRoute : 'home'), session:null, profile:null, staffTab:'overview', intakeFilter:'pending', intakeRows:[], protocolRows:[], protocolQuery:'', protocolLookups:{locations:[],rooms:[],rates:[],organisations:[]}, sponsorRows:[], sponsorContacts:[], sponsorInvitations:[], sponsorAttendees:[], sponsorAllocations:[], sponsorQuery:'', selectedSponsorId:null, selectedSponsorContactId:null, newSponsor:false, financeReadiness:[], financeSummaries:[], financeAttendees:[], financeOrganisations:[], financeSponsors:[], financeInvoices:[], financeLines:[], financeRates:[], financePackages:[], financeTravel:[], financeQuery:'', financeFilter:'all', financeRateQuery:'', financeRateGroup:'all', selectedFinanceRateId:null, selectedFinanceAttendeeId:null, selectedInvoiceId:null };
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
<div class="field"><label>Flight / travel number</label><input name="arrival_number"></div>${dateTimeField('arrival_datetime','Arrival date and time','','')}
${dateTimeField('arrival_resort_datetime','Expected in resort date and time','','')}<div class="field checkbox"><input type="checkbox" name="arrival_transfer" id="arrTransfer"><label for="arrTransfer">Request UKAFWSA arrival transfer</label></div>
<div class="form-section"><h3>Departure</h3></div>
<div class="field"><label>Method</label><select name="departure_method">${opts(['Flight','Train','Drive','Coach','Other'])}</select></div><div class="field"><label>Airport / station</label><input name="departure_airport_station"></div>
<div class="field"><label>Flight / travel number</label><input name="departure_number"></div>${dateTimeField('departure_datetime','Departure date and time','','')}
${dateTimeField('departure_resort_datetime','Leave resort date and time','','')}<div class="field checkbox"><input type="checkbox" name="departure_transfer" id="depTransfer"><label for="depTransfer">Request UKAFWSA departure transfer</label></div>
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
if(state.staffTab==='sponsors') return `<div class="surface"><div class="surface-head"><div><strong>Event sponsors</strong><div class="muted small">Manage sponsor terms, billing details, contacts, invitations and attendee accounts.</div></div><div class="sponsor-tools"><input id="sponsorSearch" type="search" placeholder="Find sponsor" value="${esc(state.sponsorQuery)}"><button class="btn btn-ghost" id="refreshSponsors">Refresh</button>${canEditSponsors()?'<button class="btn btn-primary" id="addSponsor">Add sponsor</button>':''}</div></div><div class="surface-body"><div id="sponsorMetrics"></div><div id="sponsorTable" class="empty">Loading sponsors…</div><div id="sponsorDetail"></div></div></div>`;
if(state.staffTab==='finance') return `<div id="financeMetrics" class="grid grid-4"><div class="card metric"><strong>—</strong><span>Ready for invoice</span></div><div class="card metric"><strong>—</strong><span>Blocked</span></div><div class="card metric"><strong>—</strong><span>Draft invoices</span></div><div class="card metric"><strong>—</strong><span>Draft value</span></div></div>
<section class="section"><div class="notice"><strong>Invoice snapshots are protected.</strong> Rate changes update current calculations and mark open drafts for rebuilding. Confirmed, issued and paid invoice lines retain the values captured when they were confirmed.</div></section>
<section class="section"><div class="surface"><div class="surface-head"><div><strong>2027 rate card</strong><div class="muted small">Maintain the confirmed prices used for current calculations and future invoice drafts.</div></div><div class="finance-tools"><input id="financeRateSearch" type="search" placeholder="Find rate" value="${esc(state.financeRateQuery)}"><select id="financeRateGroup" aria-label="Rate category"><option value="all">All rates</option><option value="accommodation">Accommodation</option><option value="passes">Lift passes</option><option value="transfers">Transfers and admin</option><option value="hospitality">Dining and champagne</option><option value="lessons">Lessons</option></select></div></div><div class="surface-body"><div id="financeRateTable" class="empty">Loading rate card…</div><div id="financeRateDetail"></div></div></div></section>
<section class="section"><div class="surface"><div class="surface-head"><div><strong>Attendee billing readiness</strong><div class="muted small">Resolve each blocker before creating an individual or consolidated draft.</div></div><div class="finance-tools"><input id="financeSearch" type="search" placeholder="Find attendee or account" value="${esc(state.financeQuery)}"><select id="financeFilter" aria-label="Readiness filter"><option value="all">All attendees</option><option value="ready">Ready</option><option value="blocked">Blocked</option><option value="consolidated">Consolidated</option></select><button class="btn btn-ghost" id="refreshFinance">Refresh</button></div></div><div class="surface-body"><div id="financeReadiness" class="empty">Loading billing readiness…</div><div id="financeAttendeeDetail"></div></div></div></section>
<section class="section"><div class="surface"><div class="surface-head"><div><strong>Consolidated sponsor accounts</strong><div class="muted small">Only attendees explicitly linked for consolidated billing are included.</div></div></div><div class="surface-body"><div id="financeConsolidated" class="empty">Loading sponsor accounts…</div></div></div></section>
<section class="section"><div class="surface"><div class="surface-head"><div><strong>Invoice drafts</strong><div class="muted small">Open a draft to review its immutable charge-line snapshot.</div></div></div><div class="surface-body"><div id="invoiceTable" class="empty">Loading invoices…</div><div id="invoiceDetail"></div></div></div></section>`;
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
  const sponsorRefresh=document.querySelector('#refreshSponsors');if(sponsorRefresh)sponsorRefresh.onclick=loadSponsors;
  const sponsorSearch=document.querySelector('#sponsorSearch');if(sponsorSearch)sponsorSearch.oninput=()=>{state.sponsorQuery=sponsorSearch.value;renderSponsorRows();};
  const addSponsor=document.querySelector('#addSponsor');if(addSponsor)addSponsor.onclick=()=>{state.newSponsor=true;state.selectedSponsorId=null;state.selectedSponsorContactId=null;renderSponsorDetail();};
  const financeRefresh=document.querySelector('#refreshFinance');if(financeRefresh)financeRefresh.onclick=loadInvoices;
  const financeSearch=document.querySelector('#financeSearch');if(financeSearch)financeSearch.oninput=()=>{state.financeQuery=financeSearch.value;renderFinanceReadiness();};
  const financeFilter=document.querySelector('#financeFilter');if(financeFilter){financeFilter.value=state.financeFilter;financeFilter.onchange=()=>{state.financeFilter=financeFilter.value;renderFinanceReadiness();};}
  const financeRateSearch=document.querySelector('#financeRateSearch');if(financeRateSearch)financeRateSearch.oninput=()=>{state.financeRateQuery=financeRateSearch.value;renderFinanceRates();};
  const financeRateGroup=document.querySelector('#financeRateGroup');if(financeRateGroup){financeRateGroup.value=state.financeRateGroup;financeRateGroup.onchange=()=>{state.financeRateGroup=financeRateGroup.value;renderFinanceRates();};}
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
 const registrationDateTimes=[['arrival_datetime','arrival'],['arrival_resort_datetime','expected resort arrival'],['departure_datetime','departure'],['departure_resort_datetime','resort departure']];
 const incomplete=registrationDateTimes.find(([name])=>incompleteDateTime(body,name));
 if(incomplete){result.innerHTML=`<div class="notice error">Choose both a date and time for the ${incomplete[1]}.</div>`;return;}
 registrationDateTimes.forEach(([name])=>{body[name]=joinedDateTime(body,name);delete body[`${name}_date`];delete body[`${name}_time`];});
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
 const [attendees,locations,rooms,rates,organisations]=await Promise.all([
  supabase.from('attendees').select('id,attendance_status,category,display_company,organisation_id,title_rank,first_name,surname,known_as,post_nominals,email,mobile,service,discipline,position_role,dietary_requirements,date_of_birth,equipment_hire_required,boot_size,attendee_notes,protocol_notes,data_checked,checked_at,created_at').eq('event_id',EVENT_ID).order('surname').order('first_name').limit(500),
  supabase.from('accommodation_locations').select('id,name,location_type').eq('active',true).order('name'),
  supabase.from('room_types').select('id,location_id,name,occupancy_class,meal_basis').eq('active',true).order('name'),
  supabase.from('rate_card').select('rate_code,description,charge_category,location_id,room_type_id,unit,unit_price,status').eq('event_id',EVENT_ID).eq('active',true).in('charge_category',['accommodation','lift_pass']).order('description'),
  supabase.from('organisations').select('id,organisation_name').eq('active',true).order('organisation_name')
 ]);
 const errors=[attendees.error,locations.error,rooms.error,rates.error,organisations.error].filter(Boolean);
 if(errors.length){el.innerHTML=`<div class="notice error">${esc(errors.map(error=>error.message).join('; '))}</div>`;return;}
 state.protocolRows=attendees.data||[];
 state.protocolLookups={locations:locations.data||[],rooms:rooms.data||[],rates:rates.data||[],organisations:organisations.data||[]};
 renderProtocolRows();
}

function renderProtocolRows(){
 const el=document.querySelector('#protocolTable');if(!el)return;
 const term=state.protocolQuery.trim().toLowerCase();
 const rows=state.protocolRows.filter(a=>!term||[a.first_name,a.surname,a.email,attendeeOrganisationName(a),a.category].some(value=>String(value||'').toLowerCase().includes(term)));
 if(!rows.length){el.innerHTML='<div class="empty">No attendees match this view.</div>';return;}
 el.innerHTML=`<div class="table-scroll"><table class="data-table protocol-table"><thead><tr><th>Attendee</th><th>Category</th><th>Organisation</th><th>Attendance</th><th>Data</th><th></th></tr></thead><tbody>${rows.map(a=>`<tr><td><strong>${esc(`${a.title_rank||''} ${a.first_name||''} ${a.surname||''}`.trim())}</strong><br><small>${esc(a.email||'')}</small></td><td>${esc(a.category||'')}</td><td>${esc(attendeeOrganisationName(a)||'—')}</td><td><span class="status ${protocolStatusClass(a.attendance_status)}">${esc(protocolStatusLabel(a.attendance_status))}</span></td><td><span class="status ${a.data_checked?'green':'amber'}">${a.data_checked?'Checked':'Needs review'}</span></td><td><button class="btn btn-ghost btn-small" data-open-attendee="${a.id}">Open</button></td></tr>`).join('')}</tbody></table></div>`;
 document.querySelectorAll('[data-open-attendee]').forEach(button=>button.onclick=()=>openProtocolAttendee(button.dataset.openAttendee));
}

function attendeeOrganisationName(attendee){return state.protocolLookups.organisations.find(org=>org.id===attendee.organisation_id)?.organisation_name||attendee.display_company;}

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
  supabase.from('stay_charge_periods').select('id,location_id,room_type_id,sharing_with_attendee_id,requested_location,requested_check_in,requested_check_out,requested_room_share,requested_share_with,requested_dinners,actual_check_in,actual_check_out,billing_from,billing_to,package_type,rate_code,billable_nights,unit_rate,accommodation_charge,approved_exception,exception_notes,protocol_confirmed,accommodation_locations(name),room_types(name)').eq('attendee_id',id).order('created_at'),
  supabase.from('travel_records').select('id,direction,method_of_transport,airport_station,flight_travel_number,travel_datetime,resort_datetime,transfer_requested,transfer_service,transfer_chargeable,special_transfer_datetime,assignment_notes,protocol_confirmed,billing_reviewed').eq('attendee_id',id).order('direction'),
  supabase.from('lift_passes').select('id,required,pass_type,start_date,end_date,carre_neige_required,chargeable,rate_code,unit_rate,pass_days,total_charge,protocol_confirmed,notes').eq('attendee_id',id).maybeSingle()
 ]);
 if(document.querySelector('#protocolServices'))renderProtocolServices(intake.data?.raw_payload||{},stays.data||[],travel.data||[],lift.data||null,[intake.error,stays.error,travel.error,lift.error].filter(Boolean),attendee);
}

function dateTimeLocalValue(value){
 if(!value)return'';
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return value;
 const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value).slice(0,16);
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).reduce((out,part)=>(out[part.type]=part.value,out),{});
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function eventTimestamp(value){return value?`${value}${value.length===16?':00':''}+01:00`:null;}
function dateRange(start,end){
 const dates=[],cursor=new Date(`${start}T00:00:00Z`),last=new Date(`${end}T00:00:00Z`);
 while(cursor<=last){dates.push(cursor.toISOString().slice(0,10));cursor.setUTCDate(cursor.getUTCDate()+1);}
 return dates;
}
const TRAVEL_DATES=dateRange(TRAVEL_DATE_START,TRAVEL_DATE_END);
function displayEventDate(value){
 const date=new Date(`${value}T00:00:00Z`);
 return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(date);
}
function eventDateOptions(current){
 const dates=current&&!TRAVEL_DATES.includes(current)?[current,...TRAVEL_DATES]:TRAVEL_DATES;
 return `<option value="">Select date…</option>${dates.map(date=>`<option value="${date}" ${date===current?'selected':''}>${esc(displayEventDate(date))}${!TRAVEL_DATES.includes(date)?' · outside event window':''}</option>`).join('')}`;
}
function dateTimeField(name,label,value,disabled){
 const local=dateTimeLocalValue(value),date=local.slice(0,10),time=local.slice(11,16);
 return `<div class="field"><label>${label}</label><div class="date-time-pair"><select name="${name}_date" aria-label="${label} date"${disabled}>${eventDateOptions(date)}</select><input type="time" step="300" name="${name}_time" aria-label="${label} time" value="${esc(time)}"${disabled}></div><small>27 Jan–9 Feb 2027</small></div>`;
}
function joinedDateTime(body,name){
 const date=body[`${name}_date`]||'',time=body[`${name}_time`]||'';
 return date&&time?`${date}T${time}`:null;
}
function incompleteDateTime(body,name){return !!body[`${name}_date`]!==!!body[`${name}_time`];}
function money(value){return value==null?'—':`£${Number(value).toFixed(2)}`;}
function formatDate(value){if(!value)return'—';const date=new Date(value);return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(date);}
function formatDateTime(value){if(!value)return'—';const date=new Date(value);return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'}).format(date);}
function lookupOptions(rows,current,label,placeholder='Select…'){
 const items=current&&!rows.some(row=>row.id===current)?[{id:current,name:'Current selection'},...rows]:rows;
 return `<option value="">${placeholder}</option>${items.map(row=>`<option value="${esc(row.id)}" ${row.id===current?'selected':''}>${esc(label(row))}</option>`).join('')}`;
}
function roomOptions(locationId,current){
 const rooms=state.protocolLookups.rooms.filter(room=>!locationId||room.location_id===locationId);
 return lookupOptions(rooms,current,room=>`${room.name}${room.meal_basis?` · ${room.meal_basis}`:''}`,'Select room type…');
}
function rateOptions(category,locationId,roomId,current){
 let rates=state.protocolLookups.rates.filter(rate=>rate.charge_category===category);
 if(category==='accommodation')rates=locationId&&roomId?rates.filter(rate=>rate.location_id===locationId&&rate.room_type_id===roomId):[];
 if(current&&!rates.some(rate=>rate.rate_code===current)){
  const selected=state.protocolLookups.rates.find(rate=>rate.rate_code===current);if(selected)rates=[selected,...rates];
 }
 return `<option value="">${category==='accommodation'&&(!locationId||!roomId)?'Select accommodation and room first…':'Select rate…'}</option>${rates.map(rate=>`<option value="${esc(rate.rate_code)}" ${rate.rate_code===current?'selected':''}>${esc(rate.description)} · ${money(rate.unit_price)}${rate.status==='approved'?'':' · proposed'}</option>`).join('')}`;
}
function attendeeOptions(current,exclude){
 return `<option value="">Not recorded</option>${state.protocolRows.filter(a=>a.id!==exclude).map(a=>`<option value="${a.id}" ${a.id===current?'selected':''}>${esc(`${a.title_rank||''} ${a.first_name||''} ${a.surname||''}`.trim())}</option>`).join('')}`;
}
function stayForm(stay,request,attendeeId){
 const editable=canEditProtocol(),disabled=editable?'':' disabled';
 const requestedLocation=state.protocolLookups.locations.find(location=>location.name.toLowerCase()===String(request.hotel_preference||'').toLowerCase());
 const locationId=stay?(stay.location_id||''):(requestedLocation?.id||''),roomId=stay?(stay.room_type_id||''):'';
 const checkIn=stay?(stay.actual_check_in||''):(request.accommodation_from||''),checkOut=stay?(stay.actual_check_out||''):(request.accommodation_to||'');
 const billingFrom=stay?(stay.billing_from||''):checkIn,billingTo=stay?(stay.billing_to||''):checkOut;
 return `<form class="service-form stay-form" data-stay-id="${stay?.id||''}"><div class="service-form-head"><div><span class="status ${stay?.protocol_confirmed?'green':'amber'}">${stay?.protocol_confirmed?'Confirmed':'Draft'}</span><strong>${esc(stay?.accommodation_locations?.name||'Accommodation period')}</strong></div>${stay?`<small>${stay.billable_nights??0} nights · ${money(stay.accommodation_charge)}</small>`:'<small>New period</small>'}</div>
 <div class="form-grid compact-grid"><div class="field"><label>Accommodation</label><select name="location_id"${disabled}>${lookupOptions(state.protocolLookups.locations,locationId,row=>row.name,'Select accommodation…')}</select></div><div class="field"><label>Room / charging role</label><select name="room_type_id"${disabled}>${roomOptions(locationId,roomId)}</select></div>
 <div class="field"><label>Actual check-in</label><input type="date" name="actual_check_in" value="${esc(checkIn)}"${disabled}></div><div class="field"><label>Actual check-out</label><input type="date" name="actual_check_out" value="${esc(checkOut)}"${disabled}></div>
 <div class="field"><label>Billing from</label><input type="date" name="billing_from" value="${esc(billingFrom)}"${disabled}></div><div class="field"><label>Billing to</label><input type="date" name="billing_to" value="${esc(billingTo)}"${disabled}></div>
 <div class="field"><label>Sharing with attendee</label><select name="sharing_with_attendee_id"${disabled}>${attendeeOptions(stay?.sharing_with_attendee_id||'',attendeeId)}</select></div><div class="field"><label>Accommodation rate</label><select name="rate_code"${disabled}>${rateOptions('accommodation',locationId,roomId,stay?.rate_code||'')}</select></div>
 <div class="field checkbox full"><input type="checkbox" name="protocol_confirmed" ${stay?.protocol_confirmed?'checked':''}${disabled}><div><label>Protocol confirmed</label><small>Confirmation requires a matching rate and complete dates.</small></div></div></div>
 ${editable?'<div class="service-actions"><button class="btn btn-primary" type="submit">Save accommodation</button><div class="service-save-result"></div></div>':''}</form>`;
}
function travelForm(direction,record,request){
 const editable=canEditProtocol(),disabled=editable?'':' disabled',title=direction==='arrival'?'Arrival':'Departure';
 const key=direction==='arrival'?'arrival':'departure';
 const method=record?(record.method_of_transport||''):(request[`${key}_method`]||''),point=record?(record.airport_station||''):(request[`${key}_airport_station`]||''),number=record?(record.flight_travel_number||''):(request[`${key}_number`]||'');
 const travelTime=record?(record.travel_datetime||''):(request[`${key}_datetime`]||''),resortTime=record?(record.resort_datetime||''):(request[`${key}_resort_datetime`]||'');
 const transfer=record?record.transfer_requested:!!request[`${key}_transfer`];
 return `<form class="service-form travel-form" data-direction="${direction}"><div class="service-form-head"><div><span class="status ${record?.protocol_confirmed?'green':'amber'}">${record?.protocol_confirmed?'Confirmed':'Draft'}</span><strong>${title}</strong></div>${record?.billing_reviewed?'<small>Billing reviewed</small>':''}</div>
 <div class="form-grid compact-grid"><div class="field"><label>Method</label><select name="method_of_transport"${disabled}>${selectedOptions(['Flight','Train','Drive','Coach','Other'],method)}</select></div><div class="field"><label>Airport / station</label><input name="airport_station" value="${esc(point)}"${disabled}></div>
 <div class="field"><label>Flight / travel number</label><input name="flight_travel_number" value="${esc(number)}"${disabled}></div>${dateTimeField('travel_datetime',`${title} local date and time`,travelTime,disabled)}
 ${dateTimeField('resort_datetime',`${direction==='arrival'?'Expected in resort':'Leave resort'} local date and time`,resortTime,disabled)}${dateTimeField('special_transfer_datetime','Special transfer date and time',record?.special_transfer_datetime||'',disabled)}
 <div class="field checkbox"><input type="checkbox" name="transfer_requested" ${transfer?'checked':''}${disabled}><label>UKAFWSA transfer required</label></div><div class="field"><label>Transfer service</label><select name="transfer_service"${disabled}>${selectedOptions(['Shared coach','Shared taxi','Private taxi','Own transport','Not required','Other'],record?.transfer_service||'')}</select></div>
 <div class="field checkbox"><input type="checkbox" name="transfer_chargeable" ${record?.transfer_chargeable?'checked':''}${disabled}><label>Chargeable transfer</label></div><div class="field checkbox"><input type="checkbox" name="protocol_confirmed" ${record?.protocol_confirmed?'checked':''}${disabled}><label>Protocol confirmed</label></div>
 <div class="field full"><label>Assignment notes</label><textarea name="assignment_notes"${disabled}>${esc(record?.assignment_notes||'')}</textarea></div></div>
 ${editable?`<div class="service-actions"><button class="btn btn-primary" type="submit">Save ${title.toLowerCase()}</button><div class="service-save-result"></div></div>`:''}</form>`;
}
function liftForm(lift,request){
 const editable=canEditProtocol(),disabled=editable?'':' disabled';
 const required=lift?lift.required:!!request.lift_pass_required,carre=lift?lift.carre_neige_required:(request.carre_neige_required!==false);
 const start=lift?(lift.start_date||''):(request.first_ski_day||''),end=lift?(lift.end_date||''):(request.last_ski_day||'');
 return `<form class="service-form lift-form" data-lift-id="${lift?.id||''}"><div class="service-form-head"><div><span class="status ${lift?.protocol_confirmed?'green':'amber'}">${lift?.protocol_confirmed?'Confirmed':'Draft'}</span><strong>Lift pass</strong></div>${lift?`<small>${lift.pass_days??0} days · ${money(lift.total_charge)}</small>`:'<small>Not yet configured</small>'}</div>
 <div class="form-grid compact-grid"><div class="field checkbox"><input type="checkbox" name="required" ${required?'checked':''}${disabled}><label>Lift pass required</label></div><div class="field checkbox"><input type="checkbox" name="carre_neige_required" ${carre?'checked':''}${disabled}><label>Carre Neige required</label></div>
 <div class="field"><label>First ski day</label><input type="date" name="start_date" value="${esc(start)}" min="2027-01-30" max="2027-02-06"${disabled}></div><div class="field"><label>Last ski day</label><input type="date" name="end_date" value="${esc(end)}" min="2027-01-30" max="2027-02-06"${disabled}></div>
 <div class="field checkbox"><input type="checkbox" name="chargeable" ${(lift?lift.chargeable:true)?'checked':''}${disabled}><label>Chargeable</label></div><div class="field"><label>Lift-pass rate (automatic if blank)</label><select name="rate_code"${disabled}>${rateOptions('lift_pass',null,null,lift?.rate_code||'')}</select></div>
 <div class="field checkbox full"><input type="checkbox" name="protocol_confirmed" ${lift?.protocol_confirmed?'checked':''}${disabled}><label>Protocol confirmed</label></div><div class="field full"><label>Lift-pass notes</label><textarea name="notes"${disabled}>${esc(lift?.notes||'')}</textarea></div></div>
 ${editable?'<div class="service-actions"><button class="btn btn-primary" type="submit">Save lift pass</button><div class="service-save-result"></div></div>':''}</form>`;
}
function renderProtocolServices(request,stays,travel,lift,errors,attendee){
 const el=document.querySelector('#protocolServices');if(!el)return;
 if(errors.length){el.innerHTML=`<div class="notice error">Some operational records could not be loaded: ${esc(errors.map(error=>error.message).join('; '))}</div>`;return;}
 const arrival=travel.find(item=>item.direction==='arrival'),departure=travel.find(item=>item.direction==='departure');
 el.className='ops-stack';el.innerHTML=`<div class="requested-summary"><strong>Original request</strong>${detailRows([['Accommodation',request.accommodation_required],['Hotel preference',request.hotel_preference],['Requested stay',request.accommodation_from&&request.accommodation_to?`${request.accommodation_from} to ${request.accommodation_to}`:null],['Room share',request.share_room],['Sharing with',request.sharing_with],['Lift pass',request.lift_pass_required]])}</div>
 <section class="service-group"><div class="service-group-head"><div><h4>Accommodation</h4><p>Each period is separately assigned and rated.</p></div>${canEditProtocol()?'<button class="btn btn-ghost btn-small" id="addStayPeriod">Add period</button>':''}</div><div id="stayForms" class="service-form-list">${(stays.length?stays:[null]).map(stay=>stayForm(stay,request,attendee.id)).join('')}</div></section>
 <section class="service-group"><div class="service-group-head"><div><h4>Travel and transfers</h4><p>Times are entered in local Méribel/Geneva time.</p></div></div><div class="travel-grid">${travelForm('arrival',arrival,request)}${travelForm('departure',departure,request)}</div></section>
 <section class="service-group"><div class="service-group-head"><div><h4>Lift pass</h4><p>The selected event rate is calculated from confirmed dates and Carre Neige selection.</p></div></div>${liftForm(lift,request)}</section>`;
 if(canEditProtocol())bindProtocolServiceForms(attendee.id,request);
}
function bindProtocolServiceForms(attendeeId,request){
 document.querySelectorAll('.stay-form').forEach(form=>{
  form.onsubmit=event=>saveProtocolStay(event,attendeeId);
  const location=form.elements.location_id,room=form.elements.room_type_id,rate=form.elements.rate_code;
  location.onchange=()=>{room.innerHTML=roomOptions(location.value,'');rate.innerHTML=rateOptions('accommodation',location.value,'','');};
  room.onchange=()=>{rate.innerHTML=rateOptions('accommodation',location.value,room.value,'');};
 });
 document.querySelectorAll('.travel-form').forEach(form=>form.onsubmit=event=>saveProtocolTravel(event,attendeeId));
 const lift=document.querySelector('.lift-form');if(lift){lift.onsubmit=event=>saveProtocolLift(event,attendeeId);lift.elements.carre_neige_required.onchange=()=>{lift.elements.rate_code.value='';};}
 const add=document.querySelector('#addStayPeriod');if(add)add.onclick=()=>{document.querySelector('#stayForms').insertAdjacentHTML('beforeend',stayForm(null,{},attendeeId));bindProtocolServiceForms(attendeeId,request);};
}
async function serviceSave(form,rpc,params,message,attendeeId){
 const button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result'),label=button.textContent;button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc(rpc,params);
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent=label;return;}
 toast(message);await openProtocolAttendee(attendeeId);
}
function saveProtocolStay(event,attendeeId){
 event.preventDefault();const form=event.currentTarget,body=formObject(form);
 if(!form.dataset.stayId&&![body.location_id,body.actual_check_in,body.actual_check_out,body.billing_from,body.billing_to].some(Boolean)){form.querySelector('.service-save-result').innerHTML='<div class="notice error">Enter the accommodation or dates before saving a new period.</div>';return;}
 return serviceSave(form,'save_protocol_stay',{p_attendee_id:attendeeId,p_stay_id:form.dataset.stayId||null,p_location_id:body.location_id||null,p_room_type_id:body.room_type_id||null,p_sharing_with_attendee_id:body.sharing_with_attendee_id||null,p_actual_check_in:body.actual_check_in||null,p_actual_check_out:body.actual_check_out||null,p_billing_from:body.billing_from||null,p_billing_to:body.billing_to||null,p_rate_code:body.rate_code||null,p_protocol_confirmed:!!body.protocol_confirmed},'Accommodation saved',attendeeId);
}
function saveProtocolTravel(event,attendeeId){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),direction=form.dataset.direction;
 const dateTimes=[['travel_datetime',direction==='arrival'?'arrival':'departure'],['resort_datetime',direction==='arrival'?'expected resort arrival':'resort departure'],['special_transfer_datetime','special transfer']];
 const incomplete=dateTimes.find(([name])=>incompleteDateTime(body,name));
 if(incomplete){form.querySelector('.service-save-result').innerHTML=`<div class="notice error">Choose both a date and time for the ${incomplete[1]}.</div>`;return;}
 return serviceSave(form,'save_protocol_travel',{p_attendee_id:attendeeId,p_direction:direction,p_method_of_transport:body.method_of_transport||null,p_airport_station:body.airport_station||null,p_flight_travel_number:body.flight_travel_number||null,p_travel_datetime:eventTimestamp(joinedDateTime(body,'travel_datetime')),p_resort_datetime:eventTimestamp(joinedDateTime(body,'resort_datetime')),p_transfer_requested:!!body.transfer_requested,p_transfer_service:body.transfer_service||null,p_transfer_chargeable:!!body.transfer_chargeable,p_special_transfer_datetime:eventTimestamp(joinedDateTime(body,'special_transfer_datetime')),p_assignment_notes:body.assignment_notes||null,p_protocol_confirmed:!!body.protocol_confirmed},`${direction==='arrival'?'Arrival':'Departure'} saved`,attendeeId);
}
function saveProtocolLift(event,attendeeId){
 event.preventDefault();const form=event.currentTarget,body=formObject(form);
 return serviceSave(form,'save_protocol_lift_pass',{p_attendee_id:attendeeId,p_lift_pass_id:form.dataset.liftId||null,p_required:!!body.required,p_start_date:body.start_date||null,p_end_date:body.end_date||null,p_carre_neige_required:!!body.carre_neige_required,p_chargeable:!!body.chargeable,p_rate_code:body.rate_code||null,p_protocol_confirmed:!!body.protocol_confirmed,p_notes:body.notes||null},'Lift pass saved',attendeeId);
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

function canEditSponsors(){return ['admin','sponsor_manager'].includes(state.profile?.app_role);}
function canEditFinance(){return ['admin','finance'].includes(state.profile?.app_role);}
function checked(value){return value?' checked':'';}
function sponsorStatusLabel(status){return ({prospective:'Prospective',invited:'Invited',confirmed:'Confirmed',declined:'Declined',cancelled:'Cancelled'})[status]||status||'Unknown';}
function sponsorStatusClass(status){return status==='confirmed'?'green':(['declined','cancelled'].includes(status)?'red':status==='invited'?'purple':'amber');}
function sponsorOrganisation(row){return Array.isArray(row?.organisations)?row.organisations[0]:row?.organisations;}

async function loadSponsors(){
 const el=document.querySelector('#sponsorTable');if(!el)return;el.textContent='Loading sponsors…';
 const [sponsors,allocations,contacts,invitations,attendees]=await Promise.all([
  supabase.from('event_sponsors').select('id,event_id,organisation_id,sponsor_status,room_allocation,race_funding_sponsor,consolidated_invoice_requested,package_notes,active,sponsor_tier,display_in_event_app,protocol_rep_allowance,sponsor_manager_notes,created_at,organisations(id,organisation_name,short_name,billing_name,billing_address_1,billing_address_2,town_city,county_region,postcode,country,billing_email,active,notes,website_url,purchase_order_required,purchase_order_instructions)').eq('event_id',EVENT_ID).order('created_at'),
  supabase.from('v_sponsor_room_allocation').select('*').eq('event_id',EVENT_ID),
  supabase.from('sponsor_contacts').select('id,organisation_id,event_id,first_name,surname,job_title,email,mobile,primary_contact,billing_contact,active,notes,created_at').eq('event_id',EVENT_ID).order('surname'),
  supabase.from('invitations').select('id,event_id,organisation_id,invitee_email,invitee_name,category,invitation_status,invitation_token,sent_at,responded_at,notes,role_position,primary_representative,counts_against_room_allocation,intended_package,created_at').eq('event_id',EVENT_ID).order('created_at',{ascending:false}),
  supabase.from('attendees').select('id,event_id,title_rank,first_name,surname,email,category,display_company,organisation_id,billing_account_organisation_id,consolidated_invoice_included,linked_main_attendee_id,attendance_status').eq('event_id',EVENT_ID).order('surname').order('first_name')
 ]);
 const results=[sponsors,allocations,contacts,invitations,attendees],errors=results.map(result=>result.error).filter(Boolean);
 if(errors.length){el.innerHTML=`<div class="notice error">${esc(errors.map(error=>error.message).join('; '))}</div>`;return;}
 state.sponsorRows=sponsors.data||[];state.sponsorAllocations=allocations.data||[];state.sponsorContacts=contacts.data||[];state.sponsorInvitations=invitations.data||[];state.sponsorAttendees=attendees.data||[];
 if(state.selectedSponsorId&&!state.sponsorRows.some(row=>row.id===state.selectedSponsorId))state.selectedSponsorId=null;
 renderSponsorRows();renderSponsorMetrics();if(state.newSponsor||state.selectedSponsorId)renderSponsorDetail();
}

function renderSponsorMetrics(){
 const el=document.querySelector('#sponsorMetrics');if(!el)return;
 const confirmed=state.sponsorRows.filter(row=>row.sponsor_status==='confirmed'&&row.active).length;
 const rooms=state.sponsorRows.reduce((sum,row)=>sum+Number(row.room_allocation||0),0);
 const remaining=state.sponsorAllocations.reduce((sum,row)=>sum+Number(row.remaining_rooms||0),0);
 const invited=state.sponsorInvitations.filter(row=>row.invitation_status==='pending').length;
 el.innerHTML=`<div class="grid grid-4 sponsor-metrics"><div class="card metric"><strong>${state.sponsorRows.length}</strong><span>Event sponsors</span></div><div class="card metric"><strong>${confirmed}</strong><span>Confirmed</span></div><div class="card metric"><strong>${rooms}</strong><span>Rooms allocated</span></div><div class="card metric"><strong>${invited}</strong><span>Pending invitations</span></div></div>`;
}

function renderSponsorRows(){
 const el=document.querySelector('#sponsorTable');if(!el)return;
 const term=state.sponsorQuery.trim().toLowerCase();
 const rows=state.sponsorRows.filter(row=>{const org=sponsorOrganisation(row)||{};return !term||[org.organisation_name,org.short_name,row.sponsor_tier,row.sponsor_status].some(value=>String(value||'').toLowerCase().includes(term));});
 if(!rows.length){el.innerHTML=`<div class="empty">${state.sponsorRows.length?'No sponsors match this search.':'No event sponsors have been added yet.'}</div>`;return;}
 el.innerHTML=`<div class="table-scroll"><table class="data-table sponsor-table"><thead><tr><th>Organisation</th><th>Tier</th><th>Status</th><th>Rooms</th><th>Billing</th><th></th></tr></thead><tbody>${rows.map(row=>{const org=sponsorOrganisation(row)||{},allocation=state.sponsorAllocations.find(item=>item.event_sponsor_id===row.id);return `<tr><td><strong>${esc(org.organisation_name||'')}</strong><br><small>${esc(org.billing_email||org.short_name||'')}</small></td><td>${esc(row.sponsor_tier||'—')}</td><td><span class="status ${sponsorStatusClass(row.sponsor_status)}">${esc(sponsorStatusLabel(row.sponsor_status))}</span></td><td>${allocation?`${allocation.occupied_rooms||0} assigned · ${allocation.remaining_rooms||0} available`:row.room_allocation||0}</td><td>${row.consolidated_invoice_requested?'<span class="status purple">Consolidated</span>':'Individual'}</td><td><button class="btn btn-ghost btn-small" data-open-sponsor="${row.id}">Open</button></td></tr>`;}).join('')}</tbody></table></div>`;
 document.querySelectorAll('[data-open-sponsor]').forEach(button=>button.onclick=()=>{state.newSponsor=false;state.selectedSponsorId=button.dataset.openSponsor;state.selectedSponsorContactId=null;renderSponsorDetail();});
}

function sponsorForm(row){
 const org=sponsorOrganisation(row)||{},editable=canEditSponsors(),disabled=editable?'':' disabled',isNew=!row;
 const status=row?.sponsor_status||'prospective';
 return `<form id="sponsorForm" class="form-grid sponsor-form" data-sponsor-id="${row?.id||''}">
 <div class="form-section"><h3>Organisation and billing</h3><p>The permanent organisation record used for display and invoicing.</p></div>
 <div class="field"><label>Organisation name *</label><input name="organisation_name" required value="${esc(org.organisation_name||'')}"${disabled}></div><div class="field"><label>Short name</label><input name="short_name" value="${esc(org.short_name||'')}"${disabled}></div>
 <div class="field"><label>Billing name</label><input name="billing_name" value="${esc(org.billing_name||'')}"${disabled}></div><div class="field"><label>Billing email</label><input type="email" name="billing_email" value="${esc(org.billing_email||'')}"${disabled}></div>
 <div class="field"><label>Address line 1</label><input name="billing_address_1" value="${esc(org.billing_address_1||'')}"${disabled}></div><div class="field"><label>Address line 2</label><input name="billing_address_2" value="${esc(org.billing_address_2||'')}"${disabled}></div>
 <div class="field"><label>Town / city</label><input name="town_city" value="${esc(org.town_city||'')}"${disabled}></div><div class="field"><label>County / region</label><input name="county_region" value="${esc(org.county_region||'')}"${disabled}></div>
 <div class="field"><label>Postcode</label><input name="postcode" value="${esc(org.postcode||'')}"${disabled}></div><div class="field"><label>Country</label><input name="country" value="${esc(org.country||'United Kingdom')}"${disabled}></div>
 <div class="field"><label>Website</label><input type="url" name="website_url" value="${esc(org.website_url||'')}"${disabled}></div><div class="field checkbox"><input type="checkbox" id="poRequired" name="purchase_order_required"${checked(org.purchase_order_required)}${disabled}><label for="poRequired">Purchase order required</label></div>
 <div class="field full"><label>Purchase order instructions</label><textarea name="purchase_order_instructions"${disabled}>${esc(org.purchase_order_instructions||'')}</textarea></div><div class="field full"><label>Organisation notes</label><textarea name="organisation_notes"${disabled}>${esc(org.notes||'')}</textarea></div>
 <div class="form-section"><h3>ISSSC 2027 sponsorship</h3><p>Terms and operational limits for this event only.</p></div>
 <div class="field"><label>Status</label><select name="sponsor_status"${disabled}>${['prospective','invited','confirmed','declined','cancelled'].map(value=>`<option value="${value}"${value===status?' selected':''}>${sponsorStatusLabel(value)}</option>`).join('')}</select></div><div class="field"><label>Sponsor tier</label><input name="sponsor_tier" placeholder="For example Gold" value="${esc(row?.sponsor_tier||'')}"${disabled}></div>
 <div class="field"><label>Room allocation</label><input type="number" min="0" step="1" name="room_allocation" value="${row?.room_allocation??0}"${disabled}></div><div class="field"><label>Protocol representative allowance</label><input type="number" min="0" step="1" name="protocol_rep_allowance" value="${row?.protocol_rep_allowance??0}"${disabled}></div>
 <div class="field checkbox"><input type="checkbox" id="raceFunding" name="race_funding_sponsor"${checked(row?.race_funding_sponsor)}${disabled}><label for="raceFunding">Race-funding sponsor</label></div><div class="field checkbox"><input type="checkbox" id="consolidatedBilling" name="consolidated_invoice_requested"${checked(row?.consolidated_invoice_requested)}${disabled}><label for="consolidatedBilling">Consolidated invoice requested</label></div>
 <div class="field checkbox"><input type="checkbox" id="displaySponsor" name="display_in_event_app"${checked(row?.display_in_event_app??true)}${disabled}><label for="displaySponsor">Display in event app</label></div><div class="field checkbox"><input type="checkbox" id="activeSponsor" name="active"${checked(row?.active??true)}${disabled}><label for="activeSponsor">Active for this event</label></div>
 <div class="field full"><label>Package notes</label><textarea name="package_notes"${disabled}>${esc(row?.package_notes||'')}</textarea></div><div class="field full"><label>Sponsor manager notes</label><textarea name="sponsor_manager_notes"${disabled}>${esc(row?.sponsor_manager_notes||'')}</textarea></div>
 ${editable?`<div class="field full"><div class="service-actions"><button class="btn btn-primary" type="submit">${isNew?'Create sponsor':'Save sponsor'}</button><div id="sponsorSaveResult" class="service-save-result"></div></div></div>`:'<div class="field full"><div class="notice">You have read-only access to sponsor records.</div></div>'}
 </form>`;
}

function contactForm(row){
 const editable=canEditSponsors(),disabled=editable?'':' disabled';
 return `<form id="sponsorContactForm" class="form-grid compact-grid" data-contact-id="${row?.id||''}"><div class="field"><label>First name *</label><input name="first_name" required value="${esc(row?.first_name||'')}"${disabled}></div><div class="field"><label>Surname *</label><input name="surname" required value="${esc(row?.surname||'')}"${disabled}></div><div class="field"><label>Job title</label><input name="job_title" value="${esc(row?.job_title||'')}"${disabled}></div><div class="field"><label>Email</label><input type="email" name="email" value="${esc(row?.email||'')}"${disabled}></div><div class="field"><label>Mobile</label><input name="mobile" value="${esc(row?.mobile||'')}"${disabled}></div><div class="field checkbox"><input type="checkbox" id="primaryContact" name="primary_contact"${checked(row?.primary_contact)}${disabled}><label for="primaryContact">Primary contact</label></div><div class="field checkbox"><input type="checkbox" id="billingContact" name="billing_contact"${checked(row?.billing_contact)}${disabled}><label for="billingContact">Billing contact</label></div><div class="field checkbox"><input type="checkbox" id="activeContact" name="active"${checked(row?.active??true)}${disabled}><label for="activeContact">Active contact</label></div><div class="field full"><label>Notes</label><textarea name="notes"${disabled}>${esc(row?.notes||'')}</textarea></div>${editable?'<div class="field full"><div class="service-actions"><button class="btn btn-primary" type="submit">Save contact</button><button class="btn btn-ghost" type="button" id="cancelContact">Cancel</button><div id="contactSaveResult" class="service-save-result"></div></div></div>':''}</form>`;
}

function sponsorContactsSection(row){
 const org=sponsorOrganisation(row)||{},contacts=state.sponsorContacts.filter(contact=>contact.organisation_id===row.organisation_id),editing=contacts.find(contact=>contact.id===state.selectedSponsorContactId);
 return `<section class="sponsor-subsection"><div class="service-group-head"><div><h4>Contacts</h4><p>Keep the main operational and billing contacts clear.</p></div>${canEditSponsors()?'<button class="btn btn-ghost btn-small" id="addSponsorContact">Add contact</button>':''}</div>${contacts.length?`<div class="contact-list">${contacts.map(contact=>`<div class="contact-row"><div><strong>${esc(`${contact.first_name} ${contact.surname}`)}</strong><small>${esc([contact.job_title,contact.email,contact.mobile].filter(Boolean).join(' · '))}</small></div><div class="contact-tags">${contact.primary_contact?'<span class="status purple">Primary</span>':''}${contact.billing_contact?'<span class="status green">Billing</span>':''}${!contact.active?'<span class="status red">Inactive</span>':''}<button class="btn btn-ghost btn-small" data-edit-contact="${contact.id}">Edit</button></div></div>`).join('')}</div>`:`<div class="empty">No contacts recorded for ${esc(org.organisation_name||'this sponsor')}.</div>`}<div id="contactEditor">${state.selectedSponsorContactId==='new'||editing?contactForm(editing):''}</div></section>`;
}

function sponsorInvitationSection(row){
 const invitations=state.sponsorInvitations.filter(invite=>invite.organisation_id===row.organisation_id),editable=canEditSponsors();
 return `<section class="sponsor-subsection"><div class="service-group-head"><div><h4>Registration invitations</h4><p>Create a secure registration link to copy into your own email.</p></div></div>${editable?`<form id="sponsorInvitationForm" class="form-grid compact-grid"><div class="field"><label>Invitee name</label><input name="invitee_name"></div><div class="field"><label>Invitee email *</label><input type="email" name="invitee_email" required></div><div class="field"><label>Category</label><select name="category">${opts(['Sponsor','Sponsor Guest','Military VIP','Military Guest','Other'],'Choose category')}</select></div><div class="field"><label>Role / position</label><input name="role_position"></div><div class="field"><label>Intended package</label><input name="intended_package"></div><div class="field checkbox"><input type="checkbox" id="primaryRepresentative" name="primary_representative"><label for="primaryRepresentative">Primary representative</label></div><div class="field checkbox"><input type="checkbox" id="countsRooms" name="counts_against_room_allocation" checked><label for="countsRooms">Counts against room allocation</label></div><div class="field full"><label>Notes</label><textarea name="notes"></textarea></div><div class="field full"><div class="service-actions"><button class="btn btn-primary" type="submit">Create invitation</button><div id="invitationSaveResult" class="service-save-result"></div></div></div></form>`:''}${invitations.length?`<div class="table-scroll subsection-table"><table class="data-table"><thead><tr><th>Invitee</th><th>Category</th><th>Status</th><th>Rooms</th><th></th></tr></thead><tbody>${invitations.map(invite=>`<tr><td><strong>${esc(invite.invitee_name||'Unnamed')}</strong><br><small>${esc(invite.invitee_email)}</small></td><td>${esc(invite.category||'')}</td><td><span class="status ${invite.invitation_status==='accepted'?'green':'purple'}">${esc(invite.invitation_status||'pending')}</span></td><td>${invite.counts_against_room_allocation?'Yes':'No'}</td><td><button class="btn btn-ghost btn-small" data-copy-invite="${invite.invitation_token}">Copy link</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No invitations created yet.</div>'}</section>`;
}

function attendeeLinkForm(attendee,row){
 const orgId=row.organisation_id,display=attendee.organisation_id===orgId,billing=attendee.billing_account_organisation_id===orgId,disabled=canEditSponsors()?'':' disabled';
 const mains=state.sponsorAttendees.filter(item=>item.id!==attendee.id);
 return `<form class="attendee-link-form" data-attendee-id="${attendee.id}"><div class="attendee-name"><strong>${esc(`${attendee.title_rank||''} ${attendee.first_name||''} ${attendee.surname||''}`.trim())}</strong><small>${esc(attendee.email||attendee.category||'')}</small></div><label><input type="checkbox" name="display_as_sponsor"${checked(display)}${disabled}> Display sponsor</label><label><input type="checkbox" name="bill_to_sponsor"${checked(billing)}${disabled}> Bill to sponsor</label><label><input type="checkbox" name="consolidated_invoice_included"${checked(attendee.consolidated_invoice_included??true)}${disabled}> Consolidated</label><select name="linked_main_attendee_id" aria-label="Linked main attendee"${disabled}><option value="">No linked main attendee</option>${mains.map(main=>`<option value="${main.id}"${main.id===attendee.linked_main_attendee_id?' selected':''}>${esc(`${main.first_name} ${main.surname}`)}</option>`).join('')}</select>${canEditSponsors()?'<button class="btn btn-ghost btn-small" type="submit">Save</button>':''}<div class="link-save-result"></div></form>`;
}

function sponsorAttendeesSection(row){
 return `<section class="sponsor-subsection"><div class="service-group-head"><div><h4>Attendee and billing links</h4><p>Choose whose organisation is displayed and whose charges belong on this sponsor account.</p></div></div>${state.sponsorAttendees.length?`<div class="attendee-link-list">${state.sponsorAttendees.map(attendee=>attendeeLinkForm(attendee,row)).join('')}</div>`:'<div class="empty">No approved attendees are available yet.</div>'}</section>`;
}

function renderSponsorDetail(){
 const el=document.querySelector('#sponsorDetail');if(!el)return;
 const row=state.sponsorRows.find(item=>item.id===state.selectedSponsorId);
 if(!state.newSponsor&&!row){el.innerHTML='';return;}
 const org=sponsorOrganisation(row)||{},allocation=row&&state.sponsorAllocations.find(item=>item.event_sponsor_id===row.id);
 el.innerHTML=`<section class="record-panel sponsor-record"><div class="review-heading"><div>${row?`<span class="status ${sponsorStatusClass(row.sponsor_status)}">${esc(sponsorStatusLabel(row.sponsor_status))}</span>`:'<span class="status purple">New sponsor</span>'}<h3>${esc(org.organisation_name||'Create event sponsor')}</h3><p>${row?esc([row.sponsor_tier,org.billing_email].filter(Boolean).join(' · ')):'Add the organisation and its ISSSC 2027 terms.'}</p></div><button class="btn btn-ghost btn-small" id="closeSponsor">Close</button></div>${allocation?`<div class="allocation-strip"><div><strong>${allocation.room_allocation||0}</strong><span>Allocated rooms</span></div><div><strong>${allocation.allocated_invites||0}</strong><span>Invitations</span></div><div><strong>${allocation.accepted_attendees||0}</strong><span>Registered guests</span></div><div><strong>${allocation.occupied_rooms||0}</strong><span>Rooms assigned</span></div><div class="${allocation.over_allocation?'over':''}"><strong>${allocation.remaining_rooms||0}</strong><span>Rooms available</span></div></div>`:''}${sponsorForm(row)}${row?`${sponsorContactsSection(row)}${sponsorInvitationSection(row)}${sponsorAttendeesSection(row)}`:''}</section>`;
 document.querySelector('#closeSponsor').onclick=()=>{state.newSponsor=false;state.selectedSponsorId=null;state.selectedSponsorContactId=null;el.innerHTML='';};
 const form=document.querySelector('#sponsorForm');if(form&&canEditSponsors())form.onsubmit=saveSponsor;
 if(!row)return;
 const addContact=document.querySelector('#addSponsorContact');if(addContact)addContact.onclick=()=>{state.selectedSponsorContactId='new';renderSponsorDetail();document.querySelector('#contactEditor')?.scrollIntoView({behavior:'smooth',block:'center'});};
 document.querySelectorAll('[data-edit-contact]').forEach(button=>button.onclick=()=>{state.selectedSponsorContactId=button.dataset.editContact;renderSponsorDetail();document.querySelector('#contactEditor')?.scrollIntoView({behavior:'smooth',block:'center'});});
 const contactFormEl=document.querySelector('#sponsorContactForm');if(contactFormEl)contactFormEl.onsubmit=event=>saveSponsorContact(event,row.id);
 const cancelContact=document.querySelector('#cancelContact');if(cancelContact)cancelContact.onclick=()=>{state.selectedSponsorContactId=null;renderSponsorDetail();};
 const invitationForm=document.querySelector('#sponsorInvitationForm');if(invitationForm)invitationForm.onsubmit=event=>createSponsorInvitation(event,row.id);
 document.querySelectorAll('[data-copy-invite]').forEach(button=>button.onclick=()=>copyInvitationLink(button.dataset.copyInvite));
 document.querySelectorAll('.attendee-link-form').forEach(formEl=>formEl.onsubmit=event=>saveSponsorAttendeeLink(event,row.id));
 el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function saveSponsor(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=document.querySelector('#sponsorSaveResult');button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {data,error}=await supabase.rpc('save_sponsor_workspace',{p_event_id:EVENT_ID,p_event_sponsor_id:form.dataset.sponsorId||null,p_organisation_name:body.organisation_name,p_short_name:body.short_name||null,p_billing_name:body.billing_name||null,p_billing_address_1:body.billing_address_1||null,p_billing_address_2:body.billing_address_2||null,p_town_city:body.town_city||null,p_county_region:body.county_region||null,p_postcode:body.postcode||null,p_country:body.country||null,p_billing_email:body.billing_email||null,p_purchase_order_required:!!body.purchase_order_required,p_purchase_order_instructions:body.purchase_order_instructions||null,p_website_url:body.website_url||null,p_organisation_notes:body.organisation_notes||null,p_sponsor_status:body.sponsor_status,p_sponsor_tier:body.sponsor_tier||null,p_room_allocation:Number(body.room_allocation||0),p_protocol_rep_allowance:Number(body.protocol_rep_allowance||0),p_race_funding_sponsor:!!body.race_funding_sponsor,p_consolidated_invoice_requested:!!body.consolidated_invoice_requested,p_display_in_event_app:!!body.display_in_event_app,p_package_notes:body.package_notes||null,p_sponsor_manager_notes:body.sponsor_manager_notes||null,p_active:!!body.active});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent=form.dataset.sponsorId?'Save sponsor':'Create sponsor';return;}
 state.newSponsor=false;state.selectedSponsorId=data;toast(form.dataset.sponsorId?'Sponsor updated':'Sponsor created');await loadSponsors();
}

async function saveSponsorContact(event,eventSponsorId){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=document.querySelector('#contactSaveResult');button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc('save_sponsor_contact',{p_event_sponsor_id:eventSponsorId,p_contact_id:form.dataset.contactId||null,p_first_name:body.first_name,p_surname:body.surname,p_job_title:body.job_title||null,p_email:body.email||null,p_mobile:body.mobile||null,p_primary_contact:!!body.primary_contact,p_billing_contact:!!body.billing_contact,p_active:!!body.active,p_notes:body.notes||null});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Save contact';return;}
 state.selectedSponsorContactId=null;toast('Sponsor contact saved');await loadSponsors();
}

async function createSponsorInvitation(event,eventSponsorId){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=document.querySelector('#invitationSaveResult');button.disabled=true;button.textContent='Creating…';result.innerHTML='';
 const {data,error}=await supabase.rpc('create_sponsor_invitation',{p_event_sponsor_id:eventSponsorId,p_invitee_email:body.invitee_email,p_invitee_name:body.invitee_name||null,p_category:body.category||null,p_role_position:body.role_position||null,p_primary_representative:!!body.primary_representative,p_counts_against_room_allocation:!!body.counts_against_room_allocation,p_intended_package:body.intended_package||null,p_notes:body.notes||null});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Create invitation';return;}
 const invite=Array.isArray(data)?data[0]:data;toast('Invitation created');await loadSponsors();if(invite?.invitation_token)await copyInvitationLink(invite.invitation_token);
}

async function copyInvitationLink(token){
 const url=`${location.origin}/?invite=${encodeURIComponent(token)}#/register`;
 try{await navigator.clipboard.writeText(url);toast('Registration link copied');}catch{window.prompt('Copy this registration link',url);}
}

async function saveSponsorAttendeeLink(event,eventSponsorId){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.link-save-result');button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc('save_sponsor_attendee_links',{p_event_sponsor_id:eventSponsorId,p_attendee_id:form.dataset.attendeeId,p_display_as_sponsor:!!body.display_as_sponsor,p_bill_to_sponsor:!!body.bill_to_sponsor,p_consolidated_invoice_included:!!body.consolidated_invoice_included,p_linked_main_attendee_id:body.linked_main_attendee_id||null});
 if(error){result.innerHTML=`<span class="small error-text">${esc(error.message)}</span>`;button.disabled=false;button.textContent='Save';return;}
 toast('Attendee billing link saved');await loadSponsors();
}
async function loadInvoices(){
 const el=document.querySelector('#invoiceTable');if(!el)return;
 const results=await Promise.all([
  supabase.from('v_invoice_readiness').select('attendee_id,event_id,first_name,surname,category,accommodation_confirmed,lift_pass_confirmed,data_checked,exception_flag,ready_for_invoice,transfer_billing_reviewed,unresolved_transfer_count,suppressed_dinner_count,checked_audit_complete,rate_lookup_complete').eq('event_id',EVENT_ID).order('surname').order('first_name'),
  supabase.from('v_finance_charge_estimates').select('attendee_id,event_id,accommodation_net,lift_pass_net,usage_net,estimated_net_total,estimated_vat_total,estimated_gross_total').eq('event_id',EVENT_ID),
  supabase.from('attendees').select('id,event_id,title_rank,first_name,surname,email,category,display_company,billing_account_organisation_id,consolidated_invoice_included,attendance_status,data_checked,checked_at,exception_flag,exception_reason').eq('event_id',EVENT_ID).order('surname').order('first_name'),
  supabase.from('organisations').select('id,organisation_name,billing_name,billing_email,purchase_order_required').order('organisation_name'),
  supabase.from('event_sponsors').select('id,event_id,organisation_id,sponsor_status,consolidated_invoice_requested,active').eq('event_id',EVENT_ID).eq('active',true),
  supabase.from('invoices').select('id,event_id,attendee_id,billing_account_organisation_id,invoice_type,invoice_reference,status,issue_date,due_date,net_total,vat_total,gross_total,created_at,updated_at').eq('event_id',EVENT_ID).order('created_at',{ascending:false}).limit(100),
  supabase.from('rate_card').select('id,rate_code,description,charge_category,unit,unit_price,vat_rate,tax_treatment,status,active,source_note,confirmed_by,confirmed_at,updated_at').eq('event_id',EVENT_ID).eq('active',true).order('charge_category').order('description')
 ]);
 const failed=results.find(result=>result.error);
 if(failed){el.innerHTML=`<div class="notice error">${esc(failed.error.message)}</div>`;return;}
 [state.financeReadiness,state.financeSummaries,state.financeAttendees,state.financeOrganisations,state.financeSponsors,state.financeInvoices,state.financeRates]=results.map(result=>result.data||[]);
 if(state.financeAttendees.length){
  const packageResult=await supabase.from('usage_extras').select('id,attendee_id,category,quantity,rate_code,unit_rate,chargeable,total_charge,notes,created_at,updated_at').in('attendee_id',state.financeAttendees.map(attendee=>attendee.id)).in('category',['transfer','admin']).order('created_at');
  if(packageResult.error){el.innerHTML=`<div class="notice error">${esc(packageResult.error.message)}</div>`;return;}
  state.financePackages=packageResult.data||[];
 }else state.financePackages=[];
 if(state.financeInvoices.length){
  const lineResult=await supabase.from('invoice_lines').select('id,invoice_id,attendee_id,source_type,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code,created_at').in('invoice_id',state.financeInvoices.map(invoice=>invoice.id)).order('created_at').limit(1000);
  if(lineResult.error){el.innerHTML=`<div class="notice error">${esc(lineResult.error.message)}</div>`;return;}
  state.financeLines=lineResult.data||[];
 }else state.financeLines=[];
 if(state.selectedFinanceRateId&&!state.financeRates.some(rate=>rate.id===state.selectedFinanceRateId))state.selectedFinanceRateId=null;
 if(state.selectedInvoiceId&&!state.financeInvoices.some(invoice=>invoice.id===state.selectedInvoiceId))state.selectedInvoiceId=null;
 renderFinanceMetrics();renderFinanceRates();renderFinanceReadiness();renderFinanceConsolidated();renderFinanceInvoices();
 if(state.selectedFinanceAttendeeId)await openFinanceAttendee(state.selectedFinanceAttendeeId,false);
}

function financeReadiness(attendeeId){return state.financeReadiness.find(row=>row.attendee_id===attendeeId);}
function financeSummary(attendeeId){return state.financeSummaries.find(row=>row.attendee_id===attendeeId);}
function financePackage(attendeeId){return state.financePackages.find(row=>row.attendee_id===attendeeId);}
function financePackageComplete(attendeeId){
 const item=financePackage(attendeeId);if(!item)return false;
 const rate=state.financeRates.find(row=>row.rate_code===item.rate_code&&row.active&&['transfer','admin'].includes(row.charge_category));
 return !!rate&&((item.chargeable&&Number(item.quantity)>0&&rate.charge_category===item.category)||(!item.chargeable&&String(item.notes||'').trim()));
}
function financeBillingReady(attendeeId){return !!financeReadiness(attendeeId)?.ready_for_invoice&&financePackageComplete(attendeeId);}
function financeOrganisation(organisationId){return state.financeOrganisations.find(row=>row.id===organisationId);}
function financeOpenInvoice(predicate){return state.financeInvoices.find(invoice=>predicate(invoice)&&!['cancelled','void'].includes(invoice.status));}
function financeBlockers(row,attendeeId){
 const blockers=[];
 if(!row?.accommodation_confirmed)blockers.push('Accommodation');
 if(!row?.lift_pass_confirmed)blockers.push('Lift pass');
 if(!row?.transfer_billing_reviewed)blockers.push(`${row.unresolved_transfer_count||0} transfer review${Number(row.unresolved_transfer_count)===1?'':'s'}`);
 if(!financePackageComplete(attendeeId))blockers.push('Transfer package');
 if(!row?.checked_audit_complete)blockers.push('Data check');
 if(row?.exception_flag)blockers.push('Exception');
 if(!row?.rate_lookup_complete)blockers.push('Rate lookup');
 return blockers;
}
function invoiceStatusLabel(value){return ({ready_for_review:'Ready for review',awaiting_billing_update:'Billing update needed'})[value]||statusLabel(value);}
function invoiceStatusClass(value){return value==='paid'?'green':value==='issued'||value==='approved'?'purple':value==='cancelled'||value==='void'?'red':'amber';}

function rateStatusLabel(value){return value==='approved'?'Confirmed':value==='retired'?'Retired':'Draft';}
function rateStatusClass(value){return value==='approved'?'green':value==='retired'?'red':'amber';}
function rateCategoryLabel(value){return String(value||'Other').replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase());}
function rateUnitLabel(value){return ({per_person_per_night:'Per person, per night',per_person_per_day:'Per person, per day',per_return_transfer:'Per return transfer',per_person:'Per person',per_bottle:'Per bottle',per_person_per_dinner:'Per person, per dinner',per_lesson:'Per lesson'})[value]||rateCategoryLabel(value);}
function rateGroup(rate){
 if(rate.charge_category==='accommodation')return'accommodation';
 if(rate.charge_category==='lift_pass')return'passes';
 if(['transfer','admin'].includes(rate.charge_category))return'transfers';
 if(['dinner','champagne','champagne_vat'].includes(rate.charge_category))return'hospitality';
 if(String(rate.charge_category).startsWith('lesson_'))return'lessons';
 return'other';
}

function renderFinanceRates(){
 const el=document.querySelector('#financeRateTable'),detail=document.querySelector('#financeRateDetail');if(!el||!detail)return;
 const query=state.financeRateQuery.trim().toLowerCase();
 const rates=state.financeRates.filter(rate=>(state.financeRateGroup==='all'||rateGroup(rate)===state.financeRateGroup)&&(!query||`${rate.rate_code} ${rate.description} ${rate.charge_category} ${rate.source_note||''}`.toLowerCase().includes(query)));
 if(!rates.length){el.innerHTML='<div class="empty">No rates match this view.</div>';detail.innerHTML='';return;}
 el.innerHTML=`<div class="rate-card-summary"><span class="status green">${state.financeRates.filter(rate=>rate.status==='approved').length} confirmed</span><span class="small muted">${state.financeRates.length} active rates</span></div><div class="table-scroll"><table class="data-table rate-table"><thead><tr><th>Rate</th><th>Category</th><th>Charging unit</th><th>Price</th><th>VAT</th><th>Status</th><th></th></tr></thead><tbody>${rates.map(rate=>`<tr><td><strong>${esc(rate.description)}</strong><br><small>${esc(rate.rate_code)}</small></td><td>${esc(rateCategoryLabel(rate.charge_category))}</td><td>${esc(rateUnitLabel(rate.unit))}</td><td><strong>${money(rate.unit_price)}</strong></td><td>${rate.vat_rate==null?'Not specified':`${Number(rate.vat_rate).toFixed(2)}%`}</td><td><span class="status ${rateStatusClass(rate.status)}">${rateStatusLabel(rate.status)}</span></td><td><button class="btn btn-ghost btn-small" data-edit-rate="${rate.id}">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
 document.querySelectorAll('[data-edit-rate]').forEach(button=>button.onclick=()=>{state.selectedFinanceRateId=button.dataset.editRate;renderFinanceRateDetail();});
 renderFinanceRateDetail();
}

function renderFinanceRateDetail(scroll=false){
 const el=document.querySelector('#financeRateDetail');if(!el)return;
 const rate=state.financeRates.find(item=>item.id===state.selectedFinanceRateId);if(!rate){el.innerHTML='';return;}
 const editable=canEditFinance();
 el.innerHTML=`<section class="rate-detail"><div class="review-heading"><div><span class="status ${rateStatusClass(rate.status)}">${rateStatusLabel(rate.status)}</span><h3>${esc(rate.description)}</h3><p>${esc(rate.rate_code)}</p></div><button class="btn btn-ghost btn-small" id="closeFinanceRate">Close</button></div><div class="rate-meta"><div><small>Category</small><strong>${esc(rateCategoryLabel(rate.charge_category))}</strong></div><div><small>Charging unit</small><strong>${esc(rateUnitLabel(rate.unit))}</strong></div><div><small>Tax treatment</small><strong>${esc(rateCategoryLabel(rate.tax_treatment||'Not specified'))}</strong></div><div><small>Last confirmed</small><strong>${rate.confirmed_at?esc(formatDateTime(rate.confirmed_at)):'Not recorded'}</strong></div></div><form id="financeRateForm" class="form-grid record-form"><div class="field full"><label>Description *</label><input name="description" required value="${esc(rate.description)}" ${editable?'':'disabled'}></div><div class="field"><label>Unit price (£) *</label><input name="unit_price" type="number" min="0" step="0.01" required value="${Number(rate.unit_price).toFixed(2)}" ${editable?'':'disabled'}></div><div class="field"><label>VAT rate (%)</label><input name="vat_rate" type="number" min="0" max="100" step="0.01" value="${rate.vat_rate==null?'':Number(rate.vat_rate).toFixed(2)}" placeholder="Leave blank if not specified" ${editable?'':'disabled'}></div><div class="field full"><label>Source / approval note</label><textarea name="source_note" ${editable?'':'disabled'}>${esc(rate.source_note||'')}</textarea></div><div class="field full"><div class="notice warn">Saving confirms this as the current rate. Current calculations and open drafts will be updated; confirmed, issued and paid invoice snapshots will not change.</div></div>${editable?'<div class="field full"><div class="service-actions"><button class="btn btn-primary" type="submit">Save confirmed rate</button><div class="service-save-result"></div></div></div>':''}</form></section>`;
 document.querySelector('#closeFinanceRate').onclick=()=>{state.selectedFinanceRateId=null;el.innerHTML='';};
 const form=document.querySelector('#financeRateForm');if(form&&editable)form.onsubmit=saveFinanceRate;
 if(scroll)el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function saveFinanceRate(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result');
 const unitPrice=Number(body.unit_price),vatText=String(body.vat_rate||'').trim(),vatRate=vatText===''?null:Number(vatText);
 if(!String(body.description||'').trim()){result.innerHTML='<div class="notice error">Add a rate description.</div>';return;}
 if(!Number.isFinite(unitPrice)||unitPrice<0){result.innerHTML='<div class="notice error">Enter a valid unit price.</div>';return;}
 if(vatRate!==null&&(!Number.isFinite(vatRate)||vatRate<0||vatRate>100)){result.innerHTML='<div class="notice error">VAT must be between 0 and 100%.</div>';return;}
 if(!window.confirm('Save and confirm this rate? Open drafts using it will need to be rebuilt.'))return;
 button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc('save_finance_rate',{p_rate_id:state.selectedFinanceRateId,p_description:body.description,p_unit_price:unitPrice,p_vat_rate:vatRate,p_source_note:body.source_note||null});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Save confirmed rate';return;}
 toast('Confirmed rate saved');await loadInvoices();
}

function renderFinanceMetrics(){
 const el=document.querySelector('#financeMetrics');if(!el)return;
 const ready=state.financeAttendees.filter(attendee=>financeBillingReady(attendee.id)).length;
 const drafts=state.financeInvoices.filter(invoice=>['draft','awaiting_billing_update','ready_for_review'].includes(invoice.status));
 const confirmed=state.financeRates.filter(rate=>rate.status==='approved').length;
 el.innerHTML=`<div class="card metric"><strong>${ready}</strong><span>Ready for invoice</span></div><div class="card metric"><strong>${Math.max(0,state.financeAttendees.length-ready)}</strong><span>Blocked</span></div><div class="card metric"><strong>${drafts.length}</strong><span>Draft invoices</span></div><div class="card metric"><strong>${money(drafts.reduce((sum,invoice)=>sum+Number(invoice.gross_total||0),0))}</strong><span>Draft value · ${confirmed} of ${state.financeRates.length} rates confirmed</span></div>`;
}

function renderFinanceReadiness(){
 const el=document.querySelector('#financeReadiness');if(!el)return;
 const query=state.financeQuery.trim().toLowerCase();
 const rows=state.financeAttendees.map(attendee=>({attendee,readiness:financeReadiness(attendee.id),summary:financeSummary(attendee.id)})).filter(({attendee,readiness})=>{
  const consolidated=attendee.billing_account_organisation_id&&attendee.consolidated_invoice_included;
  const ready=financeBillingReady(attendee.id);
  const matchesFilter=state.financeFilter==='all'||(state.financeFilter==='ready'&&ready)||(state.financeFilter==='blocked'&&!ready)||(state.financeFilter==='consolidated'&&consolidated);
  const organisation=financeOrganisation(attendee.billing_account_organisation_id);
  const haystack=`${attendee.first_name||''} ${attendee.surname||''} ${attendee.email||''} ${attendee.display_company||''} ${organisation?.organisation_name||''}`.toLowerCase();
  return matchesFilter&&(!query||haystack.includes(query));
 });
 if(!rows.length){el.innerHTML='<div class="empty">No attendees match this view.</div>';return;}
 el.innerHTML=`<div class="table-scroll"><table class="data-table finance-table"><thead><tr><th>Attendee</th><th>Billing account</th><th>Estimated charges</th><th>Readiness</th><th></th></tr></thead><tbody>${rows.map(({attendee,readiness,summary})=>{
  const organisation=financeOrganisation(attendee.billing_account_organisation_id),consolidated=attendee.billing_account_organisation_id&&attendee.consolidated_invoice_included;
  const blockers=financeBlockers(readiness,attendee.id),ready=financeBillingReady(attendee.id);
  const existing=financeOpenInvoice(invoice=>invoice.invoice_type==='individual'&&invoice.attendee_id===attendee.id);
  const finalised=existing&&['approved','issued','paid'].includes(existing.status);
  let action=`<button class="btn btn-ghost btn-small" data-review-finance="${attendee.id}">Review</button>`;
  if(consolidated)action+=`<span class="small muted">Included below</span>`;
  else if(canEditFinance())action+=`<button class="btn btn-ghost btn-small" data-create-individual="${attendee.id}" ${!ready||finalised?'disabled':''}>${finalised?'Finalised':existing?'Rebuild draft':'Create draft'}</button>`;
  return `<tr><td><strong>${esc(`${attendee.title_rank||''} ${attendee.first_name||''} ${attendee.surname||''}`.trim())}</strong><br><small>${esc(attendee.email||attendee.category||'')}</small></td><td>${esc(organisation?.billing_name||organisation?.organisation_name||'Self / individual')}<br><small>${consolidated?'Consolidated':'Individual'}</small></td><td><strong>${money(summary?.estimated_gross_total||0)}</strong><br><small>Estimated gross · before adjustments</small></td><td><span class="status ${ready?'green':'amber'}">${ready?'Ready':'Blocked'}</span>${blockers.length?`<div class="blocker-list">${blockers.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`:''}</td><td>${action}</td></tr>`;
 }).join('')}</tbody></table></div>`;
 document.querySelectorAll('[data-review-finance]').forEach(button=>button.onclick=()=>openFinanceAttendee(button.dataset.reviewFinance));
 document.querySelectorAll('[data-create-individual]').forEach(button=>button.onclick=()=>createFinanceDraft('individual',button.dataset.createIndividual,button));
}

async function openFinanceAttendee(attendeeId,scroll=true){
 const el=document.querySelector('#financeAttendeeDetail');if(!el)return;
 state.selectedFinanceAttendeeId=attendeeId;el.innerHTML='<div class="empty">Loading Finance review…</div>';
 const {data,error}=await supabase.from('travel_records').select('id,direction,method_of_transport,airport_station,flight_travel_number,travel_datetime,resort_datetime,transfer_requested,transfer_service,transfer_chargeable,protocol_confirmed,billing_reviewed,billing_review_notes,billing_reviewed_at').eq('attendee_id',attendeeId).order('direction');
 if(error){el.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;return;}
 state.financeTravel=data||[];renderFinanceAttendeeDetail(scroll);
}

function financeCheckCard(label,complete,detail){
 return `<div class="finance-check"><span class="status ${complete?'green':'amber'}">${complete?'Complete':'Required'}</span><strong>${esc(label)}</strong><small>${esc(detail)}</small></div>`;
}

function financeTravelDetail(record){
 const date=record.travel_datetime?formatDateTime(record.travel_datetime):'Time not recorded';
 const journey=[record.method_of_transport,record.airport_station,record.flight_travel_number].filter(Boolean).join(' · ')||'Journey details not recorded';
 const service=record.transfer_requested?(record.transfer_service||'Transfer requested'):'No UKAFWSA transfer requested';
 return `${journey} · ${date} · ${service}`;
}

function financePackageLabel(rate){
 return ({'2027_TRANSFER_GVA':'Airport return','2027_TRANSFER_MOUTIERS':'Moûtiers return','2027_ADMIN_ONLY':'Admin only'})[rate.rate_code]||rate.description||rate.rate_code;
}

function renderFinanceAttendeeDetail(scroll=true){
 const el=document.querySelector('#financeAttendeeDetail');if(!el)return;
 const attendee=state.financeAttendees.find(row=>row.id===state.selectedFinanceAttendeeId);
 if(!attendee){state.selectedFinanceAttendeeId=null;state.financeTravel=[];el.innerHTML='';return;}
 const travel=state.financeTravel;
 const readiness=financeReadiness(attendee.id)||{},editable=canEditFinance(),billingReady=financeBillingReady(attendee.id);
 const packageItem=financePackage(attendee.id),packageComplete=financePackageComplete(attendee.id),hasChargeableTravel=travel.some(record=>record.transfer_chargeable);
 const packageSelection=packageItem?(packageItem.chargeable?packageItem.rate_code:'waived'):'';
 const packageRates=state.financeRates.filter(rate=>['transfer','admin'].includes(rate.charge_category)).sort((a,b)=>['2027_TRANSFER_GVA','2027_TRANSFER_MOUTIERS','2027_ADMIN_ONLY'].indexOf(a.rate_code)-['2027_TRANSFER_GVA','2027_TRANSFER_MOUTIERS','2027_ADMIN_ONLY'].indexOf(b.rate_code));
 const prerequisiteComplete=!!(readiness.accommodation_confirmed&&readiness.lift_pass_confirmed&&readiness.transfer_billing_reviewed&&readiness.rate_lookup_complete&&packageComplete);
 el.innerHTML=`<section class="finance-attendee-review"><div class="review-heading"><div><span class="status ${billingReady?'green':'amber'}">${billingReady?'Ready for invoice':'Finance review'}</span><h3>${esc(`${attendee.title_rank||''} ${attendee.first_name||''} ${attendee.surname||''}`.trim())}</h3><p>${esc(attendee.email||attendee.category||'')}</p></div><button class="btn btn-ghost btn-small" id="closeFinanceAttendee">Close</button></div>
 <div class="finance-check-grid">${financeCheckCard('Accommodation',readiness.accommodation_confirmed,'Confirmed by Protocol')}${financeCheckCard('Lift pass',readiness.lift_pass_confirmed,'Confirmed by Protocol')}${financeCheckCard('Transfer review',readiness.transfer_billing_reviewed,readiness.transfer_billing_reviewed?'All chargeable transfers reviewed':`${readiness.unresolved_transfer_count||0} review${Number(readiness.unresolved_transfer_count)===1?'':'s'} outstanding`)}${financeCheckCard('Billing package',packageComplete,packageComplete?(packageItem.chargeable?`${financePackageLabel(state.financeRates.find(rate=>rate.rate_code===packageItem.rate_code)||packageItem)} · ${money(packageItem.total_charge)}`:'No charge · reason recorded'):'Select one package')}${financeCheckCard('Rate lookup',readiness.rate_lookup_complete,'All chargeable services matched')}</div>
 <div class="finance-review-section"><div class="finance-review-heading"><div><h4>Transfer billing review</h4><p>Protocol records the journey. Finance confirms whether each chargeable transfer is ready to bill.</p></div></div>${travel.length?`<div class="finance-travel-list">${travel.map(record=>`<form class="finance-travel-form" data-finance-travel-id="${record.id}"><div class="finance-travel-head"><div><span class="status ${record.protocol_confirmed?'green':'amber'}">${record.protocol_confirmed?'Protocol confirmed':'Protocol draft'}</span><h4>${record.direction==='departure'?'Departure':'Arrival'}</h4></div><span class="status ${record.transfer_chargeable?'purple':'green'}">${record.transfer_chargeable?'Chargeable':'Not chargeable'}</span></div><p class="finance-journey">${esc(financeTravelDetail(record))}</p>${record.transfer_chargeable?`<div class="form-grid compact-grid"><div class="field checkbox full"><input type="checkbox" name="billing_reviewed" id="billing-${record.id}" ${record.billing_reviewed?'checked':''}${editable?'':' disabled'}><div><label for="billing-${record.id}">Billing reviewed</label><small>Tick only after checking the transfer treatment. A review note is required.</small></div></div><div class="field full"><label>Billing review note</label><textarea name="billing_review_notes" ${editable?'':'disabled'} placeholder="Record what Finance checked">${esc(record.billing_review_notes||'')}</textarea></div></div>${editable?`<div class="service-actions"><button class="btn btn-primary btn-small" type="submit">Save transfer review</button><div class="service-save-result"></div></div>`:''}`:'<div class="notice success">No Finance review is required because this transfer is not chargeable.</div>'}</form>`).join('')}</div>`:'<div class="empty">No travel records have been created for this attendee.</div>'}</div>
 <form id="financePackageForm" class="finance-review-section"><div class="finance-review-heading"><div><h4>Transfer billing package</h4><p>Select one return package for the attendee. Arrival and departure are reviewed separately above, but they are not billed as two journey legs.</p></div><span class="status ${packageComplete?'green':'amber'}">${packageComplete?'Selected':'Required'}</span></div><div class="form-grid compact-grid"><div class="field"><label>Billing package</label><select name="package_rate" ${editable?'':'disabled'} required><option value="">Choose package…</option>${packageRates.map(rate=>`<option value="${esc(rate.rate_code)}" ${packageSelection===rate.rate_code?'selected':''} ${rate.charge_category==='transfer'&&!hasChargeableTravel?'disabled':''} ${rate.charge_category==='admin'&&hasChargeableTravel?'disabled':''}>${esc(financePackageLabel(rate))} · ${money(rate.unit_price)}${rate.status!=='approved'?' · proposed':''}</option>`).join('')}<option value="waived" ${packageSelection==='waived'?'selected':''}>No charge / exempt</option></select><small>${hasChargeableTravel?'Choose the airport or Moûtiers return package, or record an exemption.':'No chargeable transfer is recorded, so use Admin only or record an exemption.'}</small></div><div class="field"><label>Package note</label><textarea name="package_notes" ${editable?'':'disabled'} placeholder="Optional for a charge; required for no charge / exempt">${esc(packageItem?.notes||'')}</textarea></div></div>${editable?`<div class="service-actions"><button class="btn btn-primary" type="submit">Save billing package</button><div class="service-save-result"></div></div>`:''}<div class="notice finance-package-note">Saving a package resets the final Finance data check and marks any existing draft for rebuild.</div></form>
 <form id="financeDataCheckForm" class="finance-review-section"><div class="finance-review-heading"><div><h4>Final Finance data check</h4><p>Complete this after checking the attendee identity, billing account and all confirmed services.</p></div><span class="status ${attendee.data_checked?'green':'amber'}">${attendee.data_checked?'Checked':'Not checked'}</span></div><div class="form-grid compact-grid"><div class="field checkbox full"><input type="checkbox" name="exception_flag" id="financeException" ${attendee.exception_flag?'checked':''}${editable?'':' disabled'}><div><label for="financeException">Unresolved billing exception</label><small>Use only when the record needs an explicit Finance warning.</small></div></div><div class="field full"><label>Exception reason</label><textarea name="exception_reason" ${editable?'':'disabled'} placeholder="Required when an exception is recorded">${esc(attendee.exception_reason||'')}</textarea></div></div>${editable?`<div class="service-actions"><button class="btn btn-primary" type="submit" ${prerequisiteComplete?'':'disabled'}>${attendee.data_checked?'Update data check':'Mark data checked'}</button><div class="service-save-result"></div></div>`:''}${!prerequisiteComplete?'<div class="notice warn finance-prerequisite-note">Complete the five checks above before marking the final data check.</div>':''}${attendee.checked_at?`<p class="small muted finance-audit">Last checked ${esc(formatDateTime(attendee.checked_at))}</p>`:''}</form></section>`;
 document.querySelector('#closeFinanceAttendee').onclick=()=>{state.selectedFinanceAttendeeId=null;state.financeTravel=[];el.innerHTML='';};
 document.querySelectorAll('.finance-travel-form').forEach(form=>form.onsubmit=saveFinanceTransferReview);
 const packageForm=document.querySelector('#financePackageForm');if(packageForm)packageForm.onsubmit=saveFinanceTransferPackage;
 const dataCheck=document.querySelector('#financeDataCheckForm');if(dataCheck)dataCheck.onsubmit=saveFinanceDataCheck;
 if(scroll)el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function saveFinanceTransferPackage(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result');
 if(!body.package_rate){result.innerHTML='<div class="notice error">Choose a billing package.</div>';return;}
 const waived=body.package_rate==='waived';
 if(waived&&!String(body.package_notes||'').trim()){result.innerHTML='<div class="notice error">Add a reason for the no-charge exemption.</div>';return;}
 button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc('save_finance_transfer_package',{p_attendee_id:state.selectedFinanceAttendeeId,p_rate_code:waived?null:body.package_rate,p_waived:waived,p_notes:body.package_notes||null});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Save billing package';return;}
 toast('Transfer billing package saved');await loadInvoices();
}

async function saveFinanceTransferReview(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result');
 if(body.billing_reviewed&&!String(body.billing_review_notes||'').trim()){result.innerHTML='<div class="notice error">Add a review note before marking this transfer reviewed.</div>';return;}
 button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc('review_finance_transfer',{p_travel_id:form.dataset.financeTravelId,p_reviewed:!!body.billing_reviewed,p_notes:body.billing_review_notes||null});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Save transfer review';return;}
 toast('Transfer billing review saved');await loadInvoices();
}

async function saveFinanceDataCheck(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result');
 if(body.exception_flag&&!String(body.exception_reason||'').trim()){result.innerHTML='<div class="notice error">Add a reason for the billing exception.</div>';return;}
 button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc('mark_finance_attendee_checked',{p_attendee_id:state.selectedFinanceAttendeeId,p_exception_flag:!!body.exception_flag,p_exception_reason:body.exception_reason||null});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Mark data checked';return;}
 toast('Final Finance data check saved');await loadInvoices();
}

function renderFinanceConsolidated(){
 const el=document.querySelector('#financeConsolidated');if(!el)return;
 const sponsors=state.financeSponsors.filter(sponsor=>sponsor.consolidated_invoice_requested);
 if(!sponsors.length){el.innerHTML='<div class="empty">No sponsors have requested consolidated billing.</div>';return;}
 el.innerHTML=`<div class="consolidated-list">${sponsors.map(sponsor=>{
  const organisation=financeOrganisation(sponsor.organisation_id)||{};
  const attendees=state.financeAttendees.filter(attendee=>attendee.billing_account_organisation_id===sponsor.organisation_id&&attendee.consolidated_invoice_included);
  const ready=attendees.filter(attendee=>financeBillingReady(attendee.id)).length;
  const total=attendees.reduce((sum,attendee)=>sum+Number(financeSummary(attendee.id)?.estimated_gross_total||0),0);
  const existing=financeOpenInvoice(invoice=>invoice.invoice_type==='consolidated_company'&&invoice.billing_account_organisation_id===sponsor.organisation_id);
  const finalised=existing&&['approved','issued','paid'].includes(existing.status),canCreate=attendees.length>0&&ready===attendees.length&&!finalised;
  return `<article class="consolidated-card"><div><span class="status purple">Consolidated</span><h3>${esc(organisation.billing_name||organisation.organisation_name||'Sponsor account')}</h3><p>${attendees.length?`${ready} of ${attendees.length} attendee${attendees.length===1?'':'s'} ready`:'No attendees selected for this account'}</p></div><div class="consolidated-total"><strong>${money(total)}</strong><span>Estimated charges</span></div>${canEditFinance()?`<button class="btn btn-primary btn-small" data-create-consolidated="${sponsor.organisation_id}" ${canCreate?'':'disabled'}>${finalised?'Finalised':existing?'Rebuild draft':'Create draft'}</button>`:''}</article>`;
 }).join('')}</div>`;
 document.querySelectorAll('[data-create-consolidated]').forEach(button=>button.onclick=()=>createFinanceDraft('consolidated',button.dataset.createConsolidated,button));
}

function renderFinanceInvoices(){
 const el=document.querySelector('#invoiceTable'),detail=document.querySelector('#invoiceDetail');if(!el||!detail)return;
 if(!state.financeInvoices.length){el.innerHTML='<div class="empty">No invoice drafts have been created yet.</div>';detail.innerHTML='';return;}
 el.innerHTML=`<div class="table-scroll"><table class="data-table invoice-table"><thead><tr><th>Reference</th><th>Recipient</th><th>Type</th><th>Status</th><th>Gross</th><th></th></tr></thead><tbody>${state.financeInvoices.map(invoice=>{
  const attendee=state.financeAttendees.find(row=>row.id===invoice.attendee_id),organisation=financeOrganisation(invoice.billing_account_organisation_id);
  const recipient=invoice.invoice_type==='individual'?`${attendee?.first_name||''} ${attendee?.surname||''}`.trim():(organisation?.billing_name||organisation?.organisation_name||'Organisation');
  return `<tr><td><strong>${esc(invoice.invoice_reference||'Draft')}</strong><br><small>${formatDate(invoice.created_at)}</small></td><td>${esc(recipient||'—')}</td><td>${invoice.invoice_type==='individual'?'Individual':'Consolidated'}</td><td><span class="status ${invoiceStatusClass(invoice.status)}">${esc(invoiceStatusLabel(invoice.status))}</span></td><td>${money(invoice.gross_total)}</td><td><button class="btn btn-ghost btn-small" data-open-invoice="${invoice.id}">Open</button></td></tr>`;
 }).join('')}</tbody></table></div>`;
 document.querySelectorAll('[data-open-invoice]').forEach(button=>button.onclick=()=>{state.selectedInvoiceId=button.dataset.openInvoice;renderFinanceInvoiceDetail();});
 renderFinanceInvoiceDetail();
}

function renderFinanceInvoiceDetail(){
 const el=document.querySelector('#invoiceDetail');if(!el)return;
 const invoice=state.financeInvoices.find(row=>row.id===state.selectedInvoiceId);if(!invoice){el.innerHTML='';return;}
 const attendee=state.financeAttendees.find(row=>row.id===invoice.attendee_id),organisation=financeOrganisation(invoice.billing_account_organisation_id);
 const recipient=invoice.invoice_type==='individual'?`${attendee?.title_rank||''} ${attendee?.first_name||''} ${attendee?.surname||''}`.trim():(organisation?.billing_name||organisation?.organisation_name||'Organisation');
 const lines=state.financeLines.filter(line=>line.invoice_id===invoice.id);
 el.innerHTML=`<section class="invoice-detail"><div class="review-heading"><div><span class="status ${invoiceStatusClass(invoice.status)}">${esc(invoiceStatusLabel(invoice.status))}</span><h3>${esc(invoice.invoice_reference)}</h3><p>${esc(recipient)} · ${invoice.invoice_type==='individual'?'Individual invoice':'Consolidated sponsor invoice'}</p></div><button class="btn btn-ghost btn-small" id="closeInvoice">Close</button></div>${lines.length?`<div class="table-scroll"><table class="data-table invoice-lines"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Net</th><th>VAT</th><th>Gross</th></tr></thead><tbody>${lines.map(line=>`<tr><td><strong>${esc(line.description)}</strong><br><small>${esc(line.rate_code||line.source_type||'')}</small></td><td>${Number(line.quantity||0)}</td><td>${money(line.unit_price)}</td><td>${money(line.net_amount)}</td><td>${money(line.vat_amount)}</td><td>${money(line.gross_amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">Invoice totals</th><th>${money(invoice.net_total)}</th><th>${money(invoice.vat_total)}</th><th>${money(invoice.gross_total)}</th></tr></tfoot></table></div>`:'<div class="notice warn">This draft has no charge lines and cannot progress.</div>'}<div class="invoice-review-note"><strong>Review checkpoint</strong><span>Approval and issue controls will be added only after these calculated lines and the 2027 rate card are confirmed.</span></div></section>`;
 document.querySelector('#closeInvoice').onclick=()=>{state.selectedInvoiceId=null;renderFinanceInvoiceDetail();};
 el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function createFinanceDraft(type,targetId,button){
 const original=button.textContent;button.disabled=true;button.textContent='Creating…';
 const call=type==='individual'
  ?supabase.rpc('create_finance_individual_draft',{p_attendee_id:targetId})
  :supabase.rpc('create_finance_consolidated_draft',{p_event_id:EVENT_ID,p_organisation_id:targetId});
 const {data,error}=await call;
 if(error){toast(error.message);button.disabled=false;button.textContent=original;return;}
 state.selectedInvoiceId=data;toast(type==='individual'?'Individual draft ready for review':'Consolidated draft ready for review');await loadInvoices();
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
