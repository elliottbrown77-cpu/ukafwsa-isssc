import { createEventContentFeature } from '/event-content.js';
import { createRoomAllocator } from '/room-allocation.js';
import { createAdminSettings } from '/admin-settings.js';

const SUPABASE_URL = 'https://apugxrwhiyvwcrpzvgxj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WoZaQe5QeUDLb764uMWEtw_78rsp8Mi';
const EVENT_ID = '9c1c1d5e-d9f1-4f6b-b323-f3c35261fc19';
const TRAVEL_DATE_START = '2027-01-27';
const TRAVEL_DATE_END = '2027-02-09';
const EVENT_DATE_START = '2027-01-30';
const EVENT_DATE_END = '2027-02-06';
const ATTENDEE_CATEGORIES = ['Winter Sports Ambassador','Military Guest','Sponsor','Sponsor Guest','Royal Party','Proton','Committee','Committee Guest','Protocol','Protocol Intern','Hill Team','Other'];
const SPONSOR_CATEGORIES = new Set(['Sponsor','Sponsor Guest']);
const DISCIPLINE_CATEGORIES = new Set(['Hill Team']);
const SERVICE_CATEGORIES = new Set(['Winter Sports Ambassador','Committee']);
const PREARRANGED_ACCOMMODATION_CATEGORIES = new Set(['Protocol','Protocol Intern','Hill Team']);
const REGISTRATION_CATEGORY_OPTIONS = [
 ['Sponsor','Sponsor Representative'],
 ['Sponsor Guest',"Sponsor Representative's Guest (spouse/partner/dependant, etc.)"],
 ['Winter Sports Ambassador','Winter Sports Ambassador'],
 ['Military Guest',"Winter Sports Ambassador's Guest (spouse/partner/dependant)"],
 ['Committee','UKAFWSA Committee'],
 ['Committee Guest',"UKAFWSA Committee's Guest (spouse/partner/dependant, etc.)"],
 ['Hill Team','Hill Team / Race Committee'],
 ['Protocol','Core Protocol'],
 ['Protocol Intern','Protocol Intern'],
 ['Proton','Proton'],
 ['Royal Party','Royal Party'],
 ['Other','Other']
];
const ARRIVAL_TRANSFER_OPTIONS = [
 'Not required',
 'Required - on Thu 28 Jan 27 (Protocol only)',
 'Required - on Fri 29 Jan 27 (Hill Teams only)',
 'Required - bus on Sat 30 Jan 27 @ 11:30 (flight arrivals before 10:05)',
 'Required - bus on Sat 30 Jan 27 @ 14:30 (flight arrivals before 13:15)',
 'Required - bus on Wed 3 Feb 27 @ 11:00',
 'Required - bus on Wed 3 Feb 27 @ 15:00',
 'Required - special transfer (this must be arranged with a UKAFWSA representative before booking)'
];
const DEPARTURE_TRANSFER_OPTIONS = [
 'Not required',
 'Required - on Wed 3 Feb 27 @ 07:00',
 'Required - on Wed 3 Feb 27 @ 10:00',
 'Required - on Sat 6 Feb 27 @ 05:00 (flight departures after 09:00)',
 'Required - on Sat 6 Feb 27 @ 08:00 (flight departures after 12:00)',
 'Required - special transfer (this must be arranged with a UKAFWSA representative before booking)'
];
const SPECIAL_TRANSFER_PREFIX = 'Required - special transfer';
const LESSON_TYPES = [
 'Skiing / Private lesson / Basic level','Skiing / Private lesson / Intermediate level',
 'Skiing / Group lesson / Basic level','Skiing / Group lesson / Intermediate level',
 'Snowboard / Private lesson / Basic level','Snowboard / Private lesson / Intermediate level',
 'Snowboard / Group lesson / Basic level','Snowboard / Group lesson / Intermediate level'
];
const LESSON_DATES = ['2027-01-30','2027-01-31','2027-02-01','2027-02-02','2027-02-03','2027-02-04','2027-02-05'];
let supabase = null;
let eventFeature = null;
let roomAllocator = null;
let adminSettings = null;
let pendingLoginEmail = sessionStorage.getItem('isssc-staff-login-email') || '';

