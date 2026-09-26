Warning: truncated output (original token count: 58449)
Total output lines: 1534

import { createWorkspaces } from '/workspaces.js';
import { mountBillingEditor } from '/billing.js';
import { createReports, createLiftApprovals } from '/reports.js';
import { createEventContentFeature } from '/event-content.js';
import { createRoomAllocator } from '/room-allocation.js';
import { createAdminSettings } from '/admin-settings.js';

const SUPABASE_URL = 'https://apugxrwhiyvwcrpzvgxj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WoZaQe5QeUDLb764uMWEtw_78rsp8Mi';
const LIVE_EVENT_ID = '9c1c1d5e-d9f1-4f6b-b323-f3c35261fc19';
let EVENT_ID = LIVE_EVENT_ID;
let selectedEvent = null;
let staffEvents = [];
let eventSwitchPending = false;
let TRAVEL_DATE_START = '2027-01-27';
let TRAVEL_DATE_END = '2027-02-09';
let EVENT_DATE_START = '2027-01-30';
let EVENT_DATE_END = '2027-02-06';
const ATTENDEE_CATEGORIES = ['Sponsor','Sponsor Guest','Winter Sports Ambassador','Military Guest','Committee','Committee Guest','Hill Team','Protocol','Protocol Intern'];
const SPONSOR_CATEGORIES = new Set(['Sponsor','Sponsor Guest']);
const GUEST_CATEGORIES = new Set(['Sponsor Guest','Military Guest','Committee Guest']);
const DISCIPLINE_CATEGORIES = new Set(['Hill Team']);
const SERVICE_CATEGORIES = new Set(['Winter Sports Ambassador','Committee']);
const PREARRANGED_ACCOMMODATION_CATEGORIES = new Set(['Protocol','Protocol Intern','Hill Team']);
const REGISTRATION_CATEGORY_OPTIONS = [
 ['Sponsor','Sponsor Representative'],
 ['Sponsor Guest',"Sponsor Representative's Guest (spouse/partner/dependant, etc.)"],
 ['Winter Sports Ambassador','Military Ambassador'],
 ['Military Guest',"Military Ambassador's Guest (spouse/partner/dependant)"],
 ['Committee','UKAFWSA Committee'],
 ['Committee Guest',"UKAFWSA Committee's Guest (spouse/partner/dependant, etc.)"],
 ['Hill Team','Hill Team/Race Committee'],
 ['Protocol','Core Protocol'],
 ['Protocol Intern','Protocol Intern (“Proton”)']
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
const LESSON_DATES = ['2027-01-31','2027-02-01','2027-02-02','2027-02-03','2027-02-04','2027-02-05'];
let supabase = null;
let eventFeature = null;
let roomAllocator = null;
let adminSettings = null;
let reports = null;
let workspaces = null;
let liftApprovals = null;
let pendingLoginEmail = sessionStorage.getItem('isssc-staff-login-email') || '';

const ROUTES = new Set(['home','register','event','staff']);
const isAuthCallback = (hash=location.hash)=>/(?:^#|[&#])(access_token|refresh_token|error|error_code)=/.test(hash);
const requestedAuthRoute = new URLSearchParams(location.search).get('next') === 'event' ? 'event' : 'staff';
let authLanding = ['staff','event'].includes(new URLSearchParams(location.search).get('next')) || isAuthCallback();
const hashRoute = location.hash.replace('#/','');
const state = { route: authLanding ? requestedAuthRoute : (ROUTES.has(hashRoute) ? hashRoute : 'home'), session:null, profile:null, staffTab:'overview', protocolSection:'accommodation', manualPersonOpen:false, registrationSponsors:[], registrationContextLoaded:false, registrationContextLoading:false, registrationInvitation:null, operationalOverview:null, operationalOverviewError:null, intakeFilter:'pending', intakeRows:[], protocolRows:[], protocolOverview:[], protocolServiceFilter:'all', protocolQuery:'', protocolLookups:{locations:[],rooms:[],rates:[],organisations:[]}, sponsorRows:[], sponsorContacts:[], sponsorInvitations:[], sponsorAttendees:[], sponsorAllocations:[], sponsorQuery:'', selectedSponsorId:null, selectedSponsorContactId:null, newSponsor:false, financeBillingPlans:[], financeReadiness:[], financeSummaries:[], financeAttendees:[], financeOrganisations:[], financeSponsors:[], financeInvoices:[], financeLines:[], financeDeliveries:[], financeRates:[], financePackages:[], financeTravel:[], financeBillingSettings:null, invoiceEmailCapabilities:null, financeQuery:'', financeFilter:'all', financeRateQuery:'', financeRateGroup:'all', financeRateCardOpen:false, financeBillingSettingsOpen:false, selectedFinanceRateId:null, selectedFinanceAttendeeId:null, selectedInvoiceId:null };
const app = document.querySelector('#app');

const icon = (s)=>`<span aria-hidden="true">${s}</span>`;
const navItems = [
  ['home','Home'],['register','Register'],['event','Event app'],['staff','Staff']
];

function toast(message){
  let wrap=document.querySelector('.toast-wrap'); if(!wrap){wrap=document.createElement('div');wrap.className='toast-wrap';document.body.appendChild(wrap)}
  const el=document.createElement('div');el.className='toast';el.textContent=message;wrap.appendChild(el);setTimeout(()=>el.remove(),4200);
}
function setRoute(route){if(selectedEvent?.is_test&&route!=='staff'){location.href=location.pathname+'#/'+route;return;}state.route=route;location.hash=`#/${route}`;render();window.scrollTo({top:0,behavior:'smooth'});}

function layout(content){
  return `<div class="shell">
  <header class="topbar"><div class="topbar-inner">
    <a class="brand" href="#/home"><img src="/ukafwsa-mark.svg" alt="UKAF WSA"><div class="brand-copy"><strong>UKAF WSA</strong><span>Inter Service Snow Sports Championships 2027</span></div></a>
    <button class="menu" id="menuBtn" aria-label="Open navigation">Menu</button>
    <nav class="nav" id="nav">${navItems.map(([r,l])=>`<button data-route="${r}" class="${state.route===r?'active':''}">${l}</button>`).join('')}</nav>
  </div></header>
  <main class="main${state.route==='staff'&&state.session&&state.profile?.active!==false&&state.staffTab==='workspaces'?' main-wide-workspace':''}">${content}</main>
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
return `<div class="hero-mini"><span class="eyebrow">Attendance request</span><h2>ISSSC 2027 registration</h2><p>Please note: each attendee must complete a separate registration form, including guests, spouses, and dependants.</p></div>
<div class="surface"><div class="surface-head"><div><strong>Attendance details</strong><div class="muted small">30 January–6 February 2027 · Méribel</div></div><span class="status purple">Secure web form</span></div><div class="surface-body">
<form id="registrationForm" class="form-grid">
<div class="field full hidden"><label>Website</label><input name="website" autocomplete="off" tabindex="-1"></div>
<div class="field checkbox full"><input type="checkbox" id="onBehalf" name="submitted_on_behalf"><div><label for="onBehalf">I am completing this on behalf of someone else</label><small>We will keep the submitter and attendee details separate.</small></div></div>
<div class="field proxy hidden"><label>Your rank / title *</label><input name="proxy_title_rank" disabled></div><div class="field proxy hidden"><label>Your first name *</label><input name="proxy_first_name" disabled></div>
<div class="field proxy hidden"><label>Your surname *</label><input name="proxy_surname" disabled></div><div class="field proxy hidden"><label>Your email *</label><input type="email" name="proxy_email" disabled></div>
<div class="form-section"><h3>Attendee</h3><p>Who is attending ISSSC 2027?</p></div>
<div class="field"><label>Category *</label><select name="category" required>${registrationCategoryOptions(state.registrationInvitation?.category||'')}</select></div>
<div class="field hidden" id="sponsorOrganisationField"><label>Sponsor *</label><select name="sponsor_name" disabled>${registrationSponsorOptions(state.registrationInvitation?.sponsor_name||'')}</select><small>This list is managed by the Sponsor team in the staff site.</small></div>
<div class="field hidden" id="sponsorOtherField"><label>Other sponsor *</label><input name="sponsor_other" disabled placeholder="Enter the sponsor name"></div>
<div class="field"><label>Rank / title *</label><input name="title_rank" required placeholder="e.g. AVM, Lt Gen, VAdm, Mr or Mrs"></div><div class="field"><label>Role/Job Title/Appointment/Position *</label><input name="role" required placeholder="e.g. CEO, Director or Race Committee"></div>
<div class="field"><label>First name *</label><input name="first_name" required></div><div class="field"><label>Surname *</label><input name="surname" required></div>
<div class="field"><label>Post nominals</label><input name="post_nominals"></div><div class="field"><label>Email *</label><input type="email" name="email" required></div>
<div class="field"><label>Mobile number *</label><input name="mobile" inputmode="tel" required placeholder="07777 123456 or +44 7777 123456"></div><div class="field hidden" id="serviceField"><label>Service *</label><select name="service" disabled>${opts(['Army','Navy','RAF','Civil Service','Other'],'Please select…')}</select></div>
<div class="field hidden" id="serviceOtherField"><label>Other service *</label><input name="service_other" disabled placeholder="Enter the service"></div>
<div class="field hidden" id="disciplineField"><label>Discipline *</label><select name="discipline" disabled>${opts(['Alpine','Snowboard','Telemark','Other'],'Please select…')}</select><small>Required for Hill Team/Race Committee attendees.</small></div>
<div class="field hidden" id="disciplineOtherField"><label>Other discipline *</label><input name="discipline_other" disabled placeholder="Enter the discipline"></div>
<div class="form-section"><h3>Accommodation</h3><p>Accommodation dates are a request. Protocol will record the assigned hotel and room separately.</p></div>
<div class="field checkbox" id="accommodationRequiredField"><input type="checkbox" name="accommodation_required" id="acc"><div><label for="acc">I require accommodation</label><small id="prearrangedAccommodationNote" class="fixed-note-text hidden">Accommodation is arranged for this category; enter the required dates below.</small></div></div>
<div class="notice fixed-note accommodation-detail full hidden" id="packageDates"><strong>Available packages</strong><br>Full week: Sat 30 Jan–Sat 6 Feb · First half: Sat 30 Jan–Wed 3 Feb · Second half: Wed 3–Sat 6 Feb.</div>
<div class="field accommodation-detail hidden" id="hotelPreferenceField"><label>Hotel preference *</label><select name="hotel_preference" disabled></select><small>First come, first served; this is not a guaranteed allocation.</small></div>
<div class="field accommodation-detail hidden"><label>Accommodation from *</label><select name="accommodation_from" disabled>${datedOptions(ACCOMMODATION_START_OPTIONS)}</select><small id="sponsorDateNote" class="fixed-note-text hidden">Sponsor arrivals are limited to Saturday 30 January or Wednesday 3 February.</small></div><div class="field accommodation-detail hidden"><label>Accommodation to *</label><select name="accommodation_to" disabled>${datedOptions(ACCOMMODATION_END_OPTIONS)}</select><small id="sponsorDepartureNote" class="fixed-note-text hidden">Sponsor departures are limited to Wednesday 3 February or Saturday 6 February.</small></div>
<div class="notice fixed-note accommodation-detail full hidden" id="accommodationChargingNote">Dates outside the three standard packages may be charged at the full applicable half-week or full-week rate and must be agreed in advance.</div>
<div class="field checkbox accommodation-detail hidden" id="roomShareField"><input type="checkbox" name="share_room" id="share" disabled><label for="share">This attendee will share a room</label></div>
<div class="field sharing-detail hidden"><label>Who with? *</label><input name="sharing_with" disabled placeholder="Name of the person sharing"></div><div class="field sharing-detail hidden"><label>Room sharing option *</label><select name="room_sharing_option" disabled>${opts(['Double room','Twin room'],'Please select…')}</select></div>
<div class="field hidden" id="dinnerField"><label>Evening meals *</label><select name="dinners_required" disabled>${opts(['Dinner with event guests each night','B&B only / no event dinner'],'Please select…')}</select><small id="sponsorDinnerNote" class="fixed-note-text hidden">Dinner with event guests is included for sponsors and sponsor guests.</small></div><div class="field hidden" id="dietaryField"><label>Dietary requirements</label><textarea name="dietary_requirements" disabled placeholder="e.g. gluten free or vegetarian"></textarea></div>
<div class="form-section"><h3>Arrival</h3><p>Travel details help Protocol coordinate transfers.</p></div>
<div class="notice fixed-note full">Travel outside the scheduled UKAFWSA dates and times is the traveller's responsibility. UKAFWSA will not arrange or fund transport outside scheduled transfers.</div>
<div class="field"><label>Method of transport *</label><select name="arrival_method" required>${opts(['Flight','Self Drive','Other'],'Please select…')}</select></div>
<div class="field hidden" id="arrivalOtherField"><label>Other arrival method *</label><input name="arrival_method_other" disabled placeholder="Describe how you are travelling"></div>
<div class="field arrival-flight-detail hidden"><label>Arrival airport *</label><select name="arrival_airport_station" disabled>${opts(['GVA','Other'],'Please select…')}</select></div><div class="field hidden" id="arrivalAirportOtherField"><label>Other arrival airport *</label><input name="arrival_airport_other" disabled></div>
<div class="field arrival-flight-detail hidden"><label>Arrival flight number *</label><input name="arrival_number" disabled></div>${dateTimeField('arrival_datetime','Arrival flight date and time','',' disabled','arrival-flight-detail hidden')}
<div class="field arrival-flight-detail hidden"><label>Airport transfer provided by UKAFWSA *</label><select name="arrival_transfer_option" disabled>${opts(ARRIVAL_TRANSFER_OPTIONS,'Please select…')}</select><small>Coach times are departures from the airport. Allow time for baggage, customs and passport control.</small></div>
${dateTimeField('arrival_special_transfer_datetime','Date and time of special arrival transfer','',' disabled','arrival-special-detail hidden')}
${dateTimeField('arrival_resort_datetime','Expected arrival date and time in Méribel','',' disabled','arrival-resort-detail hidden')}
<div class="form-section"><h3>Departure</h3><p>Enter the scheduled flight, train, coach or road departure. Protocol will confirm any resort pickup time.</p></div>
<div class="notice fixed-note full">Travel outside the scheduled UKAFWSA dates and times is the traveller's responsibility. UKAFWSA will not arrange or fund transport outside scheduled transfers.</div>
<div class="field"><label>Method of transport *</label><select name="departure_method" required>${opts(['Flight','Self Drive','Other'],'Please select…')}</select></div>
<div class="field hidden" id="departureOtherField"><label>Other departure method *</label><input name="departure_method_other" disabled placeholder="Describe how you are travelling"></div>
<div class="field departure-flight-detail hidden"><label>Departure airport *</label><select name="departure_airport_station" disabled>${opts(['GVA','Other'],'Please select…')}</select></div><div class="field hidden" id="departureAirportOtherField"><label>Other departure airport *</label><input name="departure_airport_other" disabled></div>
<div class="field departure-flight-detail hidden"><label>Departure flight number *</label><input name="departure_number" disabled></div>${dateTimeField('departure_datetime','Departure flight date and time','',' disabled','departure-flight-detail hidden')}
<div class="field departure-flight-detail hidden"><label>Airport transfer provided by UKAFWSA *</label><select name="departure_transfer_option" disabled>${opts(DEPARTURE_TRANSFER_OPTIONS,'Please select…')}</select><small>Coach times are departures from Méribel. Allow approximately two hours to reach Geneva Airport.</small></div>
${dateTimeField('departure_special_transfer_datetime','Date and time of special departure transfer','',' disabled','departure-special-detail hidden')}
${dateTimeField('departure_resort_datetime','Departure date and time from Méribel','',' disabled','departure-resort-detail hidden')}
<div class="form-section"><h3>On snow</h3></div>
<div class="notice fixed-note full">UKAFWSA provides full-day 3 Vallées passes. Pedestrian and half-day passes must be purchased independently.</div>
<div class="field checkbox" id="liftPassField"><input type="checkbox" name="lift_pass_required" id="lift"><label for="lift">I require a 3 Vallées lift pass</label></div><div class="notice hidden" id="carreIncluded"><strong>Carre Neige included.</strong> It is automatically added to every event lift pass and cannot be removed.</div>
<div class="field lift-detail hidden"><label>First day skiing *</label><select name="first_ski_day" disabled>${datedOptions(SKI_START_OPTIONS)}</select><small>Usually the day after arrival.</small></div><div class="field lift-detail hidden"><label>Last day skiing *</label><select name="last_ski_day" disabled>${datedOptions(SKI_END_OPTIONS)}</select><small>Usually the day before departure.</small></div>
<div class="field lift-detail hidden"><label>Date of birth *</label><input type="date" name="date_of_birth" disabled><small>Required only to arrange Carre Neige with the lift pass.</small></div>
<div class="field checkbox full" id="lessonsField"><input type="checkbox" name="lessons_required" id="lessons"><label for="lessons">I require skiing or snowboarding lessons</label></div>
<div class="field lesson-detail hidden"><label>Lesson type *</label><select name="lesson_type" disabled>${opts(LESSON_TYPES,'Please select…')}</select><small>Group lessons: £115.50 per person per lesson. Private lessons: £240 per lesson.</small></div>
<fieldset class="field lesson-detail full hidden" id="lessonDatesField"><legend>Lesson dates *</legend><div class="choice-grid">${LESSON_DATES.map(date=>`<label><input type="checkbox" name="lesson_date" value="${date}" disabled><span>${esc(displayEventDate(date))}</span></label>`).join('')}</div></fieldset>
<div class="field checkbox"><input type="checkbox" name="equipment_hire_required" id="hire"><div><label for="hire">I require ski, snowboard or equipment hire</label><small>This records the requirement only. Protocol will coordinate any information needed later.</small></div></div>
<div class="field full"><label>Anything else Protocol should know?</label><textarea name="other_information"></textarea></div>
<div class="field full"><div class="notice fixed-note">Submitting this form does not create a final bill.</div></div>
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
let tabs=[['overview','Overview'],['workspaces','Bulk worksheets'],['reports','Reports & exports'],...(role==='admin'?[["approvals","Lift-pass approvals"]]:[]),['intake','New registrations'],['protocol','Protocol'],...(canSendNotifications?[['notifications','Notifications']]:[]),['sponsors','Sponsors'],['finance','Finance'],['content','Event content'],...(role==='admin'?[['admin','Admin settings']]:[])];
if(selectedEvent?.is_test)tabs=tabs.filter(([k])=>['protocol','finance','reports','approvals','workspaces'].includes(k));
return `<div class="dashboard-shell${state.staffTab==='workspaces'?' dashboard-worksheets':''}"><aside class="side"><h3>Staff portal</h3>${tabs.map(([r,l])=>`<button data-stafftab="${r}" class="${state.staffTab===r?'active':''}">${l}</button>`).join('')}<button id="signOutBtn">Sign out</button></aside><div class="dash-main">${role==='admin'?`<label>Working event<select id="staffEventSelector" ${eventSwitchPending?'disabled':''}>${staffEvents.map(e=>`<option value="${e.id}" ${e.id===EVENT_ID?'selected':''}>${esc(e.name)}${e.is_test?' — TEST DATA':''}</option>`).join('')}</select></label>`:''}${selectedEvent?.is_test?'<div class="test-event-banner">TEST DATA — isolated event. Email, invitations and push delivery disabled. Invoices use TEST references.</div>':''}<div class="hero-mini"><span class="eyebrow">Role: ${role}</span><h2>${staffTitle()}</h2><p>${staffSubtitle()}</p></div><div id="staffPanel">${staffPanel()}</div></div></div>`;
}
function staffTitle(){return ({workspaces:'Registration & billing worksheets',reports:'Reports & exports',approvals:'Lift-pass approvals',overview:'Operational overview',intake:'Registration intake',protocol:'Protocol operations',notifications:'Staff notifications',sponsors:'Sponsor management',finance:'Finance & billing',content:'Event app content',admin:'Administration'})[state.staffTab]}
function staffSubtitle(){return ({workspaces:'Review and amend multiple records, generate invoices and manage dispatch.',reports:'Search, filter and export authorised operational reports.',approvals:'Review justified changes before they become operational.',overview:'One view of the event workflow.',intake:'Review public attendee requests before they become canonical records.',protocol:'Confirm hotel, room, transfer, lift pass and usage data.',notifications:'Publish notices and send browser alerts to enrolled devices.',sponsors:'Permanent organisations with event-year sponsorship and invitations.',finance:'Review rates, billing readiness and immutable invoice snapshots.',content:'Publish programme, venues, results, media and table plans.',admin:'Manage staff access and operational email settings.'})[state.staffTab]}
function attendeeProtocolMarkup(){return `<div class="surface"><div class="surface-head"><div><strong>Attendee service overview</strong><div class="muted small">See each person's requested and confirmed accommodation, transfers and lift pass, then open the record to amend them.</div></div><div class="protocol-tools"><label class="small muted" for="protocolSearch">Find attendee</label><input id="protocolSearch" type="search" placeholder="Name, email or organisation" value="${esc(state.protocolQuery)}"><select id="protocolServiceFilter" aria-label="Service status"><option value="all">All attendees</option><option value="pending">Needs action</option><option value="confirmed">Confirmed services</option><option value="no_requests">No requests</option></select><button class="btn btn-ghost" id="refreshProtocol">Refresh</button></div></div><div class="surface-body"><div id="protocolTable" class="empty">Loading attendee services…</div><div id="protocolDetail"></div></div></div>`}
function protocolWorkspace(){
 const tabs=[['accommodation','Room allocation'],['transfers','Transfers'],['attendees','Attendee records']];
 const content=state.protocolSection==='accommodation'?(roomAllocator?roomAllocator.markup():'<div class="surface"><div class="surface-body empty">Loading room allocation tools…</div></div>'):state.protocolSection==='transfers'?(eventFeature?eventFeature.protocolMarkup():''):attendeeProtocolMarkup();
 return `<div class="protocol-workspace-toolbar"><nav class="protocol-workspace-nav" aria-label="Protocol work areas">${tabs.map(([key,label])=>`<button data-protocol-section="${key}" class="${state.protocolSection===key?'active':''}">${label}</button>`).join('')}</nav>${canEditProtocol()?'<button class="btn btn-primary" id="addProtocolPerson" type="button">Add person</button>':''}</div>${state.manualPersonOpen?manualPersonMarkup():''}${content}`;
}
function staffPanel(){
if(state.staffTab==='workspaces')return workspaces?.markup()||'';
if(state.staffTab==='reports')return reports?reports.markup():'';
if(state.staffTab==='approvals'&&state.profile?.app_role==='admin')return liftApprovals?liftApprovals.markup():'';
if(state.staffTab==='overview') return operationalOverviewMarkup();
if(state.staffTab==='intake') return `<div class="surface"><div class="surface-head"><div><strong>Registration review</strong><div class="muted small">Open a request to review every submitted detail before making a decision.</div></div><div class="intake-tools"><label class="small muted" for="intakeFilter">Show</label><select id="intakeFilter"><option value="pending">Pending</option><option value="review_required">Needs follow-up</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="all">All</option></select><button class="btn btn-ghost" id="refreshIntake">Refresh</button></div></div><div class="surface-body"><div id="intakeTable" class="empty">Loading registrations…</div><div id="intakeDetail"></div></div></div>`;
if(state.staffTab==='protocol') return protocolWorkspace();
if(state.staffTab==='notifications') return eventFeature ? eventFeature.notificationMarkup() : '<div class="surface"><div class="surface-body empty">Loading notification tools...</div></div>';
if(state.staffTab==='sponsors') return `<div class="surface"><div class="surface-head"><div><strong>Event sponsors</strong><div class="muted small">Manage sponsor terms, billing details, contacts, invitations and attendee accounts.</div></div><div class="sponsor-tools"><input id="sponsorSearch" type="search" placeholder="Find sponsor" value="${esc(state.sponsorQuery)}"><button class="btn btn-ghost" id="refreshSponsors">Refresh</button>${canEditSponsors()?'<button class="btn btn-primary" id="addSponsor">Add sponsor</button>':''}</div></div><div class="surface-body"><div id="sponsorMetrics"></div><div id="sponsorTable" class="empty">Loading sponsors…</div><div id="sponsorDetail"></div></div></div>`;
if(state.staffTab==='finance') return `<div id="financeMetrics" class="grid grid-4"><div class="card metric"><strong>—</strong><span>Ready for invoice</span></div><div class="card metric"><strong>—</strong><span>Blocked</span></div><div class="card metric"><strong>—</strong><span>Draft invoices</span></div><div class="card metric"><strong>—</strong><span>Draft value</span></div></div>
<section class="section"><div class="notice"><strong>Invoice snapshots are protected.</strong> Rate changes update current calculations and mark open drafts for rebuilding. Confirmed, issued and paid invoice lines retain the values captured when they were confirmed.</div></section>
<section class="section"><div class="surface billing-settings-surface"><div class="surface-head billing-settings-head"><div><strong>Billing settings</strong><div class="muted small">Invoice issuer, payment instructions and standard payment terms.</div><div id="financeBillingSummary" class="rate-card-head-summary small muted">Loading billing status…</div></div><button class="btn btn-ghost rate-card-toggle" id="toggleFinanceBilling" type="button" aria-expanded="${state.financeBillingSettingsOpen}"><span>${state.financeBillingSettingsOpen?'Hide':'Show'} billing settings</span><span class="rate-card-chevron" aria-hidden="true">${state.financeBillingSettingsOpen?'▲':'▼'}</span></button></div><div id="financeBillingContent" class="surface-body ${state.financeBillingSettingsOpen?'':'hidden'}"><div id="financeBillingSettingsPanel" class="empty">Loading billing settings…</div></div></div></section>
<section class="section"><div class="surface rate-card-surface"><div class="surface-head rate-card-head"><div><strong>${selectedEvent?.event_year||2027} rate card</strong><div class="muted small">Maintain the confirmed prices used for current calculations and future invoice drafts.</div><div id="financeRateSummary" class="rate-card-head-summary small muted">Loading rate status…</div></div><button class="btn btn-ghost rate-card-toggle" id="toggleFinanceRates" type="button" aria-expanded="${state.financeRateCardOpen}"><span>${state.financeRateCardOpen?'Hide':'Show'} rate card</span><span class="rate-card-chevron" aria-hidden="true">${state.financeRateCardOpen?'▲':'▼'}</span></button></div><div id="financeRateContent" class="surface-body ${state.financeRateCardOpen?'':'hidden'}"><div class="finance-tools rate-card-tools"><input id="financeRateSearch" type="search" placeholder="Find rate" value="${esc(state.financeRateQuery)}"><select id="financeRateGroup" aria-label="Rate category"><option value="all">All rates</option><option value="accommodation">Accommodation</option><option value="passes">Lift passes</option><option value="transfers">Transfers and admin</option><option value="hospitality">Dining and champagne</option><option value="lessons">Lessons</option></select></div><div id="financeRateTable" class="empty">Loading rate card…</div><div id="financeRateDetail"></div></div></div></section>
<section class="section"><div class="surface"><div class="surface-head"><div><strong>Attendee billing readiness</strong><div class="muted small">Review charges, choose individual or company billing, and split items between payers before creating drafts.</div></div><div class="finance-tools"><input id="financeSearch" type="search" placeholder="Find attendee or account" value="${esc(state.financeQuery)}"><select id="financeFilter" aria-label="Readiness filter"><option value="all">All attendees</option><option value="ready">Ready</option><option value="blocked">Blocked</option><option value="consolidated">Consolidated</option></select><button class="btn btn-ghost" id="refreshFinance">Refresh</button></div></div><div class="surface-body"><div id="financeReadiness" class="empty">Loading billing readiness…</div><div id="financeAttendeeDetail"></div></div></div></section>
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
  if(state.route==='staff' && state.sessio…38449 tokens truncated…nt.querySelectorAll('[data-billing-options]').forEach(button=>button.onclick=async()=>{await openFinanceAttendee(button.dataset.billingOptions,false);document.querySelector('#financeBillingEditor')?.scrollIntoView({behavior:'smooth',block:'start'});});
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
 ${editable?'<div id="financeBillingEditor" class="finance-review-section"></div>':''}
 <div class="finance-check-grid">${financeCheckCard('Accommodation',readiness.accommodation_confirmed,'Confirmed by Protocol')}${financeCheckCard('Lift pass',readiness.lift_pass_confirmed,'Confirmed by Protocol')}${financeCheckCard('Transfer review',readiness.transfer_billing_reviewed,readiness.transfer_billing_reviewed?'All chargeable transfers reviewed':`${readiness.unresolved_transfer_count||0} review${Number(readiness.unresolved_transfer_count)===1?'':'s'} outstanding`)}${financeCheckCard('Billing package',packageComplete,packageComplete?(packageItem.chargeable?`${financePackageLabel(state.financeRates.find(rate=>rate.rate_code===packageItem.rate_code)||packageItem)} · ${money(packageItem.total_charge)}`:'No charge · reason recorded'):'Select one package')}${financeCheckCard('Rate lookup',readiness.rate_lookup_complete,'All chargeable services matched')}</div>
 <div class="finance-review-section"><div class="finance-review-heading"><div><h4>Transfer billing review</h4><p>Protocol records the journey. Finance confirms whether each chargeable transfer is ready to bill.</p></div></div>${travel.length?`<div class="finance-travel-list">${travel.map(record=>`<form class="finance-travel-form" data-finance-travel-id="${record.id}"><div class="finance-travel-head"><div><span class="status ${record.protocol_confirmed?'green':'amber'}">${record.protocol_confirmed?'Protocol confirmed':'Protocol draft'}</span><h4>${record.direction==='departure'?'Departure':'Arrival'}</h4></div><span class="status ${record.transfer_chargeable?'purple':'green'}">${record.transfer_chargeable?'Chargeable':'Not chargeable'}</span></div><p class="finance-journey">${esc(financeTravelDetail(record))}</p>${record.transfer_chargeable?`<div class="form-grid compact-grid"><div class="field checkbox full"><input type="checkbox" name="billing_reviewed" id="billing-${record.id}" ${record.billing_reviewed?'checked':''}${editable?'':' disabled'}><div><label for="billing-${record.id}">Billing reviewed</label><small>Tick only after checking the transfer treatment. A review note is required.</small></div></div><div class="field full"><label>Billing review note</label><textarea name="billing_review_notes" ${editable?'':'disabled'} placeholder="Record what Finance checked">${esc(record.billing_review_notes||'')}</textarea></div></div>${editable?`<div class="service-actions"><button class="btn btn-primary btn-small" type="submit">Save transfer review</button><div class="service-save-result"></div></div>`:''}`:'<div class="notice success">No Finance review is required because this transfer is not chargeable.</div>'}</form>`).join('')}</div>`:'<div class="empty">No travel records have been created for this attendee.</div>'}</div>
 <form id="financePackageForm" class="finance-review-section"><div class="finance-review-heading"><div><h4>Transfer billing package</h4><p>Select one return package for the attendee. Arrival and departure are reviewed separately above, but they are not billed as two journey legs.</p></div><span class="status ${packageComplete?'green':'amber'}">${packageComplete?'Selected':'Required'}</span></div><div class="form-grid compact-grid"><div class="field"><label>Billing package</label><select name="package_rate" ${editable?'':'disabled'} required><option value="">Choose package…</option>${packageRates.map(rate=>`<option value="${esc(rate.rate_code)}" ${packageSelection===rate.rate_code?'selected':''} ${rate.charge_category==='transfer'&&!hasChargeableTravel?'disabled':''} ${rate.charge_category==='admin'&&hasChargeableTravel?'disabled':''}>${esc(financePackageLabel(rate))} · ${money(rate.unit_price)}${rate.status!=='approved'?' · proposed':''}</option>`).join('')}<option value="waived" ${packageSelection==='waived'?'selected':''}>No charge / exempt</option></select><small>${hasChargeableTravel?'Choose the airport or Moûtiers return package, or record an exemption.':'No chargeable transfer is recorded, so use Admin only or record an exemption.'}</small></div><div class="field"><label>Package note</label><textarea name="package_notes" ${editable?'':'disabled'} placeholder="Optional for a charge; required for no charge / exempt">${esc(packageItem?.notes||'')}</textarea></div></div>${editable?`<div class="service-actions"><button class="btn btn-primary" type="submit">Save billing package</button><div class="service-save-result"></div></div>`:''}<div class="notice finance-package-note">Saving a package resets the final Finance data check and marks any existing draft for rebuild.</div></form>
 <form id="financeDataCheckForm" class="finance-review-section"><div class="finance-review-heading"><div><h4>Final Finance data check</h4><p>Complete this after checking the attendee identity, billing account and all confirmed services.</p></div><span class="status ${attendee.data_checked?'green':'amber'}">${attendee.data_checked?'Checked':'Not checked'}</span></div><div class="form-grid compact-grid"><div class="field checkbox full"><input type="checkbox" name="exception_flag" id="financeException" ${attendee.exception_flag?'checked':''}${editable?'':' disabled'}><div><label for="financeException">Unresolved billing exception</label><small>Use only when the record needs an explicit Finance warning.</small></div></div><div class="field full"><label>Exception reason</label><textarea name="exception_reason" ${editable?'':'disabled'} placeholder="Required when an exception is recorded">${esc(attendee.exception_reason||'')}</textarea></div></div>${editable?`<div class="service-actions"><button class="btn btn-primary" type="submit" ${prerequisiteComplete?'':'disabled'}>${attendee.data_checked?'Update data check':'Mark data checked'}</button><div class="service-save-result"></div></div>`:''}${!prerequisiteComplete?'<div class="notice warn finance-prerequisite-note">Complete the five checks above before marking the final data check.</div>':''}${attendee.checked_at?`<p class="small muted finance-audit">Last checked ${esc(formatDateTime(attendee.checked_at))}</p>`:''}</form></section>`;
 document.querySelector('#closeFinanceAttendee').onclick=()=>{state.selectedFinanceAttendeeId=null;state.financeTravel=[];el.innerHTML='';};
 const billingEditor=document.querySelector('#financeBillingEditor');
 if(billingEditor){const eventId=EVENT_ID;mountBillingEditor({el:billingEditor,supabase,attendeeId:attendee.id,eventId,organisations:state.financeOrganisations,isCurrent:()=>EVENT_ID===eventId&&state.selectedFinanceAttendeeId===attendee.id&&canEditFinance(),onSaved:async plan=>{state.financeBillingPlans=state.financeBillingPlans.filter(p=>p.attendee_id!==plan.attendee_id).concat(plan);toast('Billing allocation saved');await loadInvoices();},onDrafts:async ids=>{state.selectedInvoiceId=ids[0]||null;await loadInvoices();}}).catch(error=>{if(billingEditor.isConnected)billingEditor.textContent=error.message;});}
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
 const accounts=[...state.financeSponsors];
 for(const plan of state.financeBillingPlans)if(plan.organisation_id&&plan.company_layout==='combined'&&!accounts.some(a=>a.organisation_id===plan.organisation_id))accounts.push({organisation_id:plan.organisation_id});
 const sponsors=accounts.filter(sponsor=>sponsor.consolidated_invoice_requested||state.financeBillingPlans.some(p=>p.organisation_id===sponsor.organisation_id&&p.company_layout==='combined'));
 if(!sponsors.length){el.innerHTML='<div class="empty">No sponsors have requested consolidated billing.</div>';return;}
 el.innerHTML=`<div class="consolidated-list">${sponsors.map(sponsor=>{
  const organisation=financeOrganisation(sponsor.organisation_id)||{};
  const plans=state.financeBillingPlans.filter(p=>p.organisation_id===sponsor.organisation_id&&p.company_layout==='combined');
  const attendees=state.financeAttendees.filter(attendee=>plans.length?plans.some(p=>p.attendee_id===attendee.id):attendee.billing_account_organisation_id===sponsor.organisation_id&&attendee.consolidated_invoice_included);
  const ready=attendees.filter(attendee=>financeBillingReady(attendee.id)).length;
  const total=attendees.reduce((sum,attendee)=>sum+Number(financeSummary(attendee.id)?.estimated_gross_total||0),0);
  const existing=financeOpenInvoice(invoice=>invoice.invoice_type==='consolidated_company'&&!invoice.attendee_id&&invoice.billing_account_organisation_id===sponsor.organisation_id);
  const finalised=existing&&['approved','issued','paid'].includes(existing.status),canCreate=attendees.length>0&&ready===attendees.length&&!finalised;
  return `<article class="consolidated-card"><div><span class="status purple">Consolidated</span><h3>${esc(organisation.billing_name||organisation.organisation_name||'Sponsor account')}</h3><p>${attendees.length?`${ready} of ${attendees.length} attendee${attendees.length===1?'':'s'} ready`:'No attendees selected for this account'}</p></div><div class="consolidated-total"><strong>${money(total)}</strong><span>${plans.length?'Full charges before payer split':'Estimated charges'}</span></div>${canEditFinance()?`<button class="btn btn-primary btn-small" ${plans.length?`data-create-billing-plan="${plans[0].attendee_id}"`:`data-create-consolidated="${sponsor.organisation_id}"`} ${canCreate?'':'disabled'}>${finalised?'Finalised':existing?'Rebuild draft':'Create draft'}</button>`:''}</article>`;
 }).join('')}</div>`;
 document.querySelectorAll('[data-create-billing-plan]').forEach(button=>button.onclick=()=>createFinanceDraft('plan',button.dataset.createBillingPlan,button));
 document.querySelectorAll('[data-create-consolidated]').forEach(button=>button.onclick=()=>createFinanceDraft('consolidated',button.dataset.createConsolidated,button));
}

function renderFinanceInvoices(){
 const el=document.querySelector('#invoiceTable'),detail=document.querySelector('#invoiceDetail');if(!el||!detail)return;
 if(!state.financeInvoices.length){el.innerHTML='<div class="empty">No invoices have been created yet.</div>';detail.innerHTML='';return;}
 el.innerHTML=`<div class="table-scroll"><table class="data-table invoice-table"><thead><tr><th>Reference</th><th>Recipient</th><th>Type</th><th>Status</th><th>Gross</th><th></th></tr></thead><tbody>${state.financeInvoices.map(invoice=>{
  const attendee=state.financeAttendees.find(row=>row.id===invoice.attendee_id),organisation=financeOrganisation(invoice.billing_account_organisation_id);
  const recipient=invoice.invoice_type==='individual'?`${attendee?.first_name||''} ${attendee?.surname||''}`.trim():(organisation?.billing_name||organisation?.organisation_name||'Organisation');
  const delivery=latestInvoiceDelivery(invoice.id),deliveryText=delivery?deliveryStatusLabel(delivery.delivery_status):(invoice.status==='issued'?'Email outstanding':'');
  return `<tr><td><strong>${esc(invoice.invoice_reference||'Draft')}</strong><br><small>${formatDate(invoice.created_at)}</small></td><td>${esc(recipient||'—')}</td><td>${invoice.invoice_type==='individual'?'Individual':invoice.attendee_id?'Company · separate':'Company · combined'}</td><td><span class="status ${invoiceStatusClass(invoice.status)}">${esc(invoiceStatusLabel(invoice.status))}</span>${deliveryText?`<br><small class="delivery-summary ${deliveryStatusClass(delivery?.delivery_status||'pending')}">${esc(deliveryText)}</small>`:''}</td><td>${money(invoice.gross_total)}</td><td><button class="btn btn-ghost btn-small" data-open-invoice="${invoice.id}">Open</button></td></tr>`;
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
 el.innerHTML=`<section class="invoice-detail"><div class="review-heading"><div><span class="status ${invoiceStatusClass(invoice.status)}">${esc(invoiceStatusLabel(invoice.status))}</span><h3>${esc(invoice.invoice_reference)}</h3><p>${esc(recipient)} · ${invoice.invoice_type==='individual'?'Individual invoice':invoice.attendee_id?'Company invoice for one attendee':'Combined company invoice'}</p></div><button class="btn btn-ghost btn-small" id="closeInvoice">Close</button></div><div class="invoice-timeline"><div class="${invoice.approved_at?'complete':''}"><small>Confirmed</small><strong>${invoice.approved_at?esc(formatDateTime(invoice.approved_at)):'Pending'}</strong></div><div class="${invoice.issued_at?'complete':''}"><small>Issued</small><strong>${invoice.issued_at?esc(formatDateTime(invoice.issued_at)):'Pending'}</strong></div><div class="${successfulDelivery?'complete':''}"><small>Emailed</small><strong>${successfulDelivery?esc(formatDateTime(successfulDelivery.accepted_at||successfulDelivery.requested_at)):'Pending'}</strong></div><div class="${invoice.paid_at?'complete':''}"><small>Paid</small><strong>${invoice.paid_at?esc(formatDateTime(invoice.paid_at)):'Pending'}</strong></div></div>${lines.length?`<div class="table-scroll"><table class="data-table invoice-lines"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Net</th><th>VAT</th><th>Gross</th></tr></thead><tbody>${lines.map(line=>`<tr><td><strong>${esc(line.description)}</strong><br><small>${esc(line.rate_code||line.source_type||'')}</small></td><td>${Number(line.quantity||0)}</td><td>${money(line.unit_price)}</td><td>${money(line.net_amount)}</td><td>${money(line.vat_amount)}</td><td>${money(line.gross_amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">Invoice totals</th><th>${money(invoice.net_total)}</th><th>${money(invoice.vat_total)}</th><th>${money(invoice.gross_total)}</th></tr></tfoot></table></div>`:'<div class="notice warn">This draft has no charge lines and cannot progress.</div>'}${documentActions}<form id="financeInvoiceMetadataForm" class="form-grid record-form invoice-metadata-form"><div class="form-section"><h3>Billing and payment details</h3><p>These details remain editable until the invoice is issued.</p></div><div class="field"><label>Purchase order reference</label><input name="purchase_order_reference" value="${esc(invoice.purchase_order_reference||'')}" ${editableMetadata?'':'disabled'}></div><div class="field"><label>Payment terms</label><div class="input-suffix"><input name="payment_terms_days" type="number" min="0" max="365" step="1" value="${terms}" ${editableMetadata?'':'disabled'}><span>days</span></div></div><div class="field"><label>Due date</label><input name="due_date" type="date" value="${esc(invoice.due_date||'')}" ${editableMetadata?'':'disabled'}><small>Leave blank to calculate it when issued.</small></div><div class="field"><label>Payment link</label><input name="payment_link" type="url" value="${esc(invoice.payment_link||'')}" ${editableMetadata?'':'disabled'}></div><div class="field full"><label>Invoice notes</label><textarea name="notes" ${editableMetadata?'':'disabled'}>${esc(invoice.notes||'')}</textarea></div>${editableMetadata?'<div class="field full"><div class="service-actions"><button class="btn btn-ghost" type="submit">Save invoice details</button><div class="service-save-result"></div></div></div>':''}</form><div class="invoice-workflow"><div class="invoice-review-note"><strong>${esc(invoiceStatusLabel(invoice.status))}</strong><span>${esc(workflowMessage)}</span></div>${canEditFinance()&&workflowAction?`<div class="service-actions">${workflowAction}<div class="service-save-result"></div></div>`:''}${deliveryForm}${deliveryHistory}${paymentForm}</div></section>`;
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
 const call=type==='plan'?supabase.rpc('create_attendee_billing_drafts',{p_attendee_id:targetId}):type==='individual'
  ?supabase.rpc('create_finance_individual_draft',{p_attendee_id:targetId})
  :supabase.rpc('create_finance_consolidated_draft',{p_event_id:EVENT_ID,p_organisation_id:targetId});
 const {data,error}=await call;
 if(error){toast(error.message);button.disabled=false;button.textContent=original;return;}
 state.selectedInvoiceId=Array.isArray(data)?data[0]:data;toast(type==='individual'?'Individual draft ready for review':'Consolidated draft ready for review');await loadInvoices();
}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

window.addEventListener('hashchange',()=>{
 if(authLanding && !location.hash.startsWith('#/')) return;
 const route=location.hash.replace('#/','');if(selectedEvent?.is_test&&route!=='staff'){location.href=location.pathname+'#/'+route;return;}state.route=ROUTES.has(route)?route:'home';render();
});

function finishAuthLanding(){
 if(!authLanding)return;
 authLanding=false;state.route=requestedAuthRoute;history.replaceState(null,'',`${location.pathname}#/${requestedAuthRoute}`);
}

// Render the public experience before connecting to the remote data service.
// This prevents a slow or blocked dependency/session request from leaving a blank page.
render();

function createStaffFeatures(){
  workspaces=createWorkspaces({client:supabase,eventId:EVENT_ID,getWorkingEvent:()=>EVENT_ID,isTest:!!selectedEvent?.is_test,getProfile:()=>state.profile,escapeHtml:esc,toast,openAttendee:async id=>{state.staffTab='protocol';state.protocolSection='attendees';render();await loadProtocol();await openProtocolAttendee(id);}});
  eventFeature=createEventContentFeature({client:supabase,eventId:EVENT_ID,getSession:()=>state.session,getProfile:()=>state.profile,escapeHtml:esc,toast});
  roomAllocator=createRoomAllocator({client:supabase,eventId:EVENT_ID,isTest:!!selectedEvent?.is_test,eventStart:EVENT_DATE_START,eventEnd:EVENT_DATE_END,getProfile:()=>state.profile,escapeHtml:esc,toast});
  adminSettings=createAdminSettings({client:supabase,eventId:EVENT_ID,getProfile:()=>state.profile,escapeHtml:esc,toast});
  reports=createReports({client:supabase,eventId:EVENT_ID,getProfile:()=>state.profile,escapeHtml:esc,toast,openAttendee:async id=>{state.staffTab='protocol';state.protocolSection='attendees';render();await loadProtocol();await openProtocolAttendee(id);}});
  liftApprovals=createLiftApprovals({client:supabase,eventId:EVENT_ID,escapeHtml:esc,toast});
}
async function loadStaffEvents(){
 if(state.profile?.app_role!=='admin'){staffEvents=[];return;}
 const {data,error}=await supabase.from('events').select('id,name,event_year,start_date,end_date,is_test,delivery_disabled').order('event_year',{ascending:false});
 if(!error)staffEvents=(data||[]).filter(e=>e.id===LIVE_EVENT_ID||e.is_test);
 selectedEvent=staffEvents.find(e=>e.id===EVENT_ID)||null;
}
async function switchStaffEvent(id){
 if(state.profile?.app_role!=='admin'||eventSwitchPending)return;
 const event=staffEvents.find(e=>e.id===id);if(!event)return;
 // Full document navigation clears all outstanding requests, forms and cached rows.
 sessionStorage.setItem('isssc-working-event',id);
 location.href=location.pathname+'?working_event='+encodeURIComponent(id)+'#/staff';
}
async function restoreStaffEvent(){
 await loadStaffEvents();
 const id=new URLSearchParams(location.search).get('working_event');
 const event=staffEvents.find(e=>e.id===id);
 if(event?.is_test&&state.profile?.app_role==='admin'){
  EVENT_ID=event.id;selectedEvent=event;EVENT_DATE_START=event.start_date;EVENT_DATE_END=event.end_date;
  TRAVEL_DATE_START=event.start_date;TRAVEL_DATE_END=event.end_date;TRAVEL_DATES=dateRange(TRAVEL_DATE_START,TRAVEL_DATE_END);
  state.route='staff';state.staffTab='reports';createStaffFeatures();
 }
}

async function initialiseBackend(){
 try{
  const {createClient}=await import('/supabase-client.js');
  supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  createStaffFeatures();
  const {data:{session}}=await supabase.auth.getSession();state.session=session;if(session)finishAuthLanding();await loadProfile();await restoreStaffEvent();
  supabase.auth.onAuthStateChange(async(_event,nextSession)=>{state.session=nextSession;if(nextSession)finishAuthLanding();await loadProfile();if(!nextSession||state.profile?.app_role!=='admin'){EVENT_ID=LIVE_EVENT_ID;selectedEvent=null;EVENT_DATE_START='2027-01-30';EVENT_DATE_END='2027-02-06';TRAVEL_DATE_START='2027-01-27';TRAVEL_DATE_END='2027-02-09';TRAVEL_DATES=dateRange(TRAVEL_DATE_START,TRAVEL_DATE_END);createStaffFeatures();}else await loadStaffEvents();if(['staff','event'].includes(state.route))render();});
  if(['staff','event'].includes(state.route))render();
 }catch(error){
  console.error('Secure service connection failed',error);
  if(state.route==='staff')toast('The secure staff service is currently unavailable.');
 }
}

initialiseBackend();
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