const ROUTES = new Set(['home','register','event','staff']);
const isAuthCallback = (hash=location.hash)=>/(?:^#|[&#])(access_token|refresh_token|error|error_code)=/.test(hash);
const requestedAuthRoute = new URLSearchParams(location.search).get('next') === 'event' ? 'event' : 'staff';
let authLanding = ['staff','event'].includes(new URLSearchParams(location.search).get('next')) || isAuthCallback();
const hashRoute = location.hash.replace('#/','');
const state = { route: authLanding ? requestedAuthRoute : (ROUTES.has(hashRoute) ? hashRoute : 'home'), session:null, profile:null, staffTab:'overview', protocolSection:'accommodation', manualPersonOpen:false, registrationSponsors:[], registrationContextLoaded:false, registrationContextLoading:false, registrationInvitation:null, operationalOverview:null, operationalOverviewError:null, intakeFilter:'pending', intakeRows:[], protocolRows:[], protocolQuery:'', protocolLookups:{locations:[],rooms:[],rates:[],organisations:[]}, sponsorRows:[], sponsorContacts:[], sponsorInvitations:[], sponsorAttendees:[], sponsorAllocations:[], sponsorQuery:'', selectedSponsorId:null, selectedSponsorContactId:null, newSponsor:false, financeReadiness:[], financeSummaries:[], financeAttendees:[], financeOrganisations:[], financeSponsors:[], financeInvoices:[], financeLines:[], financeDeliveries:[], financeRates:[], financePackages:[], financeTravel:[], financeBillingSettings:null, invoiceEmailCapabilities:null, financeQuery:'', financeFilter:'all', financeRateQuery:'', financeRateGroup:'all', financeRateCardOpen:false, financeBillingSettingsOpen:false, selectedFinanceRateId:null, selectedFinanceAttendeeId:null, selectedInvoiceId:null };
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
  <footer class="footer"><div class="footer-inner"><span>UK Armed Forces Winter Sports Association</span><span><a href="/privacy.html">Privacy</a> · ISSSC 2027 · Méribel · 30 Jan–6 Feb 2027</span></div></footer>
  </div>`;
}

function home(){
return `<section class="hero"><div class="hero-panel"><span class="eyebrow">${icon('❄')} ISSSC 2027</span><h1>One secure platform for the whole championship.</h1><p>Attendance, sponsor invitations, accommodation, travel, billing and live event information — designed for attendees, Protocol, Finance and the Sponsor team.</p><div class="actions"><button class="btn btn-primary" data-route="register">Register attendance</button><button class="btn btn-secondary" data-route="event">Open event app</button></div></div>
<div class="event-card"><div class="date">30</div><div class="month">January 2027</div><hr><dl><dt>Location</dt><dd>Méribel, France</dd><dt>Changeover</dt><dd>3 Feb</dd><dt>Final day</dt><dd>6 Feb</dd><dt>Lift area</dt><dd>3 Vallées</dd></dl><div class="actions"><button class="btn btn-primary" data-route="register">Start registration</button></div></div></section>
<section class="section"><div class="section-head"><div><h2>Built around the event</h2><p>Public requests go in once; the operational team controls the confirmed truth.</p></div></div><div class="grid grid-4">
${[['📝','Simple registration','One mobile-friendly form replaces the legacy attendee intake.'],['🏨','Protocol controlled','Assigned hotels, rooms, transfers and passes remain operational decisions.'],['£','Finance ready','Rate card, invoice snapshots and consolidated sponsor billing stay inside the database.'],['📣','Live event app','Programme, venues, notices, table plans, biographies and documents in one place.']].map(x=>`<article class="card"><div class="icon">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join('')}</div></section>
<section class="section grid grid-2"><div class="card"><span class="status purple">Attendee</span><h2>Your event in your pocket</h2><p>Register, then use the same web app during the week for schedules, race locations, announcements and event information. It can be installed to a phone home screen like an app.</p><div class="actions"><button class="btn btn-ghost" data-route="event">View event app</button></div></div><div class="card"><span class="status green">Staff</span><h2>One operational picture</h2><p>Protocol, Sponsor and Finance roles each get the tools they need without exposing sensitive or financial data to ordinary attendees.</p><div class="actions"><button class="btn btn-ghost" data-route="staff">Staff sign in</button></div></div></section>`;
}

function currentCategoryOptions(values){
 const mapped=values.map(value=>value==='Military VIP'?'Winter Sports Ambassador':value);
 if(values.includes('Military VIP')&&!mapped.includes('Proton'))mapped.splice(Math.max(mapped.length-1,0),0,'Proton');
 return mapped;
}
const opts=(arr,placeholder='Select…')=>`<option value="">${placeholder}</option>${currentCategoryOptions(arr).map(v=>`<option>${v}</option>`).join('')}`;
const pairedOptions=(arr,current='',placeholder='Select…')=>`<option value="">${placeholder}</option>${arr.map(([value,label])=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`).join('')}`;
const registrationCategoryOptions=(current='')=>pairedOptions(REGISTRATION_CATEGORY_OPTIONS,current,'Please select…');
const datedOptions=(arr,current='',placeholder='Please select…')=>`<option value="">${placeholder}</option>${arr.map(([value,label])=>`<option value="${value}" ${value===current?'selected':''}>${esc(label)}</option>`).join('')}`;
const ACCOMMODATION_START_OPTIONS = [
 ['2027-01-28','Thu 28 Jan 27 · Protocol only'],['2027-01-29','Fri 29 Jan 27 · Hill Team / Race Committee only'],
 ['2027-01-30','Sat 30 Jan 27'],['2027-01-31','Sun 31 Jan 27 · must be pre-agreed'],
 ['2027-02-01','Mon 1 Feb 27 · must be pre-agreed'],['2027-02-02','Tue 2 Feb 27 · must be pre-agreed'],
 ['2027-02-03','Wed 3 Feb 27'],['2027-02-04','Thu 4 Feb 27 · must be pre-agreed'],['2027-02-05','Fri 5 Feb 27 · must be pre-agreed']
];
const ACCOMMODATION_END_OPTIONS = [
 ['2027-01-31','Sun 31 Jan 27 · must be pre-agreed'],['2027-02-01','Mon 1 Feb 27 · must be pre-agreed'],
 ['2027-02-02','Tue 2 Feb 27 · must be pre-agreed'],['2027-02-03','Wed 3 Feb 27'],
 ['2027-02-04','Thu 4 Feb 27 · must be pre-agreed'],['2027-02-05','Fri 5 Feb 27 · must be pre-agreed'],['2027-02-06','Sat 6 Feb 27']
];
const SKI_START_OPTIONS = [
 ['2027-01-29','Fri 29 Jan 27 · Protocol only'],['2027-01-30','Sat 30 Jan 27 · must be pre-agreed'],
 ['2027-01-31','Sun 31 Jan 27'],['2027-02-01','Mon 1 Feb 27'],['2027-02-02','Tue 2 Feb 27'],
 ['2027-02-03','Wed 3 Feb 27'],['2027-02-04','Thu 4 Feb 27'],['2027-02-05','Fri 5 Feb 27']
];
const SKI_END_OPTIONS = [
 ['2027-01-31','Sun 31 Jan 27'],['2027-02-01','Mon 1 Feb 27'],['2027-02-02','Tue 2 Feb 27'],
 ['2027-02-03','Wed 3 Feb 27'],['2027-02-04','Thu 4 Feb 27'],['2027-02-05','Fri 5 Feb 27']
];
function register(){
return `<div class="hero-mini"><span class="eyebrow">Attendance request</span><h2>ISSSC 2027 registration</h2><p>Your answers are a request. Protocol confirms accommodation, transfers, lift passes and chargeable services before billing.</p></div>
<div class="surface"><div class="surface-head"><div><strong>Attendance details</strong><div class="muted small">30 January–6 February 2027 · Méribel</div></div><span class="status purple">Secure web form</span></div><div class="surface-body">
<form id="registrationForm" class="form-grid">
<div class="field full hidden"><label>Website</label><input name="website" autocomplete="off" tabindex="-1"></div>
<div class="field checkbox full"><input type="checkbox" id="onBehalf" name="submitted_on_behalf"><div><label for="onBehalf">I am completing this on behalf of someone else</label><small>We will keep the submitter and attendee details separate.</small></div></div>
<div class="field proxy hidden"><label>Your rank / title *</label><input name="proxy_title_rank" disabled></div><div class="field proxy hidden"><label>Your first name *</label><input name="proxy_first_name" disabled></div>
<div class="field proxy hidden"><label>Your surname *</label><input name="proxy_surname" disabled></div><div class="field proxy hidden"><label>Your email *</label><input type="email" name="proxy_email" disabled></div>
<div class="form-section"><h3>Attendee</h3><p>Who is attending ISSSC 2027?</p></div>
<div class="field"><label>Category *</label><select name="category" required>${registrationCategoryOptions(state.registrationInvitation?.category||'')}</select></div>
<div class="field hidden" id="sponsorOrganisationField"><label>Sponsor / organisation *</label><select name="sponsor_name" disabled>${registrationSponsorOptions(state.registrationInvitation?.sponsor_name||'')}</select><small>This list is managed by the Sponsor team in the staff site.</small></div>
<div class="field"><label>Rank / title *</label><input name="title_rank" required placeholder="e.g. AVM, Lt Gen, VAdm, Mr or Mrs"></div><div class="field"><label>Role / appointment *</label><input name="role" required placeholder="e.g. CEO, Director, Guest or Race Committee"></div>
<div class="field"><label>First name *</label><input name="first_name" required></div><div class="field"><label>Surname *</label><input name="surname" required></div>
<div class="field"><label>Post nominals</label><input name="post_nominals"></div><div class="field"><label>Email *</label><input type="email" name="email" required></div>
<div class="field"><label>Mobile number *</label><input name="mobile" inputmode="tel" required placeholder="07777 123456 or +44 7777 123456"></div><div class="field hidden" id="serviceField"><label>Service *</label><select name="service" disabled>${opts(['Army','Navy','RAF','Civil Service','Other'],'Please select…')}</select></div>
<div class="field hidden" id="disciplineField"><label>Discipline *</label><select name="discipline" disabled>${opts(['Alpine','Snowboard','Telemark','Other'],'Please select…')}</select><small>Required for Hill Team / Race Committee attendees.</small></div>
<div class="form-section"><h3>Accommodation</h3><p>Hotel choice is a preference only. Protocol will record the assigned hotel and room separately.</p></div>
<div class="field checkbox" id="accommodationRequiredField"><input type="checkbox" name="accommodation_required" id="acc"><div><label for="acc">I require accommodation</label><small id="prearrangedAccommodationNote" class="hidden">Accommodation is arranged for this category; enter the required dates below.</small></div></div>
<div class="notice accommodation-detail full hidden" id="packageDates"><strong>Available packages</strong><br>Full week: Sat 30 Jan–Sat 6 Feb · First half: Sat 30 Jan–Wed 3 Feb · Second half: Wed 3–Sat 6 Feb.</div>
<div class="field accommodation-detail hidden" id="hotelPreferenceField"><label>Hotel preference *</label><select name="hotel_preference" disabled></select><small>First come, first served; this is not a guaranteed allocation. Chalet is available only to the Proton category.</small></div>
<div class="field accommodation-detail hidden"><label>Accommodation from *</label><select name="accommodation_from" disabled>${datedOptions(ACCOMMODATION_START_OPTIONS)}</select><small id="sponsorDateNote" class="hidden">Sponsor arrivals are limited to Saturday 30 January or Wednesday 3 February.</small></div><div class="field accommodation-detail hidden"><label>Accommodation to *</label><select name="accommodation_to" disabled>${datedOptions(ACCOMMODATION_END_OPTIONS)}</select></div>
<div class="notice warn accommodation-detail full hidden" id="accommodationChargingNote">Dates outside the three standard packages may be charged at the full applicable half-week or full-week rate and must be agreed in advance.</div>
<div class="field checkbox accommodation-detail hidden" id="roomShareField"><input type="checkbox" name="share_room" id="share" disabled><label for="share">This attendee will share a room</label></div>
<div class="field sharing-detail hidden"><label>Who with? *</label><input name="sharing_with" disabled placeholder="Name of the person sharing"></div><div class="field sharing-detail hidden"><label>Room sharing option *</label><select name="room_sharing_option" disabled>${opts(['Double room','Twin room'],'Please select…')}</select></div>
<div class="field hidden" id="dinnerField"><label>Evening meals *</label><select name="dinners_required" disabled>${opts(['Dinner with event guests each night','B&B only / no event dinner'],'Please select…')}</select><small id="sponsorDinnerNote" class="hidden">Dinner with event guests is included for sponsors and sponsor guests.</small></div><div class="field hidden" id="dietaryField"><label>Dietary requirements</label><textarea name="dietary_requirements" disabled placeholder="e.g. gluten free or vegetarian"></textarea></div>
<div class="form-section"><h3>Arrival</h3><p>Travel details help Protocol coordinate transfers.</p></div>
<div class="notice warn full">Travel outside the scheduled UKAFWSA dates and times is the traveller's responsibility. UKAFWSA will not arrange or fund transport outside scheduled transfers.</div>
<div class="field"><label>Method of transport *</label><select name="arrival_method" required>${opts(['Flight','Self Drive','Other'],'Please select…')}</select></div>
<div class="field hidden" id="arrivalOtherField"><label>Other arrival method *</label><input name="arrival_method_other" disabled placeholder="Describe how you are travelling"></div>
<div class="field arrival-flight-detail hidden"><label>Arrival airport *</label><select name="arrival_airport_station" disabled>${opts(['GVA','Other'],'Please select…')}</select></div><div class="field hidden" id="arrivalAirportOtherField"><label>Other arrival airport *</label><input name="arrival_airport_other" disabled></div>
<div class="field arrival-flight-detail hidden"><label>Arrival flight number *</label><input name="arrival_number" disabled></div>${dateTimeField('arrival_datetime','Arrival flight date and time','',' disabled','arrival-flight-detail hidden')}
<div class="field arrival-flight-detail hidden"><label>Airport transfer provided by UKAFWSA *</label><select name="arrival_transfer_option" disabled>${opts(ARRIVAL_TRANSFER_OPTIONS,'Please select…')}</select><small>Coach times are departures from the airport. Allow time for baggage, customs and passport control.</small></div>
${dateTimeField('arrival_special_transfer_datetime','Date and time of special arrival transfer','',' disabled','arrival-special-detail hidden')}
${dateTimeField('arrival_resort_datetime','Expected arrival date and time in Méribel','',' disabled','arrival-resort-detail hidden')}
<div class="form-section"><h3>Departure</h3><p>Enter the scheduled flight, train, coach or road departure. Protocol will confirm any resort pickup time.</p></div>
<div class="notice warn full">Travel outside the scheduled UKAFWSA dates and times is the traveller's responsibility. UKAFWSA will not arrange or fund transport outside scheduled transfers.</div>
<div class="field"><label>Method of transport *</label><select name="departure_method" required>${opts(['Flight','Self Drive','Other'],'Please select…')}</select></div>
<div class="field hidden" id="departureOtherField"><label>Other departure method *</label><input name="departure_method_other" disabled placeholder="Describe how you are travelling"></div>
<div class="field departure-flight-detail hidden"><label>Departure airport *</label><select name="departure_airport_station" disabled>${opts(['GVA','Other'],'Please select…')}</select></div><div class="field hidden" id="departureAirportOtherField"><label>Other departure airport *</label><input name="departure_airport_other" disabled></div>
<div class="field departure-flight-detail hidden"><label>Departure flight number *</label><input name="departure_number" disabled></div>${dateTimeField('departure_datetime','Departure flight date and time','',' disabled','departure-flight-detail hidden')}
<div class="field departure-flight-detail hidden"><label>Airport transfer provided by UKAFWSA *</label><select name="departure_transfer_option" disabled>${opts(DEPARTURE_TRANSFER_OPTIONS,'Please select…')}</select><small>Coach times are departures from Méribel. Allow approximately two hours to reach Geneva Airport.</small></div>
${dateTimeField('departure_special_transfer_datetime','Date and time of special departure transfer','',' disabled','departure-special-detail hidden')}
${dateTimeField('departure_resort_datetime','Departure date and time from Méribel','',' disabled','departure-resort-detail hidden')}
<div class="form-section"><h3>On snow</h3></div>
<div class="notice full">UKAFWSA provides full-day 3 Vallées passes. Pedestrian and half-day passes must be purchased independently.</div>
<div class="field checkbox" id="liftPassField"><input type="checkbox" name="lift_pass_required" id="lift"><label for="lift">I require a 3 Vallées lift pass</label></div><div class="notice hidden" id="carreIncluded"><strong>Carre Neige included.</strong> It is automatically added to every event lift pass and cannot be removed.</div>
<div class="field lift-detail hidden"><label>First day skiing *</label><select name="first_ski_day" disabled>${datedOptions(SKI_START_OPTIONS)}</select><small>Usually the day after arrival.</small></div><div class="field lift-detail hidden"><label>Last day skiing *</label><select name="last_ski_day" disabled>${datedOptions(SKI_END_OPTIONS)}</select><small>Usually the day before departure.</small></div>
<div class="field lift-detail hidden"><label>Date of birth *</label><input type="date" name="date_of_birth" disabled><small>Required only to arrange Carre Neige with the lift pass.</small></div>
<div class="field checkbox" id="lessonsField"><input type="checkbox" name="lessons_required" id="lessons"><label for="lessons">I require skiing or snowboarding lessons</label></div>
<div class="field lesson-detail hidden"><label>Lesson type *</label><select name="lesson_type" disabled>${opts(LESSON_TYPES,'Please select…')}</select><small>Group lessons: £115.50 per person per lesson. Private lessons: £240 per lesson.</small></div>
<fieldset class="field lesson-detail full hidden" id="lessonDatesField"><legend>Lesson dates *</legend><div class="choice-grid">${LESSON_DATES.map(date=>`<label><input type="checkbox" name="lesson_date" value="${date}" disabled><span>${esc(displayEventDate(date))}</span></label>`).join('')}</div></fieldset>
<div class="field checkbox"><input type="checkbox" name="equipment_hire_required" id="hire"><div><label for="hire">I require ski, snowboard or equipment hire</label><small>This records the requirement only. Protocol will coordinate any information needed later.</small></div></div>
<div class="field full"><label>Anything else Protocol should know?</label><textarea name="other_information"></textarea></div>
<div class="field full"><div class="notice warn">Submitting this form does not create a final bill. Protocol confirms what was actually supplied; Finance calculates charges from the approved event rate card.</div></div>
<div class="field checkbox full"><input type="checkbox" required name="privacy_acknowledged" id="privacyAcknowledged"><div><label for="privacyAcknowledged">I have read the <a href="/privacy.html" target="_blank" rel="noopener">privacy notice</a> *</label><small>Your information is used to administer attendance, accommodation, travel, lift passes, safety and billing for ISSSC 2027.</small></div></div>
<div class="field full"><button class="btn btn-primary" type="submit" id="submitRegistration">Submit attendance request</button><div id="formResult"></div></div>
</form></div></div>`;
}

function eventApp(){
return eventFeature ? eventFeature.publicMarkup() : `<div class="hero-mini"><span class="eyebrow">Event app</span><h2>ISSSC 2027 in Méribel</h2><p>Connecting to live event information...</p></div><div class="surface"><div class="surface-body empty">Loading event app...</div></div>`;
}

function staffLogin(){
if(pendingLoginEmail){
return `<div class="login-box"><div class="brand-lockup"><img src="/ukafwsa-mark.svg" alt=""><div><h2 style="margin:0">Enter your sign-in code</h2><div class="muted">Staff portal</div></div></div><p class="muted">We sent a six-digit code to <strong>${esc(pendingLoginEmail)}</strong>. Enter it below; this avoids security scanners consuming one-use email links.</p><form id="otpForm" class="form-grid"><div class="field full"><label>Six-digit code</label><input name="token" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required placeholder="000000"></div><div class="field full"><button class="btn btn-primary" type="submit">Sign in</button></div><div id="loginResult" class="field full"></div></form><div class="actions"><button class="btn btn-ghost btn-small" id="resendLoginCode" type="button">Send a new code</button><button class="btn btn-ghost btn-small" id="changeLoginEmail" type="button">Use a different email</button></div></div>`;
}
return `<div class="login-box"><div class="brand-lockup"><img src="/ukafwsa-mark.svg" alt=""><div><h2 style="margin:0">Staff portal</h2><div class="muted">Protocol · Notifications · Sponsor · Finance · Content</div></div></div><p class="muted">Enter your authorised email address and we will send you a secure six-digit sign-in code.</p><form id="loginForm" class="form-grid"><div class="field full"><label>Email</label><input name="email" type="email" autocomplete="email" required placeholder="name@example.com"></div><div class="field full"><button class="btn btn-primary" type="submit">Send sign-in code</button></div><div id="loginResult" class="field full"></div></form></div>`;
}
function staffDashboard(){
const role=state.profile?.app_role || 'authenticated';
const canSendNotifications=['admin','protocol','operations','content_manager'].includes(role);
const tabs=[['overview','Overview'],['intake','New registrations'],['protocol','Protocol'],...(canSendNotifications?[['notifications','Notifications']]:[]),['sponsors','Sponsors'],['finance','Finance'],['content','Event content'],...(role==='admin'?[['admin','Admin settings']]:[])];
return `<div class="dashboard-shell"><aside class="side"><h3>Staff portal</h3>${tabs.map(([r,l])=>`<button data-stafftab="${r}" class="${state.staffTab===r?'active':''}">${l}</button>`).join('')}<button id="signOutBtn">Sign out</button></aside><div class="dash-main"><div class="hero-mini"><span class="eyebrow">Role: ${role}</span><h2>${staffTitle()}</h2><p>${staffSubtitle()}</p></div><div id="staffPanel">${staffPanel()}</div></div></div>`;
}
function staffTitle(){return ({overview:'Operational overview',intake:'Registration intake',protocol:'Protocol operations',notifications:'Staff notifications',sponsors:'Sponsor management',finance:'Finance & billing',content:'Event app content',admin:'Administration'})[state.staffTab]}
function staffSubtitle(){return ({overview:'One view of the event workflow.',intake:'Review public attendee requests before they become canonical records.',protocol:'Confirm hotel, room, transfer, lift pass and usage data.',notifications:'Publish notices and send browser alerts to enrolled devices.',sponsors:'Permanent organisations with event-year sponsorship and invitations.',finance:'Review rates, billing readiness and immutable invoice snapshots.',content:'Publish programme, venues, results, media and table plans.',admin:'Manage staff access and operational email settings.'})[state.staffTab]}
function attendeeProtocolMarkup(){return `<div class="surface"><div class="surface-head"><div><strong>Attendee operations</strong><div class="muted small">Maintain the approved attendee record, then confirm accommodation charging, travel and lift-pass services.</div></div><div class="protocol-tools"><label class="small muted" for="protocolSearch">Find attendee</label><input id="protocolSearch" type="search" placeholder="Name, email or organisation" value="${esc(state.protocolQuery)}"><button class="btn btn-ghost" id="refreshProtocol">Refresh</button></div></div><div class="surface-body"><div id="protocolTable" class="empty">Loading attendees…</div><div id="protocolDetail"></div></div></div>`}
function protocolWorkspace(){
 const tabs=[['accommodation','Room allocation'],['transfers','Transfers'],['attendees','Attendee records']];
 const content=state.protocolSection==='accommodation'?(roomAllocator?roomAllocator.markup():'<div class="surface"><div class="surface-body empty">Loading room allocation tools…</div></div>'):state.protocolSection==='transfers'?(eventFeature?eventFeature.protocolMarkup():''):attendeeProtocolMarkup();
 return `<div class="protocol-workspace-toolbar"><nav class="protocol-workspace-nav" aria-label="Protocol work areas">${tabs.map(([key,label])=>`<button data-protocol-section="${key}" class="${state.protocolSection===key?'active':''}">${label}</button>`).join('')}</nav>${canEditProtocol()?'<button class="btn btn-primary" id="addProtocolPerson" type="button">Add person</button>':''}</div>${state.manualPersonOpen?manualPersonMarkup():''}${content}`;
}
function staffPanel(){
if(state.staffTab==='overview') return operationalOverviewMarkup();
if(state.staffTab==='intake') return `<div class="surface"><div class="surface-head"><div><strong>Registration review</strong><div class="muted small">Open a request to review every submitted detail before making a decision.</div></div><div class="intake-tools"><label class="small muted" for="intakeFilter">Show</label><select id="intakeFilter"><option value="pending">Pending</option><option value="review_required">Needs follow-up</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="all">All</option></select><button class="btn btn-ghost" id="refreshIntake">Refresh</button></div></div><div class="surface-body"><div id="intakeTable" class="empty">Loading registrations…</div><div id="intakeDetail"></div></div></div>`;
if(state.staffTab==='protocol') return protocolWorkspace();
if(state.staffTab==='notifications') return eventFeature ? eventFeature.notificationMarkup() : '<div class="surface"><div class="surface-body empty">Loading notification tools...</div></div>';
if(state.staffTab==='sponsors') return `<div class="surface"><div class="surface-head"><div><strong>Event sponsors</strong><div class="muted small">Manage sponsor terms, billing details, contacts, invitations and attendee accounts.</div></div><div class="sponsor-tools"><input id="sponsorSearch" type="search" placeholder="Find sponsor" value="${esc(state.sponsorQuery)}"><button class="btn btn-ghost" id="refreshSponsors">Refresh</button>${canEditSponsors()?'<button class="btn btn-primary" id="addSponsor">Add sponsor</button>':''}</div></div><div class="surface-body"><div id="sponsorMetrics"></div><div id="sponsorTable" class="empty">Loading sponsors…</div><div id="sponsorDetail"></div></div></div>`;
if(state.staffTab==='finance') return `<div id="financeMetrics" class="grid grid-4"><div class="card metric"><strong>—</strong><span>Ready for invoice</span></div><div class="card metric"><strong>—</strong><span>Blocked</span></div><div class="card metric"><strong>—</strong><span>Draft invoices</span></div><div class="card metric"><strong>—</strong><span>Draft value</span></div></div>
<section class="section"><div class="notice"><strong>Invoice snapshots are protected.</strong> Rate changes update current calculations and mark open drafts for rebuilding. Confirmed, issued and paid invoice lines retain the values captured when they were confirmed.</div></section>
<section class="section"><div class="surface billing-settings-surface"><div class="surface-head billing-settings-head"><div><strong>Billing settings</strong><div class="muted small">Invoice issuer, payment instructions and standard payment terms.</div><div id="financeBillingSummary" class="rate-card-head-summary small muted">Loading billing status…</div></div><button class="btn btn-ghost rate-card-toggle" id="toggleFinanceBilling" type="button" aria-expanded="${state.financeBillingSettingsOpen}"><span>${state.financeBillingSettingsOpen?'Hide':'Show'} billing settings</span><span class="rate-card-chevron" aria-hidden="true">${state.financeBillingSettingsOpen?'▲':'▼'}</span></button></div><div id="financeBillingContent" class="surface-body ${state.financeBillingSettingsOpen?'':'hidden'}"><div id="financeBillingSettingsPanel" class="empty">Loading billing settings…</div></div></div></section>
<section class="section"><div class="surface rate-card-surface"><div class="surface-head rate-card-head"><div><strong>2027 rate card</strong><div class="muted small">Maintain the confirmed prices used for current calculations and future invoice drafts.</div><div id="financeRateSummary" class="rate-card-head-summary small muted">Loading rate status…</div></div><button class="btn btn-ghost rate-card-toggle" id="toggleFinanceRates" type="button" aria-expanded="${state.financeRateCardOpen}"><span>${state.financeRateCardOpen?'Hide':'Show'} rate card</span><span class="rate-card-chevron" aria-hidden="true">${state.financeRateCardOpen?'▲':'▼'}</span></button></div><div id="financeRateContent" class="surface-body ${state.financeRateCardOpen?'':'hidden'}"><div class="finance-tools rate-card-tools"><input id="financeRateSearch" type="search" placeholder="Find rate" value="${esc(state.financeRateQuery)}"><select id="financeRateGroup" aria-label="Rate category"><option value="all">All rates</option><option value="accommodation">Accommodation</option><option value="passes">Lift passes</option><option value="transfers">Transfers and admin</option><option value="hospitality">Dining and champagne</option><option value="lessons">Lessons</option></select></div><div id="financeRateTable" class="empty">Loading rate card…</div><div id="financeRateDetail"></div></div></div></section>
<section class="section"><div class="surface"><div class="surface-head"><div><strong>Attendee billing readiness</strong><div class="muted small">Resolve each blocker before creating an individual or consolidated draft.</div></div><div class="finance-tools"><input id="financeSearch" type="search" placeholder="Find attendee or account" value="${esc(state.financeQuery)}"><select id="financeFilter" aria-label="Readiness filter"><option value="all">All attendees</option><option value="ready">Ready</option><option value="blocked">Blocked</option><option value="consolidated">Consolidated</option></select><button class="btn btn-ghost" id="refreshFinance">Refresh</button></div></div><div class="surface-body"><div id="financeReadiness" class="empty">Loading billing readiness…</div><div id="financeAttendeeDetail"></div></div></div></section>
<section class="section"><div class="surface"><div class="surface-head"><div><strong>Consolidated sponsor accounts</strong><div class="muted small">Only attendees explicitly linked for consolidated billing are included.</div></div></div><div class="surface-body"><div id="financeConsolidated" class="empty">Loading sponsor accounts…</div></div></div></section>
<section class="section"><div class="surface"><div class="surface-head"><div><strong>Invoices</strong><div class="muted small">Review charge lines, confirm the invoice, record issue and then record payment.</div></div></div><div class="surface-body"><div id="invoiceTable" class="empty">Loading invoices…</div><div id="invoiceDetail"></div></div></div></section>`;
if(state.staffTab==='admin'&&state.profile?.app_role==='admin')return adminSettings?adminSettings.markup():'<div class="surface"><div class="surface-body empty">Loading Admin settings…</div></div>';
return eventFeature ? eventFeature.staffMarkup() : '<div class="surface"><div class="surface-body empty">Loading event content tools...</div></div>';
}
function staff(){
 if(!state.session)return staffLogin();
 if(!state.profile||state.profile.active===false||state.profile.app_role==='attendee')return `<div class="login-box"><div class="brand-lockup"><img src="/ukafwsa-mark.svg" alt=""><div><h2 style="margin:0">Staff access not authorised</h2><div class="muted">This signed-in email does not have an active staff role.</div></div></div><p class="muted">Ask an administrator to add this email address in Admin settings, then sign in again.</p><button class="btn btn-primary" id="signOutBtn">Sign out</button></div>`;
 return staffDashboard();
}

function render(){
  const content = state.route==='register'?register():state.route==='event'?eventApp():state.route==='staff'?staff():home();
  app.innerHTML=layout(content);bind();
  if(state.route==='register')loadRegistrationContext();
  if(state.route==='staff' && state.session && state.profile && state.profile.active!==false && state.profile.app_role!=='attendee') loadStaffData();
  if(state.route==='event' && eventFeature) eventFeature.loadPublic();
}
function bind(){
  document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>setRoute(b.dataset.route)));
  const menu=document.querySelector('#menuBtn'),nav=document.querySelector('#nav');if(menu) menu.onclick=()=>nav.classList.toggle('open');
  const ob=document.querySelector('#onBehalf');if(ob) ob.onchange=applyRegistrationRules;
  const reg=document.querySelector('#registrationForm');if(reg){
   reg.addEventListener('submit',submitRegistration);reg.addEventListener('invalid',registrationInvalid,true);
   ['category','accommodation_required','share_room','dinners_required','arrival_method','arrival_airport_station','arrival_transfer_option','departure_method','departure_airport_station','departure_transfer_option','lift_pass_required','lessons_required'].forEach(name=>{if(reg.elements[name])reg.elements[name].onchange=applyRegistrationRules;});
   applyRegistrationRules();
  }
  const login=document.querySelector('#loginForm');if(login) login.addEventListener('submit',sendLoginLink);
  const otp=document.querySelector('#otpForm');if(otp)otp.addEventListener('submit',verifyLoginCode);
  const resend=document.querySelector('#resendLoginCode');if(resend)resend.onclick=resendLoginCode;
  const changeEmail=document.querySelector('#changeLoginEmail');if(changeEmail)changeEmail.onclick=()=>{pendingLoginEmail='';sessionStorage.removeItem('isssc-staff-login-email');render()};
  document.querySelectorAll('[data-stafftab]').forEach(b=>b.onclick=()=>{state.staffTab=b.dataset.stafftab;render()});
  document.querySelectorAll('[data-overview-target]').forEach(b=>b.onclick=()=>openOverviewTarget(b));
  document.querySelectorAll('[data-protocol-section]').forEach(b=>b.onclick=()=>{state.protocolSection=b.dataset.protocolSection;state.manualPersonOpen=false;render()});
  const addProtocolPerson=document.querySelector('#addProtocolPerson');if(addProtocolPerson)addProtocolPerson.onclick=openManualPerson;
  const closeProtocolPerson=document.querySelector('#closeManualPerson');if(closeProtocolPerson)closeProtocolPerson.onclick=()=>{state.manualPersonOpen=false;render()};
  const manualPersonForm=document.querySelector('#manualPersonForm');if(manualPersonForm)manualPersonForm.onsubmit=saveManualPerson;
  const out=document.querySelector('#signOutBtn');if(out) out.onclick=async()=>{await supabase.auth.signOut();state.session=null;state.profile=null;state.operationalOverview=null;state.invoiceEmailCapabilities=null;render();};
  const ref=document.querySelector('#refreshIntake');if(ref) ref.onclick=loadIntake;
  const refreshOverview=document.querySelector('#refreshOverview');if(refreshOverview)refreshOverview.onclick=()=>loadOperationalOverview(true);
  const filter=document.querySelector('#intakeFilter');if(filter){filter.value=state.intakeFilter;filter.onchange=()=>{state.intakeFilter=filter.value;loadIntake()};}
  const protocolRefresh=document.querySelector('#refreshProtocol');if(protocolRefresh)protocolRefresh.onclick=loadProtocol;
  const protocolSearch=document.querySelector('#protocolSearch');if(protocolSearch)protocolSearch.oninput=()=>{state.protocolQuery=protocolSearch.value;renderProtocolRows();};
  const sponsorRefresh=document.querySelector('#refreshSponsors');if(sponsorRefresh)sponsorRefresh.onclick=loadSponsors;
  const sponsorSearch=document.querySelector('#sponsorSearch');if(sponsorSearch)sponsorSearch.oninput=()=>{state.sponsorQuery=sponsorSearch.value;renderSponsorRows();};
  const addSponsor=document.querySelector('#addSponsor');if(addSponsor)addSponsor.onclick=()=>{state.newSponsor=true;state.selectedSponsorId=null;state.selectedSponsorContactId=null;renderSponsorDetail();};
  const financeRefresh=document.querySelector('#refreshFinance');if(financeRefresh)financeRefresh.onclick=loadInvoices;
  const financeSearch=document.querySelector('#financeSearch');if(financeSearch)financeSearch.oninput=()=>{state.financeQuery=financeSearch.value;renderFinanceReadiness();};
  const financeFilter=document.querySelector('#financeFilter');if(financeFilter){financeFilter.value=state.financeFilter;financeFilter.onchange=()=>{state.financeFilter=financeFilter.value;renderFinanceReadiness();};}
  const toggleFinanceBilling=document.querySelector('#toggleFinanceBilling');if(toggleFinanceBilling)toggleFinanceBilling.onclick=()=>{state.financeBillingSettingsOpen=!state.financeBillingSettingsOpen;const content=document.querySelector('#financeBillingContent');content?.classList.toggle('hidden',!state.financeBillingSettingsOpen);toggleFinanceBilling.setAttribute('aria-expanded',String(state.financeBillingSettingsOpen));toggleFinanceBilling.querySelector('span:first-child').textContent=`${state.financeBillingSettingsOpen?'Hide':'Show'} billing settings`;toggleFinanceBilling.querySelector('.rate-card-chevron').textContent=state.financeBillingSettingsOpen?'▲':'▼';if(state.financeBillingSettingsOpen)renderFinanceBillingSettings();};
  const toggleFinanceRates=document.querySelector('#toggleFinanceRates');if(toggleFinanceRates)toggleFinanceRates.onclick=()=>{state.financeRateCardOpen=!state.financeRateCardOpen;const content=document.querySelector('#financeRateContent');content?.classList.toggle('hidden',!state.financeRateCardOpen);toggleFinanceRates.setAttribute('aria-expanded',String(state.financeRateCardOpen));toggleFinanceRates.querySelector('span:first-child').textContent=`${state.financeRateCardOpen?'Hide':'Show'} rate card`;toggleFinanceRates.querySelector('.rate-card-chevron').textContent=state.financeRateCardOpen?'▲':'▼';if(state.financeRateCardOpen)renderFinanceRates();};
  const financeRateSearch=document.querySelector('#financeRateSearch');if(financeRateSearch)financeRateSearch.oninput=()=>{state.financeRateQuery=financeRateSearch.value;renderFinanceRates();};
  const financeRateGroup=document.querySelector('#financeRateGroup');if(financeRateGroup){financeRateGroup.value=state.financeRateGroup;financeRateGroup.onchange=()=>{state.financeRateGroup=financeRateGroup.value;renderFinanceRates();};}
  if(state.route==='event'&&eventFeature)eventFeature.bindPublic();
  if(state.route==='staff'&&state.staffTab==='content'&&eventFeature)eventFeature.bindStaff();
  if(state.route==='staff'&&state.staffTab==='protocol'&&state.protocolSection==='transfers'&&eventFeature)eventFeature.bindProtocol();
  if(state.route==='staff'&&state.staffTab==='protocol'&&state.protocolSection==='accommodation'&&roomAllocator)roomAllocator.bind();
  if(state.route==='staff'&&state.staffTab==='admin'&&adminSettings)adminSettings.bind();
}

function formObject(form){
 const fd=new FormData(form),obj={};
 for(const [k,v] of fd.entries()) obj[k]=v;
 form.querySelectorAll('input[type=checkbox]').forEach(c=>obj[c.name]=c.checked);
 return obj;
}
function registrationSponsorOptions(current=''){
 if(!state.registrationContextLoaded)return '<option value="">Loading sponsor list…</option>';
 const items=[...state.registrationSponsors];
 if(current&&!items.some(item=>item.sponsor_name===current))items.unshift({sponsor_name:current});
 return `<option value="">${items.length?'Select sponsor…':'No confirmed sponsors available'}</option>${items.map(item=>`<option value="${esc(item.sponsor_name)}" ${item.sponsor_name===current?'selected':''}>${esc(item.sponsor_name)}</option>`).join('')}`;
}
async function loadRegistrationContext(){
 if(!supabase||state.registrationContextLoaded||state.registrationContextLoading)return;
 state.registrationContextLoading=true;
 const invite=new URLSearchParams(location.search).get('invite');
 const [sponsors,invitation]=await Promise.all([
  supabase.rpc('get_registration_sponsors_v2',{p_event_id:EVENT_ID}),
  invite?supabase.rpc('get_registration_invitation_v2',{p_event_id:EVENT_ID,p_invitation_code:invite}):Promise.resolve({data:[],error:null})
 ]);
 state.registrationSponsors=sponsors.error?[]:(sponsors.data||[]);
 state.registrationInvitation=invitation.error?null:(invitation.data?.[0]||null);
 state.registrationContextLoaded=true;state.registrationContextLoading=false;
 const form=document.querySelector('#registrationForm');if(!form)return;
 const sponsor=form.elements.sponsor_name,current=state.registrationInvitation?.sponsor_name||sponsor.value;
 sponsor.innerHTML=registrationSponsorOptions(current);sponsor.value=current||'';
 if(state.registrationInvitation){
  form.elements.category.value=state.registrationInvitation.category==='Military VIP'?'Winter Sports Ambassador':(state.registrationInvitation.category||'Sponsor Guest');
  if(!form.elements.email.value)form.elements.email.value=state.registrationInvitation.invitee_email||'';
 }
 applyRegistrationRules();
}
function applyRegistrationRules(){
 const form=document.querySelector('#registrationForm');if(!form)return;
 const category=form.elements.category.value,isSponsor=SPONSOR_CATEGORIES.has(category),hasDiscipline=DISCIPLINE_CATEGORIES.has(category),showService=SERVICE_CATEGORIES.has(category),prearranged=PREARRANGED_ACCOMMODATION_CATEGORIES.has(category);
 form.elements.category.disabled=!!state.registrationInvitation;form.elements.email.readOnly=!!state.registrationInvitation;
 const proxy=form.elements.submitted_on_behalf.checked;document.querySelectorAll('.proxy').forEach(field=>field.classList.toggle('hidden',!proxy));['proxy_title_rank','proxy_first_name','proxy_surname','proxy_email'].forEach(name=>{const control=form.elements[name];control.disabled=!proxy;control.required=proxy;if(!proxy)control.value='';});
 const discipline=document.querySelector('#disciplineField');discipline.classList.toggle('hidden',!hasDiscipline);form.elements.discipline.disabled=!hasDiscipline;form.elements.discipline.required=hasDiscipline;if(!hasDiscipline)form.elements.discipline.value='';
 const service=document.querySelector('#serviceField');service.classList.toggle('hidden',!showService);form.elements.service.disabled=!showService;form.elements.service.required=showService;if(!showService)form.elements.service.value='';
 const sponsorField=document.querySelector('#sponsorOrganisationField');sponsorField.classList.toggle('hidden',!isSponsor);form.elements.sponsor_name.disabled=!isSponsor||!state.registrationContextLoaded||!!state.registrationInvitation;form.elements.sponsor_name.required=isSponsor&&!state.registrationInvitation;
 if(!isSponsor&&!state.registrationInvitation)form.elements.sponsor_name.value='';
 const accommodationField=document.querySelector('#accommodationRequiredField');form.elements.accommodation_required.disabled=prearranged;accommodationField.classList.toggle('prearranged-choice',prearranged);document.querySelector('#prearrangedAccommodationNote').classList.toggle('hidden',!prearranged);if(prearranged)form.elements.accommodation_required.checked=true;
 const needsRoom=form.elements.accommodation_required.checked;
 const hotel=form.elements.hotel_preference,hotelCurrent=hotel.value,hotels=category==='Proton'?[['Eterlou',"L'Eterlou"],['Chaudanne','La Chaudanne'],['Savoy','Le Savoy'],['Chalet','Chalet'],['No preference','No preference']]:[['Eterlou',"L'Eterlou"],['Chaudanne','La Chaudanne'],['Savoy','Le Savoy'],['No preference','No preference']];
 hotel.innerHTML=pairedOptions(hotels,hotelCurrent,'Please select…');if(hotels.some(([value])=>value===hotelCurrent))hotel.value=hotelCurrent;
 document.querySelectorAll('.accommodation-detail').forEach(field=>field.classList.toggle('hidden',!needsRoom));
 document.querySelectorAll('.accommodation-detail input,.accommodation-detail select').forEach(control=>control.disabled=!needsRoom);
 const from=form.elements.accommodation_from,fromCurrent=from.value,availableStarts=prearranged?ACCOMMODATION_START_OPTIONS:(isSponsor?ACCOMMODATION_START_OPTIONS.filter(([value])=>['2027-01-30','2027-02-03'].includes(value)):ACCOMMODATION_START_OPTIONS.filter(([value])=>value>='2027-01-30'));
 from.innerHTML=datedOptions(availableStarts,fromCurrent);if([...from.options].some(option=>option.value===fromCurrent))from.value=fromCurrent;
 form.elements.accommodation_from.required=needsRoom;form.elements.accommodation_to.required=needsRoom;
 const showHotel=needsRoom&&!prearranged;document.querySelector('#hotelPreferenceField').classList.toggle('hidden',!showHotel);hotel.disabled=!showHotel;hotel.required=showHotel;if(!showHotel)hotel.value='';
 document.querySelector('#sponsorDateNote').classList.toggle('hidden',!isSponsor);
 const allowShare=needsRoom&&!prearranged;document.querySelector('#roomShareField').classList.toggle('hidden',!allowShare);form.elements.share_room.disabled=!allowShare;if(!allowShare)form.elements.share_room.checked=false;
 const sharing=allowShare&&form.elements.share_room.checked;document.querySelectorAll('.sharing-detail').forEach(field=>field.classList.toggle('hidden',!sharing));['sharing_with','room_sharing_option'].forEach(name=>{const control=form.elements[name];control.disabled=!sharing;control.required=sharing;if(!sharing)control.value='';});
 const dinner=form.elements.dinners_required,showDinner=needsRoom&&!prearranged;document.querySelector('#dinnerField').classList.toggle('hidden',!showDinner);dinner.disabled=!showDinner||isSponsor;dinner.required=showDinner&&!isSponsor;document.querySelector('#sponsorDinnerNote').classList.toggle('hidden',!(needsRoom&&isSponsor));if(needsRoom&&isSponsor)dinner.value='Dinner with event guests each night';else if(!showDinner)dinner.value='';
 const hasMeals=needsRoom&&(isSponsor||dinner.value==='Dinner with event guests each night');document.querySelector('#dietaryField').classList.toggle('hidden',!hasMeals);form.elements.dietary_requirements.disabled=!hasMeals;if(!hasMeals)form.elements.dietary_requirements.value='';
 ['arrival','departure'].forEach(direction=>{
  const method=form.elements[`${direction}_method`].value,isFlight=method==='Flight',isOther=method==='Other';
  document.querySelector(`#${direction}OtherField`).classList.toggle('hidden',!isOther);form.elements[`${direction}_method_other`].disabled=!isOther;form.elements[`${direction}_method_other`].required=isOther;if(!isOther)form.elements[`${direction}_method_other`].value='';
  document.querySelectorAll(`.${direction}-flight-detail`).forEach(field=>field.classList.toggle('hidden',!isFlight));
  [`${direction}_airport_station`,`${direction}_number`,`${direction}_datetime_date`,`${direction}_datetime_time`,`${direction}_transfer_option`].forEach(name=>{const control=form.elements[name];control.disabled=!isFlight;control.required=isFlight;if(!isFlight)control.value='';});
  const airportOther=isFlight&&form.elements[`${direction}_airport_station`].value==='Other';document.querySelector(`#${direction}AirportOtherField`).classList.toggle('hidden',!airportOther);form.elements[`${direction}_airport_other`].disabled=!airportOther;form.elements[`${direction}_airport_other`].required=airportOther;if(!airportOther)form.elements[`${direction}_airport_other`].value='';
  const special=isFlight&&String(form.elements[`${direction}_transfer_option`].value||'').startsWith(SPECIAL_TRANSFER_PREFIX);document.querySelectorAll(`.${direction}-special-detail`).forEach(field=>field.classList.toggle('hidden',!special));[`${direction}_special_transfer_datetime_date`,`${direction}_special_transfer_datetime_time`].forEach(name=>{const control=form.elements[name];control.disabled=!special;control.required=special;if(!special)control.value='';});
  const resort=!!method&&!isFlight;document.querySelectorAll(`.${direction}-resort-detail`).forEach(field=>field.classList.toggle('hidden',!resort));[`${direction}_resort_datetime_date`,`${direction}_resort_datetime_time`].forEach(name=>{const control=form.elements[name];control.disabled=!resort;control.required=resort;if(!resort)control.value='';});
 });
 const hillTeam=category==='Hill Team';document.querySelector('#liftPassField').classList.toggle('hidden',hillTeam);document.querySelector('#lessonsField').classList.toggle('hidden',hillTeam);if(hillTeam){form.elements.lift_pass_required.checked=false;form.elements.lessons_required.checked=false;}
 const lift=!hillTeam&&form.elements.lift_pass_required.checked;document.querySelector('#carreIncluded').classList.toggle('hidden',!lift);document.querySelectorAll('.lift-detail').forEach(field=>field.classList.toggle('hidden',!lift));document.querySelectorAll('.lift-detail input,.lift-detail select').forEach(control=>{control.disabled=!lift;control.required=lift;if(!lift)control.value='';});
 const protocolSki=category==='Protocol'||category==='Protocol Intern',skiStart=form.elements.first_ski_day,skiCurrent=skiStart.value,skiOptions=protocolSki?SKI_START_OPTIONS:SKI_START_OPTIONS.filter(([value])=>value>='2027-01-30');skiStart.innerHTML=datedOptions(skiOptions,skiCurrent);if([...skiStart.options].some(option=>option.value===skiCurrent))skiStart.value=skiCurrent;
 const lessons=!hillTeam&&form.elements.lessons_required.checked;document.querySelectorAll('.lesson-detail').forEach(field=>field.classList.toggle('hidden',!lessons));form.elements.lesson_type.disabled=!lessons;form.elements.lesson_type.required=lessons;if(!lessons)form.elements.lesson_type.value='';document.querySelectorAll('[name="lesson_date"]').forEach(control=>{control.disabled=!lessons;if(!lessons)control.checked=false;});
}
function registrationInvalid(event){
 const result=document.querySelector('#formResult');if(!result)return;
 const label=event.target.closest('.field')?.querySelector('label')?.textContent?.replace('*','').trim()||'highlighted field';
 result.innerHTML=`<div class="notice error">Please complete ${esc(label.toLowerCase())}. ${esc(event.target.validationMessage||'')}</div>`;
}
function registrationError(message,field){
 const result=document.querySelector('#formResult');result.innerHTML=`<div class="notice error">${esc(message)}</div>`;
 if(field){field.focus();field.scrollIntoView({behavior:'smooth',block:'center'});}return false;
}
function validateRegistration(form,body){
 if(body.accommodation_required){
  if(!body.accommodation_from)return registrationError('Choose the date accommodation is required from.',form.elements.accommodation_from);
  if(!body.accommodation_to)return registrationError('Choose the date accommodation is required to.',form.elements.accommodation_to);
  if(body.accommodation_to<=body.accommodation_from)return registrationError('Accommodation end date must be after the start date.',form.elements.accommodation_to);
  if(SPONSOR_CATEGORIES.has(body.category)&&!['2027-01-30','2027-02-03'].includes(body.accommodation_from))return registrationError('Sponsors can start accommodation only on Saturday 30 January or Wednesday 3 February.',form.elements.accommodation_from);
  if(body.accommodation_from==='2027-01-28'&&!['Protocol','Protocol Intern'].includes(body.category))return registrationError('Thursday 28 January accommodation is available only to Protocol.',form.elements.accommodation_from);
  if(body.accommodation_from==='2027-01-29'&&!['Protocol','Protocol Intern','Hill Team'].includes(body.category))return registrationError('Friday 29 January accommodation is available only to Protocol and the Hill Team / Race Committee.',form.elements.accommodation_from);
  if(body.share_room&&(!body.sharing_with||!body.room_sharing_option))return registrationError('Enter who the attendee will share with and choose double or twin room.',!body.sharing_with?form.elements.sharing_with:form.elements.room_sharing_option);
 }
 if(body.lift_pass_required){
  if(!body.first_ski_day||!body.last_ski_day||!body.date_of_birth)return registrationError('Choose the first and last ski days and enter the attendee date of birth.',!body.first_ski_day?form.elements.first_ski_day:!body.last_ski_day?form.elements.last_ski_day:form.elements.date_of_birth);
  if(body.last_ski_day<body.first_ski_day)return registrationError('Last ski day must be on or after the first ski day.',form.elements.last_ski_day);
 }
 if(body.lessons_required&&(!body.lesson_type||!body.lesson_dates.length))return registrationError('Choose a lesson type and at least one lesson date.',!body.lesson_type?form.elements.lesson_type:document.querySelector('#lessonDatesField'));
 return true;
}
async function submitRegistration(e){
 e.preventDefault();const form=e.currentTarget;const btn=document.querySelector('#submitRegistration');const result=document.querySelector('#formResult');
 if(!supabase){result.innerHTML='<div class="notice error">The secure registration service is still connecting. Please wait a moment and try again.</div>';return}
 const body=formObject(form);body.lesson_dates=[...form.querySelectorAll('[name="lesson_date"]:checked')].map(input=>input.value);delete body.lesson_date;if(state.registrationInvitation){body.category=state.registrationInvitation.category==='Military VIP'?'Winter Sports Ambassador':state.registrationInvitation.category;body.sponsor_name=state.registrationInvitation.sponsor_name;}if(body.website){form.reset();result.innerHTML='<div class="notice success">Thank you.</div>';return}
 if(!validateRegistration(form,body))return;
 const registrationDateTimes=[];['arrival','departure'].forEach(direction=>{if(body[`${direction}_method`]==='Flight')registrationDateTimes.push([`${direction}_datetime`,`${direction} flight`]);else registrationDateTimes.push([`${direction}_resort_datetime`,`${direction} in Méribel`]);if(String(body[`${direction}_transfer_option`]||'').startsWith(SPECIAL_TRANSFER_PREFIX))registrationDateTimes.push([`${direction}_special_transfer_datetime`,`${direction} special transfer`]);});
 const incomplete=registrationDateTimes.find(([name])=>incompleteDateTime(body,name));
 if(incomplete){result.innerHTML=`<div class="notice error">Choose both a date and time for the ${incomplete[1]}.</div>`;return;}
 registrationDateTimes.forEach(([name])=>{body[name]=joinedDateTime(body,name);delete body[`${name}_date`];delete body[`${name}_time`];});
 ['arrival','departure'].forEach(direction=>{const flight=body[`${direction}_method`]==='Flight';if(flight){if(body[`${direction}_airport_station`]==='Other')body[`${direction}_airport_station`]=body[`${direction}_airport_other`];body[`${direction}_resort_datetime`]=null;body[`${direction}_transfer`]=!!body[`${direction}_transfer_option`]&&body[`${direction}_transfer_option`]!=='Not required';}else{body[`${direction}_airport_station`]=null;body[`${direction}_number`]=null;body[`${direction}_datetime`]=null;body[`${direction}_transfer`]=false;body[`${direction}_transfer_option`]='Not required';body[`${direction}_special_transfer_datetime`]=null;}delete body[`${direction}_airport_other`];});
 body.carre_neige_required=!!body.lift_pass_required;body.boot_size=null;
 if(!DISCIPLINE_CATEGORIES.has(body.category))body.discipline=null;
 if(!SERVICE_CATEGORIES.has(body.category))body.service=null;
 if(SPONSOR_CATEGORIES.has(body.category)&&body.accommodation_required)body.dinners_required='Dinner with event guests each night';
 if(!body.accommodation_required){body.hotel_preference=null;body.accommodation_from=null;body.accommodation_to=null;body.share_room=false;body.sharing_with=null;body.room_sharing_option=null;body.dinners_required=null;body.dietary_requirements=null;}else if(!body.share_room){body.sharing_with=null;body.room_sharing_option=null;}
 if(!body.lift_pass_required){body.first_ski_day=null;body.last_ski_day=null;body.date_of_birth=null;body.carre_neige_required=false;}
 if(!body.lessons_required){body.lesson_type=null;body.lesson_dates=[];}
 btn.disabled=true;btn.textContent='Submitting…';result.innerHTML='';
 const proxyName=[body.proxy_title_rank,body.proxy_first_name,body.proxy_surname].filter(Boolean).join(' ');const {error}=await supabase.rpc('submit_registration_v2',{p_event_id:EVENT_ID,p_invitation_code:new URLSearchParams(location.search).get('invite'),p_submitted_on_behalf:!!body.submitted_on_behalf,p_submitter_name:body.submitted_on_behalf?proxyName:`${body.first_name} ${body.surname}`,p_submitter_email:body.submitted_on_behalf?body.proxy_email:body.email,p_attendee_email:body.email,p_payload:body});
 if(error){console.error(error);result.innerHTML=`<div class="notice error">${esc(error.message||'We could not save your registration. Please try again or contact the Protocol team.')}</div>`;btn.disabled=false;btn.textContent='Submit attendance request';return}
 form.reset();result.innerHTML='<div class="notice success"><strong>Registration received.</strong> Protocol will review your request and confirm the operational details separately.</div>';btn.textContent='Submitted';toast('Attendance request received');
}
async function sendLoginLink(e){
 e.preventDefault();const email=String(new FormData(e.currentTarget).get('email')||'').trim().toLowerCase();const box=document.querySelector('#loginResult');box.innerHTML='<div class="notice">Sending secure sign-in code…</div>';
 if(!supabase){box.innerHTML='<div class="notice error">The secure sign-in service is still connecting. Please wait a moment and try again.</div>';return}
 const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/?next=staff`,shouldCreateUser:true}});
 if(error){box.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;return}
 pendingLoginEmail=email;sessionStorage.setItem('isssc-staff-login-email',email);render();
 const result=document.querySelector('#loginResult');if(result)result.innerHTML='<div class="notice success">Code sent. Check your email and enter the six digits above.</div>';
}
async function verifyLoginCode(e){
 e.preventDefault();const form=e.currentTarget,token=String(new FormData(form).get('token')||'').replace(/\s/g,'');const box=document.querySelector('#loginResult'),button=form.querySelector('[type="submit"]');
 if(!supabase){box.innerHTML='<div class="notice error">The secure sign-in service is still connecting. Please wait a moment and try again.</div>';return}
 button.disabled=true;button.textContent='Signing in…';box.innerHTML='';
 const {data,error}=await supabase.auth.verifyOtp({email:pendingLoginEmail,token,type:'email'});
 if(error||!data.session){box.innerHTML='<div class="notice error">That code is invalid or has expired. Send a new code and try again.</div>';button.disabled=false;button.textContent='Sign in';return}
 pendingLoginEmail='';sessionStorage.removeItem('isssc-staff-login-email');state.session=data.session;finishAuthLanding();await loadProfile();render();
}
async function resendLoginCode(){
 const box=document.querySelector('#loginResult');box.innerHTML='<div class="notice">Sending a new code…</div>';
 const {error}=await supabase.auth.signInWithOtp({email:pendingLoginEmail,options:{emailRedirectTo:`${location.origin}/?next=staff`,shouldCreateUser:true}});
 box.innerHTML=error?`<div class="notice error">${esc(error.message)}</div>`:'<div class="notice success">A new code has been sent.</div>';
}
async function loadProfile(){
 if(!state.session){state.profile=null;return}
 const {data}=await supabase.from('profiles').select('id,display_name,app_role,active').eq('id',state.session.user.id).maybeSingle();state.profile=data||null;
}

function operationalOverviewMarkup(){
 return `<div class="operational-overview"><div id="overviewHeadline" class="grid grid-4 overview-headline"><div class="card metric"><strong>—</strong><span>Active attendees</span></div><div class="card metric"><strong>—</strong><span>Open actions</span></div><div class="card metric"><strong>—</strong><span>Billing ready</span></div><div class="card metric"><strong>—</strong><span>Issued and unpaid</span></div></div><section class="section"><div class="surface"><div class="surface-head overview-toolbar"><div><strong>Operational queues</strong><div class="muted small" id="overviewTimestamp">Loading the current event position…</div></div><button class="btn btn-ghost" id="refreshOverview" type="button">Refresh overview</button></div><div class="surface-body" id="operationalOverview"><div class="empty">Checking registrations, rooms, transfers, billing and launch settings…</div></div></div></section></div>`;
}

function overviewNumber(value){return Number.isFinite(Number(value))?Number(value):0;}
function overviewStatus(value,{critical=false,clearLabel='Clear',attentionLabel='Needs action'}={}){
 const count=overviewNumber(value);
 return count===0?`<span class="status green">${esc(clearLabel)}</span>`:`<span class="status ${critical?'red':'amber'}">${esc(attentionLabel)}</span>`;
}
function overviewLink(label,value,description,target,protocolTarget='',options={}){
 const count=overviewNumber(value),status=overviewStatus(count,options);
 const attrs=target?`data-overview-target="${esc(target)}"${protocolTarget?` data-protocol-target="${esc(protocolTarget)}"`:''}`:'';
 const tag=target?'button':'div';
 return `<${tag} class="overview-line" ${attrs}><span class="overview-line-count">${count}</span><span class="overview-line-copy"><strong>${esc(label)}</strong><small>${esc(description)}</small></span>${status}</${tag}>`;
}
function overviewCheck(label,ready,description,target=''){
 const attrs=target?`data-overview-target="${esc(target)}"`:'';
 const tag=target?'button':'div';
 return `<${tag} class="overview-line overview-check" ${attrs}><span class="overview-check-icon ${ready?'ready':'attention'}" aria-hidden="true">${ready?'✓':'!'}</span><span class="overview-line-copy"><strong>${esc(label)}</strong><small>${esc(description)}</small></span><span class="status ${ready?'green':'amber'}">${ready?'Ready':'Setup needed'}</span></${tag}>`;
}
function overviewGroup(title,subtitle,rows){return `<section class="overview-group"><div class="overview-group-head"><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div><div class="overview-lines">${rows.join('')}</div></section>`;}

function openOverviewTarget(button){
 const target=button.dataset.overviewTarget;
 if(!target)return;
 if(target==='admin'&&state.profile?.app_role!=='admin')return;
 state.staffTab=target;
 if(target==='protocol'&&button.dataset.protocolTarget)state.protocolSection=button.dataset.protocolTarget;
 render();window.scrollTo({top:0,behavior:'smooth'});
}

function bindOperationalOverview(){
 document.querySelectorAll('[data-overview-target]').forEach(button=>button.onclick=()=>openOverviewTarget(button));
}

function renderOperationalOverview(){
 const el=document.querySelector('#operationalOverview'),headline=document.querySelector('#overviewHeadline'),stamp=document.querySelector('#overviewTimestamp');
 if(!el||!headline)return;
 if(state.operationalOverviewError){el.innerHTML=`<div class="notice error"><strong>The overview could not be loaded.</strong> ${esc(state.operationalOverviewError)}</div>`;return;}
 const data=state.operationalOverview;
 if(!data)return;
 const h=data.headline||{},registration=data.registration||{},protocol=data.protocol||{},finance=data.finance||{},sponsors=data.sponsors||{},readiness=data.readiness||{},content=data.content||{};
 headline.innerHTML=`<div class="card metric"><strong>${overviewNumber(h.attendees)}</strong><span>Active attendees</span></div><div class="card metric ${overviewNumber(h.open_actions)?'metric-attention':'metric-ready'}"><strong>${overviewNumber(h.open_actions)}</strong><span>Open actions</span></div><div class="card metric"><strong>${overviewNumber(h.ready_for_invoice)}</strong><span>Billing ready</span></div><div class="card metric ${overviewNumber(h.issued_unpaid)?'metric-attention':''}"><strong>${overviewNumber(h.issued_unpaid)}</strong><span>Issued and unpaid</span></div>`;
 if(stamp){const generated=data.generated_at?new Date(data.generated_at):new Date();stamp.textContent=`Updated ${generated.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})} · ${data.event?.name||'ISSSC 2027'}`;}
 const adminTarget=state.profile?.app_role==='admin'?'admin':'';
 const notificationTarget=['admin','protocol','operations','content_manager'].includes(state.profile?.app_role)?'notifications':'';
 const emailProvider=state.invoiceEmailCapabilities?.email_configured;
 const emailReady=emailProvider===undefined?!!readiness.sender_saved:emailProvider===true;
 const emailLabel=emailProvider===undefined?'Invoice sender':'Invoice email';
 const emailDescription=emailProvider===true?'Sender and secure email provider are connected.':emailProvider===false&&readiness.sender_saved?'Sender is saved; the secure provider still needs connecting.':readiness.sender_saved?'An active invoice sender is saved; Admin or Finance verifies the provider.':'Save the invoice sender and connect the secure provider.';
 el.innerHTML=`<div class="overview-queue-grid">
 ${overviewGroup('Registration','Requests waiting for Protocol review.',[
   overviewLink('New registrations',registration.pending,'Review and accept, follow up or reject.','intake','',{critical:true}),
   overviewLink('Follow-up required',registration.follow_up,'Submitted details need clarification.','intake'),
   overviewLink('Processing errors',registration.errors,'A submission could not be mapped cleanly.','intake','',{critical:true})
 ])}
 ${overviewGroup('Protocol','Rooms, travel, lift passes and manifests.',[
   overviewLink('Room decisions',protocol.room_awaiting,'Requests awaiting the final Protocol allocation.','protocol','accommodation',{critical:true}),
   overviewLink('Room waitlist',protocol.room_waitlist,'Requests currently held without a room.','protocol','accommodation',{critical:true}),
   overviewLink('Lift passes',protocol.lift_pass_unconfirmed,'Required passes not yet confirmed.','protocol','attendees'),
   overviewLink('Travel records',protocol.travel_unconfirmed,'Entered journeys awaiting Protocol confirmation.','protocol','attendees'),
   overviewLink('Manifest assignments',protocol.transfers_unassigned,'Confirmed transfer requests not assigned to a matching run.','protocol','transfers',{critical:true}),
   overviewLink('Transfer run details',protocol.incomplete_runs,'Runs missing contacts, passengers or final status.','protocol','transfers',{critical:true})
 ])}
 ${overviewGroup('Finance','Readiness and invoice lifecycle.',[
   overviewLink('Attendee billing blockers',finance.blocked,'Resolve data, rate or service checks before billing.','finance','',{critical:true}),
   overviewLink('Ready for invoice',finance.ready,'Attendees whose billing checks are complete.','finance','',{clearLabel:'None waiting',attentionLabel:'Ready'}),
   overviewLink('Open invoice drafts',finance.open_invoices,'Drafts and reviews not yet approved.','finance'),
   overviewLink('Approved, not issued',finance.approved_not_issued,'Approved invoices waiting to be issued.','finance'),
   overviewLink('Overdue invoices',finance.overdue,'Issued invoices past their recorded due date.','finance','',{critical:true})
 ])}
 ${overviewGroup('Sponsors','Event-year terms, invitations and rooms.',[
   overviewLink('Prospective sponsors',sponsors.prospective,'Confirm or close prospective records.','sponsors'),
   overviewLink('Open invitations',sponsors.pending_invitations,'Invitations not yet accepted, declined or cancelled.','sponsors'),
   overviewLink('Room over-allocation',sponsors.overallocated,'Sponsor room entitlement has been exceeded.','sponsors','',{critical:true}),
   overviewLink('Rooms remaining',sponsors.rooms_remaining,'Allocated sponsor places not yet accepted.','sponsors','',{clearLabel:'Fully allocated',attentionLabel:'Available'})
 ])}
 </div>
 <div class="overview-lower-grid">
 ${overviewGroup('Production configuration','Core controls required for live operation.',[
   overviewCheck('Billing configuration',!!readiness.billing_confirmed,'Issuer, payment terms and instructions confirmed.',adminTarget),
   overviewCheck('Approved rate card',overviewNumber(readiness.rates_approved)>0&&overviewNumber(readiness.rates_pending)===0,`${overviewNumber(readiness.rates_approved)} approved · ${overviewNumber(readiness.rates_pending)} awaiting confirmation`,'finance'),
   overviewCheck('Hotel inventory',overviewNumber(readiness.hotel_rooms)>0&&overviewNumber(readiness.hotel_rooms_unverified)===0,`${overviewNumber(readiness.hotel_rooms)} available · ${overviewNumber(readiness.hotel_rooms_unverified)} unverified`,'protocol'),
   overviewCheck(emailLabel,emailReady,emailDescription,adminTarget),
   overviewCheck('Browser notifications',!!readiness.push_configured,`${overviewNumber(readiness.active_notification_devices)} active device${overviewNumber(readiness.active_notification_devices)===1?'':'s'} · ${overviewNumber(readiness.notification_failures_30d)} failures in 30 days`,notificationTarget),
   overviewCheck('Staff access',overviewNumber(readiness.active_staff)>0,`${overviewNumber(readiness.active_staff)} active staff account${overviewNumber(readiness.active_staff)===1?'':'s'}.`,adminTarget)
 ])}
 <section class="overview-group content-health"><div class="overview-group-head"><h3>Published event content</h3><p>Items currently visible in the attendee event app.</p></div><div class="content-health-grid">${[
   ['Programme',content.programme],['Venues',content.venues],['Results',content.results],['Media',content.media],['Table plans',content.table_plans],['Transfers',content.transfers]
 ].map(([label,value])=>`<button data-overview-target="content"><strong>${overviewNumber(value)}</strong><span>${esc(label)}</span></button>`).join('')}</div></section>
 </div>`;
 bindOperationalOverview();
}

async function loadOperationalOverview(showToast=false){
 const el=document.querySelector('#operationalOverview');if(el)el.innerHTML='<div class="empty">Refreshing the operational position…</div>';
 const canCheckEmail=['admin','finance','read_only'].includes(state.profile?.app_role);
 if(!canCheckEmail)state.invoiceEmailCapabilities=null;
 const requests=[supabase.rpc('get_operational_overview',{p_event_id:EVENT_ID})];
 if(canCheckEmail)requests.push(supabase.functions.invoke('invoice-delivery',{body:{action:'capabilities',event_id:EVENT_ID}}));
 const [overview,email]=await Promise.all(requests);
 if(overview.error){state.operationalOverviewError=overview.error.message;state.operationalOverview=null;renderOperationalOverview();return;}
 state.operationalOverviewError=null;state.operationalOverview=overview.data||null;
 if(email&&!email.error)state.invoiceEmailCapabilities=email.data||null;
 renderOperationalOverview();if(showToast)toast('Operational overview refreshed');
}

async function loadStaffData(){
 if(state.staffTab==='overview')loadOperationalOverview();
 if(state.staffTab==='intake') loadIntake();
 if(state.staffTab==='protocol'&&state.protocolSection==='accommodation')roomAllocator?.load();
 if(state.staffTab==='protocol'&&state.protocolSection==='transfers')eventFeature?.loadTransfers();
 if(state.staffTab==='protocol'&&state.protocolSection==='attendees')loadProtocol();
 if(state.staffTab==='notifications') eventFeature?.loadNotifications();
 if(state.staffTab==='sponsors') loadSponsors();
 if(state.staffTab==='finance') loadInvoices();
 if(state.staffTab==='content') eventFeature?.loadStaff();
 if(state.staffTab==='admin'&&state.profile?.app_role==='admin')adminSettings?.load();
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
function present(value,fallback='Not provided'){return value===true?'Yes':value===false?'No':Array.isArray(value)?(value.length?esc(value.map(item=>displayEventDate(item)).join(', ')):fallback):value?esc(String(value).replace('T',' ')):fallback;}
function detailRows(rows){return `<dl class="review-grid">${rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${present(value)}</dd></div>`).join('')}</dl>`;}
function canReviewIntake(){return ['admin','protocol','operations'].includes(state.profile?.app_role);}

function openIntake(id){
 const row=state.intakeRows.find(item=>item.id===id),el=document.querySelector('#intakeDetail');if(!row||!el)return;
 const p=row.raw_payload||{};
 const actions=canReviewIntake()&&row.processing_status!=='accepted'?`<div class="review-actions"><div class="field"><label for="reviewNotes">Review notes</label><textarea id="reviewNotes" placeholder="Optional internal note">${esc(row.review_notes||'')}</textarea></div><div id="reviewResult"></div><div class="actions"><button class="btn btn-primary" data-intake-decision="accepted">Approve registration</button><button class="btn btn-ghost" data-intake-decision="review_required">Needs follow-up</button><button class="btn btn-danger" data-intake-decision="rejected">Reject</button></div></div>`:`<div class="notice ${row.processing_status==='accepted'?'success':''}">${row.processing_status==='accepted'?'This request has been approved and linked to an attendee record.':'You have read-only access to this registration.'}</div>`;
 el.innerHTML=`<section class="review-panel"><div class="review-heading"><div><span class="status ${statusClass(row.processing_status)}">${esc(statusLabel(row.processing_status))}</span><h3>${esc(`${p.title_rank||''} ${p.first_name||''} ${p.surname||''}`.trim()||'Registration')}</h3><p>${esc(row.attendee_email||'')}</p></div><button class="btn btn-ghost btn-small" id="closeIntake">Close</button></div>
 <div class="review-sections"><section><h4>Attendee</h4>${detailRows([['Category',p.category],['Organisation',p.sponsor_name],['Role / appointment',p.role],['Service',p.service],['Discipline',p.discipline],['Mobile',p.mobile],['Post nominals',p.post_nominals]])}</section>
 <section><h4>Accommodation</h4>${detailRows([['Required',p.accommodation_required],['Hotel preference',p.hotel_preference],['From',p.accommodation_from],['To',p.accommodation_to],['Room share',p.share_room],['Sharing with',p.sharing_with],['Room setup',p.room_sharing_option],['Evening meals',p.dinners_required],['Dietary requirements',p.dietary_requirements]])}</section>
 <section><h4>Arrival</h4>${detailRows([['Method',p.arrival_method],['Other method',p.arrival_method_other],['Airport',p.arrival_airport_station],['Flight number',p.arrival_number],['Flight date and time',p.arrival_datetime],['Expected in Méribel',p.arrival_resort_datetime],['Transfer requested',p.arrival_transfer],['Requested transfer',p.arrival_transfer_option],['Special transfer time',p.arrival_special_transfer_datetime]])}</section>
 <section><h4>Departure</h4>${detailRows([['Method',p.departure_method],['Other method',p.departure_method_other],['Airport',p.departure_airport_station],['Flight number',p.departure_number],['Flight date and time',p.departure_datetime],['Leave Méribel',p.departure_resort_datetime],['Transfer requested',p.departure_transfer],['Requested transfer',p.departure_transfer_option],['Special transfer time',p.departure_special_transfer_datetime]])}</section>
 <section><h4>On snow</h4>${detailRows([['Lift pass',p.lift_pass_required],['Carre Neige included',p.carre_neige_required],['First ski day',p.first_ski_day],['Last ski day',p.last_ski_day],['Lessons',p.lessons_required],['Lesson type',p.lesson_type],['Lesson dates',p.lesson_dates],['Equipment-hire information',p.equipment_hire_required],['Date of birth',p.date_of_birth]])}</section>
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
 const {data,error}=await supabase.rpc('review_intake_submission',{p_submission_id:row.id,p_decision:decision,p_review_notes:notes});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;buttons.forEach(button=>button.disabled=false);return;}
 const linkedManual=decision==='accepted'&&data?.linked_manual;
 toast(decision==='accepted'?(linkedManual?'Registration linked to existing person':'Attendee created'):'Review saved');
 await loadIntake();
 const detail=document.querySelector('#intakeDetail');if(detail)detail.innerHTML=`<div class="notice success">${decision==='accepted'?(linkedManual?'Registration approved and linked to the existing Protocol-created person.':'Registration approved and attendee created.'):'Registration marked as '+esc(statusLabel(decision).toLowerCase())+'.'}</div>`;
}

function protocolStatusLabel(status){return ({expected:'Expected',confirmed:'Confirmed',declined:'Declined',cancelled:'Cancelled'})[status]||status||'Unknown';}
function protocolStatusClass(status){return status==='confirmed'?'green':(['declined','cancelled'].includes(status)?'red':'purple');}
function canEditProtocol(){return ['admin','protocol','operations'].includes(state.profile?.app_role);}
function manualPersonMarkup(){
 const organisations=state.protocolLookups.organisations||[];
 return `<section class="surface manual-person-panel"><div class="surface-head"><div><strong>Add person without a registration</strong><div class="muted small">Creates one reusable person for room allocation, transfer manifests and lift passes.</div></div><button class="btn btn-ghost btn-small" id="closeManualPerson" type="button">Close</button></div><div class="surface-body"><form id="manualPersonForm" class="form-grid record-form"><div class="field"><label>Rank / title</label><input name="title_rank" maxlength="80"></div><div class="field"><label>Category *</label><select name="category" required>${selectedOptions(['Military VIP','Military Guest','Sponsor','Sponsor Guest','Royal Party','Committee','Protocol','Hill Team','Other'],'Other')}</select></div><div class="field"><label>First name *</label><input name="first_name" maxlength="120" required></div><div class="field"><label>Surname *</label><input name="surname" maxlength="120" required></div><div class="field"><label>Organisation</label><select name="organisation_id"><option value="">No linked organisation</option>${organisations.map(org=>`<option value="${esc(org.id)}">${esc(org.organisation_name)}</option>`).join('')}</select></div><div class="field"><label>Organisation / display name</label><input name="display_company" maxlength="200" placeholder="Use if the organisation is not listed"></div><div class="field"><label>Email</label><input type="email" name="email" maxlength="320"><small>An exact email match will link a later registration to this person.</small></div><div class="field"><label>Mobile</label><input name="mobile" inputmode="tel" maxlength="80"></div><div class="field"><label>Service</label><select name="service">${selectedOptions(['Royal Navy','British Army','Royal Air Force','Civilian','Other'],'')}</select></div><div class="field"><label>Role / appointment</label><input name="position_role" maxlength="200"></div><div class="field full"><label>Protocol notes</label><textarea name="protocol_notes" placeholder="Why the person was added or any operational information"></textarea></div><div class="field full"><div class="notice">This creates a canonical person, marked as a Protocol entry. It does not automatically confirm a room, transfer or lift pass; Protocol retains each final decision.</div></div><div class="field full"><div class="service-actions"><button class="btn btn-primary" type="submit">Create person</button><div class="service-save-result" id="manualPersonResult"></div></div></div></form></div></section>`;
}
async function openManualPerson(){
 state.manualPersonOpen=true;render();
 if(state.protocolLookups.organisations?.length)return;
 const {data,error}=await supabase.from('organisations').select('id,organisation_name').eq('active',true).order('organisation_name');
 if(error){toast(error.message);return}
 state.protocolLookups.organisations=data||[];
 if(state.manualPersonOpen)render();
}
async function saveManualPerson(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=document.querySelector('#manualPersonResult');
 button.disabled=true;button.textContent='Creating…';result.innerHTML='';
 const organisation=state.protocolLookups.organisations.find(item=>item.id===body.organisation_id);
 const {data,error}=await supabase.rpc('create_protocol_attendee',{p_event_id:EVENT_ID,p_title_rank:body.title_rank||null,p_first_name:body.first_name,p_surname:body.surname,p_category:body.category||'Other',p_organisation_id:body.organisation_id||null,p_display_company:body.display_company||organisation?.organisation_name||null,p_email:body.email||null,p_mobile:body.mobile||null,p_service:body.service||null,p_position_role:body.position_role||null,p_protocol_notes:body.protocol_notes||null});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Create person';return}
 toast('Person created and ready for allocation');state.manualPersonOpen=false;state.protocolSection='attendees';render();await loadProtocol();await openProtocolAttendee(data);
}
function selectedOptions(values,current,placeholder='Select…'){
 values=currentCategoryOptions(values);if(current==='Military VIP')current='Winter Sports Ambassador';
 const items=current&&!values.includes(current)?[current,...values]:values;
 return `<option value="">${placeholder}</option>${items.map(value=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(value)}</option>`).join('')}`;
}

async function loadProtocol(){
 const el=document.querySelector('#protocolTable');if(!el)return;el.textContent='Loading attendees…';
 const [attendees,locations,rooms,rates,organisations]=await Promise.all([
  supabase.from('attendees').select('id,attendance_status,category,display_company,organisation_id,title_rank,first_name,surname,known_as,post_nominals,email,mobile,service,discipline,position_role,dietary_requirements,date_of_birth,equipment_hire_required,boot_size,attendee_notes,protocol_notes,data_checked,checked_at,created_at,record_source').eq('event_id',EVENT_ID).order('surname').order('first_name').limit(500),
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
 el.innerHTML=`<div class="table-scroll"><table class="data-table protocol-table"><thead><tr><th>Attendee</th><th>Category</th><th>Organisation</th><th>Attendance</th><th>Data</th><th></th></tr></thead><tbody>${rows.map(a=>`<tr><td><strong>${esc(`${a.title_rank||''} ${a.first_name||''} ${a.surname||''}`.trim())}</strong>${a.record_source==='protocol_manual'?'<span class="status purple attendee-source">Protocol entry</span>':''}<br><small>${esc(a.email||'')}</small></td><td>${esc(a.category||'')}</td><td>${esc(attendeeOrganisationName(a)||'—')}</td><td><span class="status ${protocolStatusClass(a.attendance_status)}">${esc(protocolStatusLabel(a.attendance_status))}</span></td><td><span class="status ${a.data_checked?'green':'amber'}">${a.data_checked?'Checked':'Needs review'}</span></td><td><button class="btn btn-ghost btn-small" data-open-attendee="${a.id}">Open</button></td></tr>`).join('')}</tbody></table></div>`;
 document.querySelectorAll('[data-open-attendee]').forEach(button=>button.onclick=()=>openProtocolAttendee(button.dataset.openAttendee));
}

function attendeeOrganisationName(attendee){return state.protocolLookups.organisations.find(org=>org.id===attendee.organisation_id)?.organisation_name||attendee.display_company;}

async function openProtocolAttendee(id){
 const attendee=state.protocolRows.find(item=>item.id===id),el=document.querySelector('#protocolDetail');if(!attendee||!el)return;
 const editable=canEditProtocol(),disabled=editable?'':' disabled';
 el.innerHTML=`<section class="record-panel"><div class="review-heading"><div><span class="status ${protocolStatusClass(attendee.attendance_status)}">${esc(protocolStatusLabel(attendee.attendance_status))}</span>${attendee.record_source==='protocol_manual'?'<span class="status purple attendee-source">Protocol entry</span>':''}<h3>${esc(`${attendee.title_rank||''} ${attendee.first_name||''} ${attendee.surname||''}`.trim())}</h3><p>${esc(attendee.email||'')}</p></div><button class="btn btn-ghost btn-small" id="closeProtocol">Close</button></div>
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
function dateTimeField(name,label,value,disabled,extraClass=''){
 const local=dateTimeLocalValue(value),date=local.slice(0,10),time=local.slice(11,16);
 return `<div class="field ${extraClass}"><label>${label}</label><div class="date-time-pair"><select name="${name}_date" aria-label="${label} date"${disabled}>${eventDateOptions(date)}</select><input type="time" step="60" name="${name}_time" aria-label="${label} time" value="${esc(time)}"${disabled}></div><small>Any minute between 27 Jan and 9 Feb 2027 is accepted.</small></div>`;
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
 const travelTime=record?(record.travel_datetime||''):(request[`${key}_datetime`]||''),resortTime=record?(record.resort_datetime||''):(request[`${key}_resort_datetime`]||''),specialTime=record?(record.special_transfer_datetime||''):(request[`${key}_special_transfer_datetime`]||'');
 const transfer=record?record.transfer_requested:!!request[`${key}_transfer`];
 const requestedTransfer=request[`${key}_transfer_option`]||'',transferService=record?.transfer_service||(requestedTransfer==='Not required'?'Not required':requestedTransfer?`Requested: ${requestedTransfer}`:'');
 return `<form class="service-form travel-form" data-direction="${direction}"><div class="service-form-head"><div><span class="status ${record?.protocol_confirmed?'green':'amber'}">${record?.protocol_confirmed?'Confirmed':'Draft'}</span><strong>${title}</strong></div>${record?.billing_reviewed?'<small>Billing reviewed</small>':''}</div>
 <div class="form-grid compact-grid"><div class="field"><label>Method</label><select name="method_of_transport"${disabled}>${selectedOptions(['Flight','Self Drive','Train','Drive','Coach','Other'],method)}</select></div><div class="field"><label>Airport / station</label><input name="airport_station" value="${esc(point)}"${disabled}></div>
 <div class="field"><label>Flight / travel number</label><input name="flight_travel_number" value="${esc(number)}"${disabled}></div>${dateTimeField('travel_datetime',`${title} local date and time`,travelTime,disabled)}
 ${dateTimeField('resort_datetime',`${direction==='arrival'?'Expected in resort':'Leave resort'} local date and time`,resortTime,disabled)}${dateTimeField('special_transfer_datetime','Special transfer date and time',specialTime,disabled)}
 <div class="field checkbox"><input type="checkbox" name="transfer_requested" ${transfer?'checked':''}${disabled}><label>UKAFWSA transfer required</label></div><div class="field"><label>Transfer service</label><select name="transfer_service"${disabled}>${selectedOptions(['Shared coach','Shared taxi','Private taxi','Own transport','Not required','Other',...(requestedTransfer?[`Requested: ${requestedTransfer}`]:[])],transferService)}</select></div>
 <div class="field checkbox"><input type="checkbox" name="transfer_chargeable" ${record?.transfer_chargeable?'checked':''}${disabled}><label>Chargeable transfer</label></div><div class="field checkbox"><input type="checkbox" name="protocol_confirmed" ${record?.protocol_confirmed?'checked':''}${disabled}><label>Protocol confirmed</label></div>
 <div class="field full"><label>Assignment notes</label><textarea name="assignment_notes"${disabled}>${esc(record?.assignment_notes||'')}</textarea></div></div>
 ${editable?`<div class="service-actions"><button class="btn btn-primary" type="submit">Save ${title.toLowerCase()}</button><div class="service-save-result"></div></div>`:''}</form>`;
}
function liftForm(lift,request){
 const editable=canEditProtocol(),disabled=editable?'':' disabled';
 const required=lift?lift.required:!!request.lift_pass_required,carre=required;
 const start=lift?(lift.start_date||''):(request.first_ski_day||''),end=lift?(lift.end_date||''):(request.last_ski_day||'');
 return `<form class="service-form lift-form" data-lift-id="${lift?.id||''}"><div class="service-form-head"><div><span class="status ${lift?.protocol_confirmed?'green':'amber'}">${lift?.protocol_confirmed?'Confirmed':'Draft'}</span><strong>Lift pass</strong></div>${lift?`<small>${lift.pass_days??0} days · ${money(lift.total_charge)}</small>`:'<small>Not yet configured</small>'}</div>
 <div class="form-grid compact-grid"><div class="field checkbox"><input type="checkbox" name="required" ${required?'checked':''}${disabled}><label>Lift pass required</label></div><div class="field checkbox"><input type="checkbox" name="carre_neige_required" ${carre?'checked':''} disabled><div><label>Carre Neige included</label><small>Automatically included whenever a lift pass is required.</small></div></div>
 <div class="field"><label>First ski day</label><input type="date" name="start_date" value="${esc(start)}" min="2027-01-30" max="2027-02-06"${disabled}></div><div class="field"><label>Last ski day</label><input type="date" name="end_date" value="${esc(end)}" min="2027-01-30" max="2027-02-06"${disabled}></div>
 <div class="field checkbox"><input type="checkbox" name="chargeable" ${(lift?lift.chargeable:true)?'checked':''}${disabled}><label>Chargeable</label></div><div class="field"><label>Lift-pass rate (automatic if blank)</label><select name="rate_code"${disabled}>${rateOptions('lift_pass',null,null,lift?.rate_code||'')}</select></div>
 <div class="field checkbox full"><input type="checkbox" name="protocol_confirmed" ${lift?.protocol_confirmed?'checked':''}${disabled}><label>Protocol confirmed</label></div><div class="field full"><label>Lift-pass notes</label><textarea name="notes"${disabled}>${esc(lift?.notes||'')}</textarea></div></div>
 ${editable?'<div class="service-actions"><button class="btn btn-primary" type="submit">Save lift pass</button><div class="service-save-result"></div></div>':''}</form>`;
}
function renderProtocolServices(request,stays,travel,lift,errors,attendee){
 const el=document.querySelector('#protocolServices');if(!el)return;
 if(errors.length){el.innerHTML=`<div class="notice error">Some operational records could not be loaded: ${esc(errors.map(error=>error.message).join('; '))}</div>`;return;}
 const arrival=travel.find(item=>item.direction==='arrival'),departure=travel.find(item=>item.direction==='departure');
 el.className='ops-stack';el.innerHTML=`<div class="requested-summary"><strong>${attendee.record_source==='protocol_manual'&&Object.keys(request).length===0?'Protocol-created person':'Original request'}</strong>${attendee.record_source==='protocol_manual'&&Object.keys(request).length===0?'<p class="muted small">No registration form is linked. Protocol can still confirm accommodation, travel and a lift pass below.</p>':detailRows([['Accommodation',request.accommodation_required],['Hotel preference',request.hotel_preference],['Requested stay',request.accommodation_from&&request.accommodation_to?`${request.accommodation_from} to ${request.accommodation_to}`:null],['Room share',request.share_room],['Sharing with',request.sharing_with],['Lift pass',request.lift_pass_required]])}</div>
 <section class="service-group"><div class="service-group-head"><div><h4>Accommodation</h4><p>Each period is separately assigned and rated.</p></div>${canEditProtocol()?'<button class="btn btn-ghost btn-small" id="addStayPeriod">Add period</button>':''}</div><div id="stayForms" class="service-form-list">${(stays.length?stays:[null]).map(stay=>stayForm(stay,request,attendee.id)).join('')}</div></section>
 <section class="service-group"><div class="service-group-head"><div><h4>Travel and transfers</h4><p>Times are entered in local Méribel/Geneva time.</p></div></div><div class="travel-grid">${travelForm('arrival',arrival,request)}${travelForm('departure',departure,request)}</div></section>
 <section class="service-group"><div class="service-group-head"><div><h4>Lift pass</h4><p>The selected event rate is calculated from confirmed dates; Carre Neige is always included.</p></div></div>${liftForm(lift,request)}</section>`;
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
 const lift=document.querySelector('.lift-form');if(lift){lift.onsubmit=event=>saveProtocolLift(event,attendeeId);lift.elements.required.onchange=()=>{lift.elements.carre_neige_required.checked=lift.elements.required.checked;lift.elements.rate_code.value='';};}
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
 return serviceSave(form,'save_protocol_lift_pass',{p_attendee_id:attendeeId,p_lift_pass_id:form.dataset.liftId||null,p_required:!!body.required,p_start_date:body.start_date||null,p_end_date:body.end_date||null,p_carre_neige_required:!!body.required,p_chargeable:!!body.chargeable,p_rate_code:body.rate_code||null,p_protocol_confirmed:!!body.protocol_confirmed,p_notes:body.notes||null},'Lift pass saved',attendeeId);
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
  supabase.from('organisations').select('id,organisation_name,billing_name,billing_email,billing_address_1,billing_address_2,town_city,county_region,postcode,country,purchase_order_required').order('organisation_name'),
  supabase.from('event_sponsors').select('id,event_id,organisation_id,sponsor_status,consolidated_invoice_requested,active').eq('event_id',EVENT_ID).eq('active',true),
  supabase.from('invoices').select('id,event_id,attendee_id,billing_account_organisation_id,invoice_type,invoice_reference,status,issue_date,due_date,payment_link,purchase_order_reference,payment_terms_days,notes,net_total,vat_total,gross_total,pdf_path,pdf_generated_at,pdf_sha256,sent_at,paid_at,approved_by,approved_at,issued_by,issued_at,paid_by,payment_reference,recipient_name_snapshot,recipient_email_snapshot,recipient_address_snapshot,created_at,updated_at').eq('event_id',EVENT_ID).order('created_at',{ascending:false}).limit(100),
  supabase.from('invoice_deliveries').select('id,invoice_id,event_id,recipient_name,recipient_email,subject,provider,provider_message_id,delivery_status,requested_by,requested_at,accepted_at,error_message,pdf_sha256,created_at').eq('event_id',EVENT_ID).order('created_at',{ascending:false}).limit(250),
  supabase.from('rate_card').select('id,rate_code,description,charge_category,unit,unit_price,vat_rate,tax_treatment,status,active,source_note,confirmed_by,confirmed_at,updated_at').eq('event_id',EVENT_ID).eq('active',true).order('charge_category').order('description'),
  supabase.from('events').select('id,invoice_prefix,invoice_issuer_name,invoice_issuer_address,invoice_issuer_legal_details,invoice_payment_instructions,invoice_footer,invoice_default_payment_terms_days,billing_configuration_confirmed,billing_configuration_confirmed_by,billing_configuration_confirmed_at').eq('id',EVENT_ID).single()
 ]);
 const failed=results.find(result=>result.error);
 if(failed){el.innerHTML=`<div class="notice error">${esc(failed.error.message)}</div>`;return;}
 [state.financeReadiness,state.financeSummaries,state.financeAttendees,state.financeOrganisations,state.financeSponsors,state.financeInvoices,state.financeDeliveries,state.financeRates]=results.slice(0,8).map(result=>result.data||[]);
 state.financeBillingSettings=results[8].data||null;
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
 await loadInvoiceEmailCapabilities();
 renderFinanceMetrics();renderFinanceBillingSettings();renderFinanceRates();renderFinanceReadiness();renderFinanceConsolidated();renderFinanceInvoices();
 if(state.selectedFinanceAttendeeId)await openFinanceAttendee(state.selectedFinanceAttendeeId,false);
}

async function loadInvoiceEmailCapabilities(){
 const {data,error}=await supabase.functions.invoke('invoice-delivery',{body:{action:'capabilities',event_id:EVENT_ID}});
 state.invoiceEmailCapabilities=error?{email_configured:false,error:error.message}:data;
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
function invoiceDeliveries(invoiceId){return state.financeDeliveries.filter(row=>row.invoice_id===invoiceId);}
function latestInvoiceDelivery(invoiceId){return invoiceDeliveries(invoiceId)[0]||null;}
function deliveryStatusLabel(value){return ({pending:'Sending',accepted:'Email accepted',delivered:'Delivered',failed:'Email failed',bounced:'Bounced',complained:'Complaint'})[value]||statusLabel(value);}
function deliveryStatusClass(value){return ['accepted','delivered'].includes(value)?'green':['failed','bounced','complained'].includes(value)?'red':'amber';}
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
function invoiceStatusLabel(value){return ({ready_for_review:'Ready for review',awaiting_billing_update:'Billing update needed',approved:'Confirmed'})[value]||statusLabel(value);}
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

function renderFinanceBillingSettings(){
 const summary=document.querySelector('#financeBillingSummary'),el=document.querySelector('#financeBillingSettingsPanel'),settings=state.financeBillingSettings;
 if(summary)summary.innerHTML=settings?.billing_configuration_confirmed?'<span class="status green">Confirmed</span> Ready for invoice issue':'<span class="status amber">Setup required</span> Complete before issuing invoices';
 if(!el)return;
 if(!settings){el.innerHTML='<div class="notice error">Billing settings could not be loaded.</div>';return;}
 const editable=canEditFinance();
 el.className='';
 el.innerHTML=`<form id="financeBillingSettingsForm" class="form-grid record-form billing-settings-form"><div class="field"><label>Invoice prefix *</label><input name="invoice_prefix" maxlength="30" required value="${esc(settings.invoice_prefix||'ISSSC2027')}" ${editable?'':'disabled'}></div><div class="field"><label>Default payment terms *</label><div class="input-suffix"><input name="default_payment_terms_days" type="number" min="0" max="365" step="1" required value="${Number(settings.invoice_default_payment_terms_days??14)}" ${editable?'':'disabled'}><span>days</span></div></div><div class="field full"><label>Invoice issuer name *</label><input name="invoice_issuer_name" value="${esc(settings.invoice_issuer_name||'')}" ${editable?'':'disabled'}></div><div class="field full"><label>Invoice issuer address *</label><textarea name="invoice_issuer_address" ${editable?'':'disabled'}>${esc(settings.invoice_issuer_address||'')}</textarea></div><div class="field full"><label>Legal or charity details</label><textarea name="invoice_issuer_legal_details" ${editable?'':'disabled'}>${esc(settings.invoice_issuer_legal_details||'')}</textarea></div><div class="field full"><label>Payment instructions *</label><textarea name="invoice_payment_instructions" placeholder="How the recipient should pay the invoice" ${editable?'':'disabled'}>${esc(settings.invoice_payment_instructions||'')}</textarea><small>These instructions will be used for invoices and are visible to authorised staff.</small></div><div class="field full"><label>Invoice footer</label><textarea name="invoice_footer" ${editable?'':'disabled'}>${esc(settings.invoice_footer||'')}</textarea></div><div class="field checkbox full"><input type="checkbox" id="billingConfigurationConfirmed" name="billing_configuration_confirmed" ${settings.billing_configuration_confirmed?'checked':''} ${editable?'':'disabled'}><div><label for="billingConfigurationConfirmed">Billing configuration confirmed</label><small>Confirm only after checking the issuer name, address and payment instructions.</small></div></div>${editable?'<div class="field full"><div class="service-actions"><button class="btn btn-primary" type="submit">Save billing settings</button><div class="service-save-result"></div></div></div>':''}</form>`;
 const form=document.querySelector('#financeBillingSettingsForm');if(form&&editable)form.onsubmit=saveFinanceBillingSettings;
}

async function saveFinanceBillingSettings(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result');
 const terms=Number(body.default_payment_terms_days);
 if(!String(body.invoice_prefix||'').trim()){result.innerHTML='<div class="notice error">Add an invoice prefix.</div>';return;}
 if(!Number.isInteger(terms)||terms<0||terms>365){result.innerHTML='<div class="notice error">Payment terms must be a whole number between 0 and 365 days.</div>';return;}
 if(body.billing_configuration_confirmed&&(!String(body.invoice_issuer_name||'').trim()||!String(body.invoice_issuer_address||'').trim()||!String(body.invoice_payment_instructions||'').trim())){result.innerHTML='<div class="notice error">Issuer name, issuer address and payment instructions are required before confirmation.</div>';return;}
 button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc('save_finance_billing_settings',{p_event_id:EVENT_ID,p_invoice_prefix:body.invoice_prefix,p_invoice_issuer_name:body.invoice_issuer_name||null,p_invoice_issuer_address:body.invoice_issuer_address||null,p_invoice_issuer_legal_details:body.invoice_issuer_legal_details||null,p_invoice_payment_instructions:body.invoice_payment_instructions||null,p_invoice_footer:body.invoice_footer||null,p_default_payment_terms_days:terms,p_confirmed:!!body.billing_configuration_confirmed});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Save billing settings';return;}
 toast('Billing settings saved');await loadInvoices();
}

function renderFinanceRates(){
 const el=document.querySelector('#financeRateTable'),detail=document.querySelector('#financeRateDetail');if(!el||!detail)return;
 const summary=document.querySelector('#financeRateSummary');if(summary){const confirmed=state.financeRates.filter(rate=>rate.status==='approved').length;summary.textContent=`${confirmed} of ${state.financeRates.length} active rates confirmed`;}
 const query=state.financeRateQuery.trim().toLowerCase();
 const rates=state.financeRates.filter(rate=>(state.financeRateGroup==='all'||rateGroup(rate)===state.financeRateGroup)&&(!query||`${rate.rate_code} ${rate.description} ${rate.charge_category} ${rate.source_note||''}`.toLowerCase().includes(query)));
 if(!rates.length){el.innerHTML='<div class="empty">No rates match this view.</div>';detail.innerHTML='';return;}
 el.innerHTML=`<div class="table-scroll"><table class="data-table rate-table"><thead><tr><th>Rate</th><th>Category</th><th>Charging unit</th><th>Price</th><th>VAT</th><th>Status</th><th></th></tr></thead><tbody>${rates.map(rate=>`<tr><td><strong>${esc(rate.description)}</strong><br><small>${esc(rate.rate_code)}</small></td><td>${esc(rateCategoryLabel(rate.charge_category))}</td><td>${esc(rateUnitLabel(rate.unit))}</td><td><strong>${money(rate.unit_price)}</strong></td><td>${rate.vat_rate==null?'Not specified':`${Number(rate.vat_rate).toFixed(2)}%`}</td><td><span class="status ${rateStatusClass(rate.status)}">${rateStatusLabel(rate.status)}</span></td><td><button class="btn btn-ghost btn-small" data-edit-rate="${rate.id}">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
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
 if(!state.financeInvoices.length){el.innerHTML='<div class="empty">No invoices have been created yet.</div>';detail.innerHTML='';return;}
 el.innerHTML=`<div class="table-scroll"><table class="data-table invoice-table"><thead><tr><th>Reference</th><th>Recipient</th><th>Type</th><th>Status</th><th>Gross</th><th></th></tr></thead><tbody>${state.financeInvoices.map(invoice=>{
  const attendee=state.financeAttendees.find(row=>row.id===invoice.attendee_id),organisation=financeOrganisation(invoice.billing_account_organisation_id);
  const recipient=invoice.invoice_type==='individual'?`${attendee?.first_name||''} ${attendee?.surname||''}`.trim():(organisation?.billing_name||organisation?.organisation_name||'Organisation');
  const delivery=latestInvoiceDelivery(invoice.id),deliveryText=delivery?deliveryStatusLabel(delivery.delivery_status):(invoice.status==='issued'?'Email outstanding':'');
  return `<tr><td><strong>${esc(invoice.invoice_reference||'Draft')}</strong><br><small>${formatDate(invoice.created_at)}</small></td><td>${esc(recipient||'—')}</td><td>${invoice.invoice_type==='individual'?'Individual':'Consolidated'}</td><td><span class="status ${invoiceStatusClass(invoice.status)}">${esc(invoiceStatusLabel(invoice.status))}</span>${deliveryText?`<br><small class="delivery-summary ${deliveryStatusClass(delivery?.delivery_status||'pending')}">${esc(deliveryText)}</small>`:''}</td><td>${money(invoice.gross_total)}</td><td><button class="btn btn-ghost btn-small" data-open-invoice="${invoice.id}">Open</button></td></tr>`;
 }).join('')}</tbody></table></div>`;
 document.querySelectorAll('[data-open-invoice]').forEach(button=>button.onclick=()=>{state.selectedInvoiceId=button.dataset.openInvoice;renderFinanceInvoiceDetail();});
 renderFinanceInvoiceDetail();
}

function renderFinanceInvoiceDetail(){
 const el=document.querySelector('#invoiceDetail');if(!el)return;
 const invoice=state.financeInvoices.find(row=>row.id===state.selectedInvoiceId);if(!invoice){el.innerHTML='';return;}
 const attendee=state.financeAttendees.find(row=>row.id===invoice.attendee_id),organisation=financeOrganisation(invoice.billing_account_organisation_id);
 const recipient=invoice.recipient_name_snapshot||(invoice.invoice_type==='individual'?`${attendee?.title_rank||''} ${attendee?.first_name||''} ${attendee?.surname||''}`.trim():(organisation?.billing_name||organisation?.organisation_name||'Organisation'));
 const recipientEmail=invoice.recipient_email_snapshot||(invoice.invoice_type==='individual'?attendee?.email:organisation?.billing_email)||'';
 const lines=state.financeLines.filter(line=>line.invoice_id===invoice.id),deliveries=invoiceDeliveries(invoice.id),successfulDelivery=deliveries.find(row=>['accepted','delivered'].includes(row.delivery_status));
 const editableMetadata=canEditFinance()&&['draft','awaiting_billing_update','ready_for_review','approved'].includes(invoice.status),terms=Number(invoice.payment_terms_days??state.financeBillingSettings?.invoice_default_payment_terms_days??14);
 const workflowAction=invoice.status==='ready_for_review'?`<button class="btn btn-primary" type="button" data-invoice-action="approved" ${lines.length?'':'disabled'}>Confirm invoice</button>`:'';
 const workflowMessage=invoice.status==='awaiting_billing_update'?'Rebuild this invoice after resolving the billing update.':invoice.status==='ready_for_review'?'Check every charge line before confirming. Confirmation permanently locks the financial snapshot.':invoice.status==='approved'?(state.financeBillingSettings?.billing_configuration_confirmed?'The financial snapshot is locked. Preview the PDF, then issue and email it.':'Confirm the event billing settings before issuing this invoice.'):invoice.status==='issued'?(successfulDelivery?'The invoice is issued and the email provider has accepted it. Record payment only after funds are received.':'The invoice is issued, but no email has yet been accepted by the email provider.'):invoice.status==='paid'?'Payment has been recorded and this invoice is complete.':'Rebuild the draft when the attendee is ready.';
 const canDocument=['approved','issued','paid'].includes(invoice.status),emailConfigured=!!state.invoiceEmailCapabilities?.email_configured;
 const documentActions=canDocument?`<div class="invoice-document-actions"><button class="btn btn-ghost" type="button" data-invoice-document="preview">Preview PDF</button><button class="btn btn-ghost" type="button" data-invoice-document="download">Download PDF</button><div class="service-save-result"></div></div>`:'';
 const sendLabel=invoice.status==='approved'?'Issue and email invoice':successfulDelivery?'Resend invoice email':'Send invoice email';
 const deliveryForm=canEditFinance()&&['approved','issued','paid'].includes(invoice.status)?`<section class="invoice-delivery-panel"><div class="service-group-head"><div><h4>Email invoice</h4><p>The PDF is attached and every attempt is recorded.</p></div>${emailConfigured?'<span class="status green">Email ready</span>':'<span class="status amber">Setup required</span>'}</div>${emailConfigured?'':`<div class="notice warn">PDF preview and download are ready. Email sending will be enabled after an administrator saves a verified sender address and the secure email provider is connected.</div>`}<form id="financeInvoiceEmailForm" class="form-grid compact-grid"><div class="field"><label>Recipient email *</label><input type="email" name="recipient_email" required value="${esc(recipientEmail)}"></div><div class="field"><label>Email subject *</label><input name="subject" maxlength="250" required value="${esc(`ISSSC 2027 invoice ${invoice.invoice_reference}`)}"></div><div class="field full"><div class="service-actions"><button class="btn btn-primary" type="submit" ${emailConfigured?'':'disabled'}>${esc(sendLabel)}</button><div class="service-save-result"></div></div></div></form></section>`:'';
 const deliveryHistory=deliveries.length?`<section class="invoice-delivery-history"><h4>Email history</h4><div class="delivery-list">${deliveries.map(delivery=>`<div class="delivery-row"><div><strong>${esc(delivery.recipient_email)}</strong><small>${esc(formatDateTime(delivery.accepted_at||delivery.requested_at))} · ${esc(delivery.subject)}</small>${delivery.error_message?`<small class="error-text">${esc(delivery.error_message)}</small>`:''}</div><span class="status ${deliveryStatusClass(delivery.delivery_status)}">${esc(deliveryStatusLabel(delivery.delivery_status))}</span></div>`).join('')}</div></section>`:'';
 const paymentForm=canEditFinance()&&invoice.status==='issued'?`<form id="financePaymentForm" class="form-grid invoice-payment-form"><div class="field"><label>Payment method</label><select name="payment_method"><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="cash">Cash</option><option value="manual">Other / manual</option></select></div><div class="field"><label>Payment reference</label><input name="payment_reference" value="${esc(invoice.payment_reference||'')}"></div><div class="field full"><label>Payment notes</label><textarea name="payment_notes"></textarea></div><div class="field full"><div class="service-actions"><button class="btn btn-primary" type="submit">Mark as paid</button><div class="service-save-result"></div></div></div></form>`:'';
 el.innerHTML=`<section class="invoice-detail"><div class="review-heading"><div><span class="status ${invoiceStatusClass(invoice.status)}">${esc(invoiceStatusLabel(invoice.status))}</span><h3>${esc(invoice.invoice_reference)}</h3><p>${esc(recipient)} · ${invoice.invoice_type==='individual'?'Individual invoice':'Consolidated sponsor invoice'}</p></div><button class="btn btn-ghost btn-small" id="closeInvoice">Close</button></div><div class="invoice-timeline"><div class="${invoice.approved_at?'complete':''}"><small>Confirmed</small><strong>${invoice.approved_at?esc(formatDateTime(invoice.approved_at)):'Pending'}</strong></div><div class="${invoice.issued_at?'complete':''}"><small>Issued</small><strong>${invoice.issued_at?esc(formatDateTime(invoice.issued_at)):'Pending'}</strong></div><div class="${successfulDelivery?'complete':''}"><small>Emailed</small><strong>${successfulDelivery?esc(formatDateTime(successfulDelivery.accepted_at||successfulDelivery.requested_at)):'Pending'}</strong></div><div class="${invoice.paid_at?'complete':''}"><small>Paid</small><strong>${invoice.paid_at?esc(formatDateTime(invoice.paid_at)):'Pending'}</strong></div></div>${lines.length?`<div class="table-scroll"><table class="data-table invoice-lines"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Net</th><th>VAT</th><th>Gross</th></tr></thead><tbody>${lines.map(line=>`<tr><td><strong>${esc(line.description)}</strong><br><small>${esc(line.rate_code||line.source_type||'')}</small></td><td>${Number(line.quantity||0)}</td><td>${money(line.unit_price)}</td><td>${money(line.net_amount)}</td><td>${money(line.vat_amount)}</td><td>${money(line.gross_amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">Invoice totals</th><th>${money(invoice.net_total)}</th><th>${money(invoice.vat_total)}</th><th>${money(invoice.gross_total)}</th></tr></tfoot></table></div>`:'<div class="notice warn">This draft has no charge lines and cannot progress.</div>'}${documentActions}<form id="financeInvoiceMetadataForm" class="form-grid record-form invoice-metadata-form"><div class="form-section"><h3>Billing and payment details</h3><p>These details remain editable until the invoice is issued.</p></div><div class="field"><label>Purchase order reference</label><input name="purchase_order_reference" value="${esc(invoice.purchase_order_reference||'')}" ${editableMetadata?'':'disabled'}></div><div class="field"><label>Payment terms</label><div class="input-suffix"><input name="payment_terms_days" type="number" min="0" max="365" step="1" value="${terms}" ${editableMetadata?'':'disabled'}><span>days</span></div></div><div class="field"><label>Due date</label><input name="due_date" type="date" value="${esc(invoice.due_date||'')}" ${editableMetadata?'':'disabled'}><small>Leave blank to calculate it when issued.</small></div><div class="field"><label>Payment link</label><input name="payment_link" type="url" value="${esc(invoice.payment_link||'')}" ${editableMetadata?'':'disabled'}></div><div class="field full"><label>Invoice notes</label><textarea name="notes" ${editableMetadata?'':'disabled'}>${esc(invoice.notes||'')}</textarea></div>${editableMetadata?'<div class="field full"><div class="service-actions"><button class="btn btn-ghost" type="submit">Save invoice details</button><div class="service-save-result"></div></div></div>':''}</form><div class="invoice-workflow"><div class="invoice-review-note"><strong>${esc(invoiceStatusLabel(invoice.status))}</strong><span>${esc(workflowMessage)}</span></div>${canEditFinance()&&workflowAction?`<div class="service-actions">${workflowAction}<div class="service-save-result"></div></div>`:''}${deliveryForm}${deliveryHistory}${paymentForm}</div></section>`;
 document.querySelector('#closeInvoice').onclick=()=>{state.selectedInvoiceId=null;renderFinanceInvoiceDetail();};
 const metadataForm=document.querySelector('#financeInvoiceMetadataForm');if(metadataForm&&editableMetadata)metadataForm.onsubmit=saveFinanceInvoiceMetadata;
 document.querySelectorAll('[data-invoice-action]').forEach(button=>button.onclick=()=>advanceFinanceInvoice(button.dataset.invoiceAction,button));
 document.querySelectorAll('[data-invoice-document]').forEach(button=>button.onclick=()=>openInvoiceDocument(button.dataset.invoiceDocument,button));
 const emailForm=document.querySelector('#financeInvoiceEmailForm');if(emailForm)emailForm.onsubmit=sendFinanceInvoiceEmail;
 const paidForm=document.querySelector('#financePaymentForm');if(paidForm)paidForm.onsubmit=recordFinancePayment;
 el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function edgeFunctionErrorMessage(error){
 try{const payload=await error?.context?.clone?.().json();if(payload?.error)return payload.error;}catch{}
 return error?.message||'The invoice service could not complete the request.';
}

async function openInvoiceDocument(mode,button){
 const invoice=state.financeInvoices.find(row=>row.id===state.selectedInvoiceId);if(!invoice)return;
 const result=button.parentElement.querySelector('.service-save-result'),original=button.textContent,previewWindow=mode==='preview'?window.open('','_blank'):null;
 button.disabled=true;button.textContent=mode==='preview'?'Preparing preview…':'Preparing download…';if(result)result.innerHTML='';
 const {data,error}=await supabase.functions.invoke('invoice-delivery',{body:{action:'document',invoice_id:invoice.id}});
 if(error){if(previewWindow)previewWindow.close();if(result)result.innerHTML=`<div class="notice error">${esc(await edgeFunctionErrorMessage(error))}</div>`;button.disabled=false;button.textContent=original;return;}
 const blob=data instanceof Blob?data:new Blob([data],{type:'application/pdf'}),url=URL.createObjectURL(blob);
 if(mode==='preview'){
  if(previewWindow)previewWindow.location.href=url;else{const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';link.click();}
 }else{
  const link=document.createElement('a');link.href=url;link.download=`${invoice.invoice_reference||'invoice'}.pdf`;document.body.appendChild(link);link.click();link.remove();
 }
 setTimeout(()=>URL.revokeObjectURL(url),60000);button.disabled=false;button.textContent=original;
}

async function sendFinanceInvoiceEmail(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result'),invoice=state.financeInvoices.find(row=>row.id===state.selectedInvoiceId);if(!invoice)return;
 const question=invoice.status==='approved'?`Issue ${invoice.invoice_reference} and email it to ${body.recipient_email}?`:`Email ${invoice.invoice_reference} to ${body.recipient_email}?`;if(!window.confirm(question))return;
 const original=button.textContent;button.disabled=true;button.textContent='Sending…';result.innerHTML='';
 const {data,error}=await supabase.functions.invoke('invoice-delivery',{body:{action:'send',invoice_id:invoice.id,recipient_email:body.recipient_email,subject:body.subject}});
 if(error){result.innerHTML=`<div class="notice error">${esc(await edgeFunctionErrorMessage(error))}</div>`;button.disabled=false;button.textContent=original;return;}
 toast(data?.accepted_at?'Invoice email accepted by the provider':'Invoice email request completed');await loadInvoices();
}

async function saveFinanceInvoiceMetadata(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result'),terms=Number(body.payment_terms_days);
 if(!Number.isInteger(terms)||terms<0||terms>365){result.innerHTML='<div class="notice error">Payment terms must be a whole number between 0 and 365 days.</div>';return;}
 button.disabled=true;button.textContent='Saving…';result.innerHTML='';
 const {error}=await supabase.rpc('save_finance_invoice_metadata',{p_invoice_id:state.selectedInvoiceId,p_purchase_order_reference:body.purchase_order_reference||null,p_payment_link:body.payment_link||null,p_due_date:body.due_date||null,p_payment_terms_days:terms,p_notes:body.notes||null});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Save invoice details';return;}
 toast('Invoice details saved');await loadInvoices();
}

async function advanceFinanceInvoice(nextStatus,button){
 const question=nextStatus==='approved'?'Confirm this invoice and permanently lock its financial lines?':'Mark this invoice as issued now?';if(!window.confirm(question))return;
 const result=button.parentElement.querySelector('.service-save-result');button.disabled=true;button.textContent=nextStatus==='approved'?'Confirming…':'Issuing…';if(result)result.innerHTML='';
 const {error}=await supabase.rpc('advance_finance_invoice',{p_invoice_id:state.selectedInvoiceId,p_next_status:nextStatus,p_payment_method:null,p_payment_reference:null,p_payment_notes:null});
 if(error){if(result)result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent=nextStatus==='approved'?'Confirm invoice':'Mark as issued';return;}
 toast(nextStatus==='approved'?'Invoice confirmed and locked':'Invoice marked as issued');await loadInvoices();
}

async function recordFinancePayment(event){
 event.preventDefault();const form=event.currentTarget,body=formObject(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result');
 if(!window.confirm('Confirm that payment has been received in full?'))return;
 button.disabled=true;button.textContent='Recording…';result.innerHTML='';
 const {error}=await supabase.rpc('advance_finance_invoice',{p_invoice_id:state.selectedInvoiceId,p_next_status:'paid',p_payment_method:body.payment_method||'manual',p_payment_reference:body.payment_reference||null,p_payment_notes:body.payment_notes||null});
 if(error){result.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.textContent='Mark as paid';return;}
 toast('Payment recorded');await loadInvoices();
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
 authLanding=false;state.route=requestedAuthRoute;history.replaceState(null,'',`${location.pathname}#/${requestedAuthRoute}`);
}

// Render the public experience before connecting to the remote data service.
// This prevents a slow or blocked dependency/session request from leaving a blank page.
render();

async function initialiseBackend(){
 try{
  const {createClient}=await import('/supabase-client.js');
  supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  eventFeature=createEventContentFeature({client:supabase,eventId:EVENT_ID,getSession:()=>state.session,getProfile:()=>state.profile,escapeHtml:esc,toast});
  roomAllocator=createRoomAllocator({client:supabase,eventId:EVENT_ID,getProfile:()=>state.profile,escapeHtml:esc,toast});
  adminSettings=createAdminSettings({client:supabase,eventId:EVENT_ID,getProfile:()=>state.profile,escapeHtml:esc,toast});
  const {data:{session}}=await supabase.auth.getSession();state.session=session;if(session)finishAuthLanding();await loadProfile();
  supabase.auth.onAuthStateChange(async(_event,nextSession)=>{state.session=nextSession;if(nextSession)finishAuthLanding();await loadProfile();if(['staff','event'].includes(state.route))render();});
  if(['staff','event'].includes(state.route))render();
 }catch(error){
  console.error('Secure service connection failed',error);
  if(state.route==='staff')toast('The secure staff service is currently unavailable.');
 }
}

initialiseBackend();
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
