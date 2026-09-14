const EVENT_TZ = 'Europe/Paris';

export function createEventContentFeature({ client, eventId, getSession, getProfile, escapeHtml, toast }) {
  const esc = escapeHtml;
  const state = {
    publicSection: 'today',
    staffSection: 'programme',
    announcements: [], venues: [], schedule: [], documents: [], results: [], media: [],
    plans: [], tables: [], assignments: [], transfers: [], passengers: [],
    attendees: [], sponsors: [], notificationDeliveries: [],
    pushStatus: null, pushEnabled: false, pushSupported: true, notificationResult: null,
    selected: {},
  };

  const role = () => getProfile()?.app_role || 'attendee';
  const canContent = () => ['admin', 'operations', 'content_manager'].includes(role());
  const canNotify = () => ['admin', 'protocol', 'operations', 'content_manager'].includes(role());
  const canTables = () => ['admin', 'protocol', 'operations', 'content_manager'].includes(role());
  const canTransfers = () => ['admin', 'protocol', 'operations'].includes(role());
  const statusClass = value => value ? 'green' : 'amber';
  const checked = value => value ? ' checked' : '';
  const selected = (left, right) => String(left ?? '') === String(right ?? '') ? ' selected' : '';
  const safeUrl = value => {
    try { const url = new URL(String(value || '')); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  };
  const formatDate = value => value ? new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: EVENT_TZ,
  }).format(new Date(value.length === 10 ? `${value}T12:00:00+01:00` : value)) : 'Not set';
  const formatTime = value => value ? new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: EVENT_TZ,
  }).format(new Date(value)) : '';
  const localInput = value => {
    if (!value) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      hourCycle: 'h23', timeZone: EVENT_TZ,
    }).formatToParts(new Date(value)).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };
  const meribelIso = value => value ? new Date(`${value}:00+01:00`).toISOString() : null;
  const publicAsset = row => {
    if (row.storage_bucket && row.storage_object_path) {
      return client.storage.from(row.storage_bucket).getPublicUrl(row.storage_object_path).data.publicUrl;
    }
    return safeUrl(row.external_url || row.file_path);
  };
  const options = (rows, value, label, placeholder = 'Select...') =>
    `<option value="">${esc(placeholder)}</option>${rows.map(row => `<option value="${row.id}"${selected(row.id, value)}>${esc(label(row))}</option>`).join('')}`;
  const formData = form => {
    const output = Object.fromEntries(new FormData(form));
    form.querySelectorAll('input[type=checkbox]').forEach(input => { output[input.name] = input.checked; });
    return output;
  };
  const message = (target, text, type = 'error') => {
    if (target) target.innerHTML = `<div class="notice ${type}">${esc(text)}</div>`;
  };

  function publicMarkup() {
    return `<div class="hero-mini event-app-hero"><span class="eyebrow">Event app</span><h2>ISSSC 2027 in Méribel</h2><p>Live programme, race locations, results, coverage and operational information.</p></div>
    <section id="notificationOptIn" class="notification-opt-in">${getSession() ? '<div><strong>Event alerts</strong><p>Checking browser notification settings...</p></div>' : '<div><strong>Event alerts</strong><p>Sign in to enable urgent changes and operational notices on this device.</p></div><form id="notificationLoginForm" class="notification-login"><input type="email" name="email" required aria-label="Email address" placeholder="name@example.com"><button class="btn btn-primary btn-small" type="submit">Send sign-in link</button><div class="service-save-result"></div></form>'}</section>
    <div class="event-app-nav" role="navigation" aria-label="Event information">
      ${[['today','Today'],['programme','Programme'],['locations','Locations'],['results','Results'],['media','Media'],['coverage','BFBS'],['tables','Table plans'],['transfers','Transfers']].map(([id,label]) => `<button class="${state.publicSection === id ? 'active' : ''}" data-event-section="${id}">${label}</button>`).join('')}
    </div>
    <div id="eventAppContent" class="event-app-content"><div class="surface"><div class="surface-body empty">Loading event information...</div></div></div>`;
  }

  function bindPublic() {
    document.querySelectorAll('[data-event-section]').forEach(button => button.onclick = () => {
      state.publicSection = button.dataset.eventSection;
      document.querySelectorAll('[data-event-section]').forEach(item => item.classList.toggle('active', item === button));
      renderPublicContent();
    });
    bindNotificationOptIn();
  }

  async function loadPublic() {
    const queries = [
      client.from('announcements').select('*').eq('event_id', eventId).eq('published', true).order('publish_at', { ascending: false }),
      client.from('venues').select('*').eq('event_id', eventId).eq('active', true).eq('published', true).order('sort_order').order('name'),
      client.from('schedule_items').select('*').eq('event_id', eventId).eq('published', true).order('starts_at'),
      client.from('event_documents').select('*').eq('event_id', eventId).eq('published', true).order('created_at', { ascending: false }),
      client.from('race_results').select('*').eq('event_id', eventId).eq('published', true).order('race_date', { ascending: false }),
      client.from('event_media').select('*').eq('event_id', eventId).eq('published', true).order('sort_order').order('created_at', { ascending: false }),
    ];
    const results = await Promise.all(queries);
    [state.announcements, state.venues, state.schedule, state.documents, state.results, state.media] = results.map(result => result.data || []);
    if (getSession()) {
      const privateResults = await Promise.all([
        client.from('table_plans').select('*').eq('event_id', eventId).eq('published', true).order('event_date'),
        client.from('seating_tables').select('*').eq('event_id', eventId).order('sort_order'),
        client.from('seating_assignments').select('*').order('seat_number'),
        client.from('transfer_runs').select('*').eq('event_id', eventId).eq('published', true).neq('status', 'cancelled').order('departure_at'),
        client.from('transfer_passengers').select('*').order('sort_order'),
      ]);
      [state.plans, state.tables, state.assignments, state.transfers, state.passengers] = privateResults.map(result => result.data || []);
    } else {
      state.plans = []; state.tables = []; state.assignments = []; state.transfers = []; state.passengers = [];
    }
    renderPublicContent();
    await refreshNotificationOptIn();
  }

  function notificationOptInMarkup() {
    if (!state.pushSupported) return '<div><strong>Event alerts</strong><p>This browser does not support web notifications. Notices remain available in the Event app.</p></div>';
    if (Notification.permission === 'denied') return '<div><strong>Event alerts are blocked</strong><p>Allow notifications for this site in your browser settings, then reload the page.</p></div>';
    if (state.pushEnabled) return '<div><span class="status green">Enabled</span><strong>Event alerts</strong><p>This device will receive published ISSSC operational notifications.</p></div><button class="btn btn-ghost btn-small" id="disableEventAlerts" type="button">Turn off</button>';
    return '<div><strong>Event alerts</strong><p>Receive urgent changes and operational notices on this device.</p></div><button class="btn btn-primary btn-small" id="enableEventAlerts" type="button">Enable alerts</button>';
  }

  function bindNotificationOptIn() {
    const enable = document.querySelector('#enableEventAlerts');
    const disable = document.querySelector('#disableEventAlerts');
    const login = document.querySelector('#notificationLoginForm');
    if (enable) enable.onclick = enableEventAlerts;
    if (disable) disable.onclick = disableEventAlerts;
    if (login) login.onsubmit = async event => {
      event.preventDefault();
      const result = login.querySelector('.service-save-result'), button = login.querySelector('button');
      button.disabled = true; button.textContent = 'Sending...';
      const email = new FormData(login).get('email');
      const response = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/?next=event` } });
      message(result, response.error ? response.error.message : 'Check your email for the secure sign-in link.', response.error ? 'error' : 'success');
      button.disabled = false; button.textContent = 'Send sign-in link';
    };
  }

  async function refreshNotificationOptIn() {
    const el = document.querySelector('#notificationOptIn');
    if (!el || !getSession()) return;
    state.pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (state.pushSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const existing = await client.from('push_subscriptions').select('active').eq('endpoint', subscription.endpoint).maybeSingle();
          state.pushEnabled = !!existing.data?.active;
        } else state.pushEnabled = false;
      } catch { state.pushEnabled = false; }
    }
    el.innerHTML = notificationOptInMarkup();
    bindNotificationOptIn();
  }

  function urlBase64ToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  }

  async function enableEventAlerts() {
    const button = document.querySelector('#enableEventAlerts');
    if (button) { button.disabled = true; button.textContent = 'Enabling...'; }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      const config = await client.functions.invoke('push-public-config', { method: 'GET' });
      if (config.error || !config.data?.enabled || !config.data?.vapid_public_key) throw new Error('Event notifications are not configured yet.');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.data.vapid_public_key) });
      const json = subscription.toJSON();
      const saved = await client.from('push_subscriptions').upsert({
        user_id: getSession().user.id,
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh,
        auth_key: json.keys?.auth,
        user_agent: navigator.userAgent,
        active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });
      if (saved.error) throw saved.error;
      state.pushEnabled = true;
      toast('Event alerts enabled on this device');
    } catch (error) { toast(error.message || 'Unable to enable event alerts'); }
    await refreshNotificationOptIn();
  }

  async function disableEventAlerts() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await client.from('push_subscriptions').update({ active: false, updated_at: new Date().toISOString() }).eq('endpoint', subscription.endpoint);
      await subscription.unsubscribe();
    }
    state.pushEnabled = false;
    toast('Event alerts turned off on this device');
    await refreshNotificationOptIn();
  }

  function eventLoginMarkup(subject) {
    if (getSession()) return `<div class="notice">No published ${esc(subject)} are currently available for your account.</div>`;
    return `<div class="private-event-login"><span class="status purple">Attendee sign-in</span><h3>${esc(subject)}</h3><p>For privacy, this information is available only to signed-in attendees and authorised staff.</p><form class="event-login-form"><label>Email address</label><div class="inline-login"><input type="email" name="email" required placeholder="name@example.com"><button class="btn btn-primary" type="submit">Send sign-in link</button></div><div class="service-save-result"></div></form></div>`;
  }

  function bindEventLogin() {
    const form = document.querySelector('.event-login-form');
    if (!form) return;
    form.onsubmit = async event => {
      event.preventDefault();
      const result = form.querySelector('.service-save-result');
      const email = new FormData(form).get('email');
      message(result, 'Sending secure sign-in link...', '');
      const response = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/?next=event` } });
      message(result, response.error ? response.error.message : 'Check your email for the secure sign-in link.', response.error ? 'error' : 'success');
    };
  }

  function renderPublicContent() {
    const el = document.querySelector('#eventAppContent');
    if (!el) return;
    const venueName = id => state.venues.find(row => row.id === id)?.name || '';
    if (state.publicSection === 'today') {
      const notices = state.announcements.slice(0, 5);
      const nextItems = state.schedule.slice(0, 6);
      el.innerHTML = `<div class="event-overview-grid"><section class="surface"><div class="surface-head"><strong>Latest notices</strong></div><div class="surface-body">${notices.length ? `<div class="event-feed">${notices.map(row => `<article><span class="status ${row.priority === 'urgent' ? 'red' : row.priority === 'important' ? 'amber' : 'purple'}">${esc(row.priority)}</span><h3>${esc(row.title)}</h3><p>${esc(row.body)}</p>${safeUrl(row.action_url) ? `<a class="text-link" href="${esc(safeUrl(row.action_url))}" target="_blank" rel="noopener">${esc(row.action_label || 'Open link')}</a>` : ''}</article>`).join('')}</div>` : '<div class="empty">No notices have been published yet.</div>'}</div></section><section class="surface"><div class="surface-head"><strong>Programme highlights</strong></div><div class="surface-body">${nextItems.length ? `<div class="event-agenda">${nextItems.map(row => `<article><time>${esc(formatDate(row.starts_at))}<strong>${esc(formatTime(row.starts_at))}</strong></time><div><h3>${esc(row.title)}</h3><p>${esc([row.category, venueName(row.venue_id)].filter(Boolean).join(' · '))}</p></div></article>`).join('')}</div>` : '<div class="empty">The programme will appear here when published.</div>'}</div></section></div>`;
    } else if (state.publicSection === 'programme') {
      const days = Object.groupBy ? Object.groupBy(state.schedule, row => row.starts_at.slice(0, 10)) : state.schedule.reduce((out, row) => ((out[row.starts_at.slice(0, 10)] ||= []).push(row), out), {});
      el.innerHTML = state.schedule.length ? Object.entries(days).map(([day, rows]) => `<section class="surface event-day"><div class="surface-head"><strong>${esc(formatDate(day))}</strong></div><div class="surface-body event-agenda">${rows.map(row => `<article><time><strong>${esc(formatTime(row.starts_at))}</strong>${row.ends_at ? `<span>to ${esc(formatTime(row.ends_at))}</span>` : ''}</time><div><span class="status purple">${esc(row.category || 'Event')}</span><h3>${esc(row.title)}</h3><p>${esc(row.description || row.attendee_notes || '')}</p>${venueName(row.venue_id) ? `<small>${esc(venueName(row.venue_id))}</small>` : ''}${safeUrl(row.stream_url) ? `<a class="text-link" href="${esc(safeUrl(row.stream_url))}" target="_blank" rel="noopener">Watch BFBS coverage</a>` : ''}</div></article>`).join('')}</div></section>`).join('') : '<div class="surface"><div class="surface-body empty">The programme has not been published yet.</div></div>';
    } else if (state.publicSection === 'locations') {
      el.innerHTML = `<div class="location-grid">${state.venues.length ? state.venues.map(row => `<article class="card location-card"><span class="status green">${esc(row.venue_type || 'Méribel venue')}</span><h3>${esc(row.name)}</h3><p>${esc([row.piste_sector, row.map_reference].filter(Boolean).join(' · '))}</p><p>${esc(row.directions_text || row.address || '')}</p>${safeUrl(row.map_url) ? `<a class="btn btn-ghost btn-small" href="${esc(safeUrl(row.map_url))}" target="_blank" rel="noopener">Open Méribel map</a>` : ''}</article>`).join('') : '<div class="surface"><div class="surface-body empty">No Méribel locations have been published yet.</div></div>'}</div>`;
    } else if (state.publicSection === 'results') {
      el.innerHTML = `<div class="results-grid">${state.results.length ? state.results.map(row => `<article class="card result-card"><span class="status purple">${esc(row.discipline)}</span><h3>${esc(row.title)}</h3><p>${esc(formatDate(row.race_date))}${venueName(row.venue_id) ? ` · ${esc(venueName(row.venue_id))}` : ''}</p>${row.summary ? `<p>${esc(row.summary)}</p>` : ''}${publicAsset(row) ? `<a class="btn btn-primary btn-small" href="${esc(publicAsset(row))}" target="_blank" rel="noopener">Open result PDF</a>` : ''}</article>`).join('') : '<div class="surface"><div class="surface-body empty">Race results will appear here after publication.</div></div>'}</div>`;
    } else if (state.publicSection === 'media') {
      const images = state.media.filter(row => row.media_type === 'image' && publicAsset(row));
      el.innerHTML = images.length ? `<div class="media-grid">${images.map(row => `<figure><img src="${esc(publicAsset(row))}" alt="${esc(row.title)}" loading="lazy"><figcaption><strong>${esc(row.title)}</strong>${row.caption ? `<span>${esc(row.caption)}</span>` : ''}${row.credit ? `<small>Credit: ${esc(row.credit)}</small>` : ''}</figcaption></figure>`).join('')}</div>` : '<div class="surface"><div class="surface-body empty">Event photographs will appear here when published.</div></div>';
    } else if (state.publicSection === 'coverage') {
      const videos = [...state.schedule.filter(row => safeUrl(row.stream_url)).map(row => ({ title: row.title, description: row.description, url: row.stream_url })), ...state.media.filter(row => row.media_type === 'video' && safeUrl(row.external_url)).map(row => ({ title: row.title, description: row.caption, url: row.external_url })), ...state.documents.filter(row => row.category === 'bfbs' && safeUrl(row.external_url)).map(row => ({ title: row.title, description: row.description, url: row.external_url }))];
      el.innerHTML = `<div class="coverage-grid">${videos.length ? videos.map(row => `<article class="card"><span class="status red">BFBS</span><h3>${esc(row.title)}</h3><p>${esc(row.description || 'Official championship coverage')}</p><a class="btn btn-primary btn-small" href="${esc(safeUrl(row.url))}" target="_blank" rel="noopener">Watch on YouTube</a></article>`).join('') : '<div class="surface"><div class="surface-body empty">BFBS coverage links will appear here when published.</div></div>'}</div>`;
    } else if (state.publicSection === 'tables') {
      if (!state.plans.length) el.innerHTML = eventLoginMarkup('table plans');
      else el.innerHTML = `<div class="private-data-banner">Published table allocations are visible only to signed-in attendees and staff.</div>${state.plans.map(plan => `<section class="surface event-day"><div class="surface-head"><div><strong>${esc(formatDate(plan.event_date))}</strong><div class="small muted">Dinner ${esc(plan.dinner_time?.slice(0,5) || '')}</div></div></div><div class="surface-body table-plan-grid">${state.tables.filter(table => table.table_plan_id === plan.id).map(table => `<article class="event-table"><h3>${esc(table.table_name)}</h3><ol>${Array.from({ length: table.capacity || 10 }, (_, index) => { const assignment = state.assignments.find(item => item.seating_table_id === table.id && item.seat_number === index + 1); return `<li><span>${index + 1}</span><strong>${esc(assignment?.occupant_name_snapshot || 'Available')}</strong>${assignment?.guest_role ? `<small>${esc(assignment.guest_role)}</small>` : ''}</li>`; }).join('')}</ol></article>`).join('')}</div></section>`).join('')}`;
    } else if (state.publicSection === 'transfers') {
      if (!state.transfers.length) el.innerHTML = eventLoginMarkup('transfer information');
      else el.innerHTML = `<div class="private-data-banner">Contact details and passenger lists are protected and visible only to signed-in attendees and staff.</div><div class="transfer-public-list">${state.transfers.map(run => { const passengers = state.passengers.filter(item => item.transfer_run_id === run.id); return `<article class="surface transfer-public-card"><div class="surface-head"><div><span class="status ${run.status === 'confirmed' ? 'green' : 'purple'}">${esc(run.status)}</span><h3>${esc(run.transfer_name)}</h3><p>${esc(formatDate(run.departure_at))} at ${esc(formatTime(run.departure_at))}</p></div><strong>${passengers.length} passenger${passengers.length === 1 ? '' : 's'}</strong></div><div class="surface-body"><dl class="transfer-facts"><div><dt>Route</dt><dd>${esc(run.pickup_location)} to ${esc(run.destination)}</dd></div><div><dt>Service</dt><dd>${esc(run.service_type || run.vehicle_details || 'To be confirmed')}</dd></div><div><dt>Driver</dt><dd>${esc([run.driver_name, run.driver_mobile].filter(Boolean).join(' · ') || 'To be confirmed')}</dd></div><div><dt>Lead traveller</dt><dd>${esc([run.lead_traveller_name, run.lead_traveller_mobile].filter(Boolean).join(' · ') || 'To be confirmed')}</dd></div></dl>${run.attendee_notes ? `<div class="notice">${esc(run.attendee_notes)}</div>` : ''}<div class="passenger-chips">${passengers.map(item => `<span>${esc(item.passenger_name_snapshot)}</span>`).join('')}</div></div></article>`; }).join('')}</div>`;
    }
    bindEventLogin();
  }

  function staffMarkup() {
    if (state.staffSection === 'announcements') state.staffSection = 'programme';
    return `<div class="content-admin-nav">${[
      ['programme','Programme & BFBS'],['venues','Méribel locations'],
      ['results','Race results'],['media','Media'],['tables','Table plans'],
    ].map(([id,label]) => `<button class="${state.staffSection === id ? 'active' : ''}" data-content-section="${id}">${label}</button>`).join('')}</div><div id="contentAdminPanel"><div class="surface"><div class="surface-body empty">Loading event content...</div></div></div>`;
  }

  function notificationMarkup() {
    return '<div id="contentAdminPanel"><section class="surface"><div class="surface-body empty">Loading notifications...</div></section></div>';
  }

  function bindStaff() {
    document.querySelectorAll('[data-content-section]').forEach(button => button.onclick = () => {
      state.staffSection = button.dataset.contentSection;
      state.selected[state.staffSection] = null;
      document.querySelectorAll('[data-content-section]').forEach(item => item.classList.toggle('active', item === button));
      renderStaffContent();
    });
  }

  async function loadStaff() {
    const results = await Promise.all([
      client.from('announcements').select('*').eq('event_id', eventId).order('publish_at', { ascending: false }),
      client.from('venues').select('*').eq('event_id', eventId).order('sort_order').order('name'),
      client.from('schedule_items').select('*').eq('event_id', eventId).order('starts_at'),
      client.from('event_documents').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
      client.from('race_results').select('*').eq('event_id', eventId).order('race_date', { ascending: false }),
      client.from('event_media').select('*').eq('event_id', eventId).order('sort_order').order('created_at', { ascending: false }),
      client.from('table_plans').select('*').eq('event_id', eventId).order('event_date'),
      client.from('seating_tables').select('*').eq('event_id', eventId).order('sort_order'),
      client.from('seating_assignments').select('*').order('seat_number'),
      client.from('attendees').select('id,title_rank,first_name,surname,email,mobile,attendance_status,record_source').eq('event_id', eventId).neq('attendance_status', 'cancelled').order('surname').order('first_name'),
      client.from('event_sponsors').select('id,organisation_id,sponsor_status,active,organisations(id,organisation_name,short_name)').eq('event_id', eventId).eq('active', true),
    ]);
    const failed = results.find(result => result.error);
    if (failed) {
      const panel = document.querySelector('#contentAdminPanel');
      if (panel) message(panel, failed.error.message);
      return;
    }
    [state.announcements, state.venues, state.schedule, state.documents, state.results, state.media, state.plans, state.tables, state.assignments, state.attendees, state.sponsors] = results.map(result => result.data || []);
    renderStaffContent();
  }

  async function loadNotifications() {
    state.staffSection = 'announcements';
    const results = await Promise.all([
      client.from('announcements').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
      client.from('attendees').select('id,category,service').eq('event_id', eventId).neq('attendance_status', 'cancelled'),
      client.from('notification_deliveries').select('*').eq('event_id', eventId).order('requested_at', { ascending: false }).limit(50),
      client.functions.invoke('send-push-announcement', { body: { action: 'status' } }),
    ]);
    const failed = results.slice(0, 3).find(result => result.error);
    if (failed) {
      const panel = document.querySelector('#contentAdminPanel');
      if (panel) message(panel, failed.error.message);
      return;
    }
    state.announcements = results[0].data || [];
    state.attendees = results[1].data || [];
    state.notificationDeliveries = results[2].data || [];
    state.pushStatus = results[3].error ? null : results[3].data;
    renderStaffContent();
  }

  function adminList(rows, render, kind, editable = canContent()) {
    const addLabel = kind === 'programme' ? 'programme item' : kind === 'announcements' ? 'notification' : kind.replace(/s$/, '');
    return `<div class="content-record-list">${rows.length ? rows.map(render).join('') : '<div class="empty">No records have been created yet.</div>'}</div>${editable ? `<button class="btn btn-primary" type="button" data-new-content="${kind}">Add ${addLabel}</button>` : ''}`;
  }

  function editorActions(kind, id) {
    return `<div class="field full"><div class="service-actions"><button class="btn btn-primary" type="submit">Save</button>${id ? `<button class="btn btn-ghost" type="button" data-delete-content="${kind}" data-delete-id="${id}">Delete</button>` : ''}<button class="btn btn-ghost" type="button" data-cancel-content>Cancel</button><div class="service-save-result"></div></div></div>`;
  }

  function announcementEditor(row = {}) {
    const categories = [...new Set(state.attendees.map(item => item.category).filter(Boolean))].sort();
    const services = [...new Set(state.attendees.map(item => item.service).filter(Boolean))].sort();
    const audience = row.audience?.[0] || 'all';
    return `<form id="announcementEditor" class="form-grid record-form content-editor" data-record-id="${row.id || ''}"><div class="form-section"><h3>${row.id ? 'Edit' : 'New'} notification</h3><p>Use urgent sparingly for safety or immediate operational changes. Sending now also publishes the notice in the Event app.</p></div><div class="field"><label>Title *</label><input name="title" required maxlength="160" value="${esc(row.title || '')}"></div><div class="field"><label>Priority</label><select name="priority"><option value="normal"${selected(row.priority, 'normal')}>Normal</option><option value="important"${selected(row.priority, 'important')}>Important</option><option value="urgent"${selected(row.priority, 'urgent')}>Urgent</option></select></div><div class="field full"><label>Message *</label><textarea name="body" required maxlength="1000">${esc(row.body || '')}</textarea></div><div class="field"><label>Audience</label><select name="audience"><option value="all"${selected(audience,'all')}>Everyone with alerts enabled</option><option value="attendees"${selected(audience,'attendees')}>All registered attendees</option><option value="staff"${selected(audience,'staff')}>Staff only</option>${categories.length ? `<optgroup label="Attendee category">${categories.map(value => `<option value="category:${esc(value.toLowerCase())}"${selected(audience,`category:${value.toLowerCase()}`)}>${esc(value)}</option>`).join('')}</optgroup>` : ''}${services.length ? `<optgroup label="Service">${services.map(value => `<option value="service:${esc(value.toLowerCase())}"${selected(audience,`service:${value.toLowerCase()}`)}>${esc(value)}</option>`).join('')}</optgroup>` : ''}</select><small>Only devices that have enabled Event alerts can receive a browser notification.</small></div><div class="field"><label>Expires</label><input type="datetime-local" name="expires_at" value="${esc(localInput(row.expires_at))}"></div><div class="field"><label>Link label</label><input name="action_label" value="${esc(row.action_label || '')}" placeholder="Open event app"></div><div class="field"><label>Link URL</label><input type="url" name="action_url" value="${esc(row.action_url || '')}" placeholder="https://..."></div><div class="field checkbox full"><input id="announcementPublished" type="checkbox" name="published"${checked(row.published)}><div><label for="announcementPublished">Published in the Event app</label><small>Use Save without sending when this should be an in-app notice only.</small></div></div><div class="field full"><div class="service-actions"><button class="btn btn-ghost" type="submit" data-notification-action="save">${row.id ? 'Save changes' : 'Save draft'}</button><button class="btn btn-primary" type="submit" data-notification-action="send">${row.push_sent_at ? 'Send again' : 'Publish and send now'}</button>${row.id && canContent() ? `<button class="btn btn-danger" type="button" data-delete-content="announcements" data-delete-id="${row.id}">Delete</button>` : ''}<button class="btn btn-ghost" type="button" data-cancel-content>Cancel</button><div class="service-save-result"></div></div></div></form>`;
  }

  function programmeEditor(row = {}) {
    return `<form id="programmeEditor" class="form-grid record-form content-editor" data-record-id="${row.id || ''}"><div class="form-section"><h3>${row.id ? 'Edit' : 'New'} programme item</h3><p>Times are entered in local Méribel time.</p></div><div class="field"><label>Title *</label><input name="title" required value="${esc(row.title || '')}"></div><div class="field"><label>Category</label><select name="category"><option value="race"${selected(row.category,'race')}>Race</option><option value="ceremony"${selected(row.category,'ceremony')}>Ceremony</option><option value="dinner"${selected(row.category,'dinner')}>Dinner</option><option value="briefing"${selected(row.category,'briefing')}>Briefing</option><option value="social"${selected(row.category,'social')}>Social</option><option value="other"${selected(row.category,'other')}>Other</option></select></div><div class="field"><label>Starts *</label><input type="datetime-local" name="starts_at" required value="${esc(localInput(row.starts_at) || '2027-01-30T09:00')}"></div><div class="field"><label>Ends</label><input type="datetime-local" name="ends_at" value="${esc(localInput(row.ends_at))}"></div><div class="field"><label>Venue</label><select name="venue_id">${options(state.venues, row.venue_id, venue => venue.name, 'No venue')}</select></div><div class="field"><label>BFBS / YouTube link</label><input type="url" name="stream_url" value="${esc(row.stream_url || '')}" placeholder="https://youtube.com/..."></div><div class="field full"><label>Description</label><textarea name="description">${esc(row.description || '')}</textarea></div><div class="field full"><label>Attendee notes</label><textarea name="attendee_notes">${esc(row.attendee_notes || '')}</textarea></div><div class="field checkbox full"><input id="programmePublished" type="checkbox" name="published"${checked(row.published)}><label for="programmePublished">Published in the Event app</label></div>${editorActions('programme', row.id)}</form>`;
  }

  function venueEditor(row = {}) {
    return `<form id="venueEditor" class="form-grid record-form content-editor" data-record-id="${row.id || ''}"><div class="form-section"><h3>${row.id ? 'Edit' : 'New'} Méribel location</h3><p>Use the official piste-map name and add a direct map link where available.</p></div><div class="field"><label>Location name *</label><input name="name" required value="${esc(row.name || '')}"></div><div class="field"><label>Type</label><select name="venue_type"><option value="race"${selected(row.venue_type,'race')}>Race venue</option><option value="hotel"${selected(row.venue_type,'hotel')}>Hotel</option><option value="ceremony"${selected(row.venue_type,'ceremony')}>Ceremony</option><option value="restaurant"${selected(row.venue_type,'restaurant')}>Restaurant</option><option value="meeting"${selected(row.venue_type,'meeting')}>Meeting point</option><option value="other"${selected(row.venue_type,'other')}>Other</option></select></div><div class="field"><label>Piste / sector</label><input name="piste_sector" value="${esc(row.piste_sector || '')}" placeholder="e.g. La Chaudanne"></div><div class="field"><label>Map reference</label><input name="map_reference" value="${esc(row.map_reference || '')}" placeholder="Lift, piste or grid reference"></div><div class="field full"><label>Directions</label><textarea name="directions_text">${esc(row.directions_text || '')}</textarea></div><div class="field full"><label>Méribel map URL</label><input type="url" name="map_url" value="${esc(row.map_url || '')}"></div><div class="field"><label>Sort order</label><input type="number" name="sort_order" min="0" max="999" value="${Number(row.sort_order || 0)}"></div><div class="field checkbox"><input id="venueActive" type="checkbox" name="active"${checked(row.active ?? true)}><label for="venueActive">Active</label></div><div class="field checkbox full"><input id="venuePublished" type="checkbox" name="published"${checked(row.published)}><label for="venuePublished">Published in the Event app</label></div>${editorActions('venues', row.id)}</form>`;
  }

  function resultEditor(row = {}) {
    return `<form id="resultEditor" class="form-grid record-form content-editor" data-record-id="${row.id || ''}"><div class="form-section"><h3>${row.id ? 'Edit' : 'New'} race result</h3><p>Upload the official PDF for the race. A replacement creates a new stored file.</p></div><div class="field"><label>Result title *</label><input name="title" required value="${esc(row.title || '')}"></div><div class="field"><label>Discipline *</label><select name="discipline" required><option value="">Select...</option>${['Alpine','Snowboard','Telemark','Nordic','Bobsleigh','Skeleton','Luge'].map(value => `<option${selected(row.discipline,value)}>${value}</option>`).join('')}</select></div><div class="field"><label>Race date *</label><input type="date" name="race_date" min="2027-01-30" max="2027-02-06" required value="${esc(row.race_date || '')}"></div><div class="field"><label>Venue</label><select name="venue_id">${options(state.venues,row.venue_id,venue => venue.name,'No venue')}</select></div><div class="field"><label>Programme item</label><select name="schedule_item_id">${options(state.schedule.filter(item => item.category === 'race'),row.schedule_item_id,item => `${formatDate(item.starts_at)} - ${item.title}`,'No linked race')}</select></div><div class="field"><label>Official result PDF</label><input type="file" name="result_file" accept="application/pdf"><small>${row.original_filename ? `Current: ${esc(row.original_filename)}` : 'PDF files only, maximum 10 MB.'}</small></div><div class="field full"><label>Summary</label><textarea name="summary">${esc(row.summary || '')}</textarea></div><div class="field full"><label>External result link</label><input type="url" name="external_url" value="${esc(row.external_url || '')}"></div><div class="field checkbox full"><input id="resultPublished" type="checkbox" name="published"${checked(row.published)}><label for="resultPublished">Published in the Event app</label></div>${editorActions('results',row.id)}</form>`;
  }

  function mediaEditor(row = {}) {
    return `<form id="mediaEditor" class="form-grid record-form content-editor" data-record-id="${row.id || ''}"><div class="form-section"><h3>${row.id ? 'Edit' : 'New'} media item</h3><p>Upload photographs or add an approved BFBS/YouTube video link.</p></div><div class="field"><label>Title *</label><input name="title" required value="${esc(row.title || '')}"></div><div class="field"><label>Type *</label><select name="media_type"><option value="image"${selected(row.media_type,'image')}>Photograph</option><option value="video"${selected(row.media_type,'video')}>Video link</option></select></div><div class="field"><label>Photograph</label><input type="file" name="media_file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPEG or WebP; maximum 10 MB.</small></div><div class="field"><label>BFBS / YouTube URL</label><input type="url" name="external_url" value="${esc(row.external_url || '')}"></div><div class="field"><label>Linked race result</label><select name="race_result_id">${options(state.results,row.race_result_id,item => item.title,'No linked result')}</select></div><div class="field"><label>Credit</label><input name="credit" value="${esc(row.credit || '')}"></div><div class="field full"><label>Caption</label><textarea name="caption">${esc(row.caption || '')}</textarea></div><div class="field"><label>Sort order</label><input type="number" name="sort_order" min="0" max="999" value="${Number(row.sort_order || 0)}"></div><div class="field checkbox"><input id="mediaPublished" type="checkbox" name="published"${checked(row.published)}><label for="mediaPublished">Published in the Event app</label></div>${editorActions('media',row.id)}</form>`;
  }

  function tablePlanEditor(plan) {
    const tables = state.tables.filter(table => table.table_plan_id === plan.id);
    const attendeeOptions = state.attendees.map(item => ({ value: `attendee:${item.id}`, label: `${item.title_rank || ''} ${item.first_name} ${item.surname}${item.record_source==='protocol_manual'?' · Protocol entry':''}`.trim() }));
    const sponsorOptions = state.sponsors.map(item => ({ value: `sponsor:${item.id}`, label: item.organisations?.short_name || item.organisations?.organisation_name || 'Sponsor' }));
    return `<div class="table-plan-editor"><form id="tablePlanMetadata" class="form-grid record-form" data-plan-id="${plan.id}"><div class="form-section"><h3>${esc(formatDate(plan.event_date))}</h3><p>There is no automatic sponsor rotation. Every seat remains a manual decision.</p></div><div class="field"><label>Dinner time</label><input type="time" name="dinner_time" value="${esc(plan.dinner_time?.slice(0,5) || '19:30')}"></div><div class="field"><label>Venue</label><select name="venue_id">${options(state.venues,plan.venue_id,item => item.name,'No venue')}</select></div><div class="field full"><label>Plan notes</label><textarea name="notes">${esc(plan.notes || '')}</textarea></div><div class="field checkbox full"><input id="planPublished" type="checkbox" name="published"${checked(plan.published)}><div><label for="planPublished">Publish this evening’s table plan</label><small>All three tables become visible to signed-in attendees.</small></div></div><div class="field full"><button class="btn btn-primary" type="submit">Save table-plan details</button><div class="service-save-result"></div></div></form><div class="vip-table-grid">${tables.map(table => {
      const assignments = state.assignments.filter(item => item.seating_table_id === table.id);
      return `<form class="vip-table-editor" data-table-id="${table.id}"><div class="service-group-head"><div><h4>${esc(table.table_name)}</h4><p>Up to ${Number(table.capacity || 10)} places</p></div><span class="status ${assignments.length >= Number(table.capacity || 10) ? 'green' : 'amber'}">${assignments.length}/${Number(table.capacity || 10)}</span></div><div class="seat-editor-list">${Array.from({ length: Number(table.capacity || 10) }, (_, index) => {
        const seat = index + 1, assignment = assignments.find(item => item.seat_number === seat);
        const occupantValue = assignment?.attendee_id ? `attendee:${assignment.attendee_id}` : assignment?.event_sponsor_id ? `sponsor:${assignment.event_sponsor_id}` : assignment ? 'guest' : '';
        const occupantOptions = [...attendeeOptions, ...sponsorOptions];
        return `<div class="seat-editor" data-seat-number="${seat}"><strong>${seat}</strong><select name="occupant_${seat}" aria-label="Seat ${seat}"><option value="">Available</option><optgroup label="Attendees">${occupantOptions.filter(item => item.value.startsWith('attendee:')).map(item => `<option value="${item.value}"${selected(item.value,occupantValue)}>${esc(item.label)}</option>`).join('')}</optgroup><optgroup label="Sponsors">${occupantOptions.filter(item => item.value.startsWith('sponsor:')).map(item => `<option value="${item.value}"${selected(item.value,occupantValue)}>${esc(item.label)}</option>`).join('')}</optgroup><option value="guest"${selected('guest',occupantValue)}>Named guest</option></select><input name="guest_name_${seat}" placeholder="Sponsor representative / guest name" value="${esc(assignment?.guest_name || '')}"><input name="guest_role_${seat}" placeholder="Role or note" value="${esc(assignment?.guest_role || '')}"><label><input type="checkbox" name="sponsor_host_${seat}"${checked(assignment?.sponsor_host)}> Sponsor place</label></div>`;
      }).join('')}</div><button class="btn btn-primary" type="submit">Save ${esc(table.table_name)}</button><div class="service-save-result"></div></form>`;
    }).join('')}</div></div>`;
  }

  function renderStaffContent() {
    const el = document.querySelector('#contentAdminPanel');
    if (!el) return;
    const current = state.selected[state.staffSection];
    if (state.staffSection === 'announcements') {
      const row = current && current !== 'new' ? state.announcements.find(item => item.id === current) : null;
      const subscriberCount = state.pushStatus?.active_subscriptions ?? 0;
      const deliveryByAnnouncement = id => state.notificationDeliveries.filter(item => item.announcement_id === id);
      const audienceLabel = item => {
        const value = item.audience?.[0] || 'all';
        if (value === 'all') return 'Everyone';
        if (value === 'attendees') return 'All attendees';
        if (value === 'staff') return 'Staff';
        return value.replace(/^(category|service):/, '');
      };
      el.innerHTML = `<section class="surface notification-admin"><div class="surface-head"><div><strong>Staff notifications</strong><div class="small muted">Compose an in-app notice and optionally send it immediately to enrolled devices.</div></div><div class="notification-subscriber-count"><strong>${Number(subscriberCount)}</strong><span>active device${Number(subscriberCount) === 1 ? '' : 's'}</span></div></div><div class="surface-body">${state.notificationResult ? `<div class="notice ${state.notificationResult.type}">${esc(state.notificationResult.text)}</div>` : ''}${!subscriberCount ? '<div class="notice warn"><strong>No devices are enrolled yet.</strong> Staff can prepare notices now; delivery begins after signed-in attendees or staff enable Event alerts on their device.</div>' : ''}${adminList(state.announcements, item => { const deliveries = deliveryByAnnouncement(item.id), latest = deliveries[0]; return `<article class="content-record notification-record"><div><div class="notification-record-tags"><span class="status ${item.published ? 'green' : 'amber'}">${item.published ? 'Published' : 'Draft'}</span><span class="status ${item.priority === 'urgent' ? 'red' : item.priority === 'important' ? 'amber' : 'purple'}">${esc(item.priority)}</span><span class="status purple">${esc(audienceLabel(item))}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p>${latest ? `<small>Last sent ${esc(formatDate(latest.requested_at))} ${esc(formatTime(latest.requested_at))} · ${Number(latest.delivered_count)} delivered · ${Number(latest.failure_count)} failed</small>` : '<small>Not sent as a browser notification</small>'}</div><button class="btn btn-ghost btn-small" data-edit-content="announcements" data-edit-id="${item.id}">Open</button></article>`; }, 'announcements', canNotify())}${current ? announcementEditor(row || {}) : ''}</div></section>`;
    } else if (state.staffSection === 'programme') {
      const row = current && current !== 'new' ? state.schedule.find(item => item.id === current) : null;
      el.innerHTML = `<section class="surface"><div class="surface-head"><div><strong>Programme and BFBS coverage</strong><div class="small muted">Add YouTube links directly to the relevant programme item.</div></div></div><div class="surface-body">${adminList(state.schedule, item => `<article class="content-record"><div><span class="status ${item.published ? 'green' : 'amber'}">${item.published ? 'Published' : 'Draft'}</span><h3>${esc(item.title)}</h3><p>${esc(formatDate(item.starts_at))} at ${esc(formatTime(item.starts_at))}${item.stream_url ? ' · BFBS link added' : ''}</p></div><button class="btn btn-ghost btn-small" data-edit-content="programme" data-edit-id="${item.id}">Open</button></article>`, 'programme')}${current ? programmeEditor(row || {}) : ''}</div></section>`;
    } else if (state.staffSection === 'venues') {
      const row = current && current !== 'new' ? state.venues.find(item => item.id === current) : null;
      el.innerHTML = `<section class="surface"><div class="surface-head"><div><strong>Méribel locations</strong><div class="small muted">Reference the piste sector and official map rather than using generic postal locations.</div></div></div><div class="surface-body">${adminList(state.venues, item => `<article class="content-record"><div><span class="status ${item.published ? 'green' : 'amber'}">${item.published ? 'Published' : 'Draft'}</span><h3>${esc(item.name)}</h3><p>${esc([item.piste_sector,item.map_reference].filter(Boolean).join(' · ') || item.venue_type || '')}</p></div><button class="btn btn-ghost btn-small" data-edit-content="venues" data-edit-id="${item.id}">Open</button></article>`, 'venues')}${current ? venueEditor(row || {}) : ''}</div></section>`;
    } else if (state.staffSection === 'results') {
      const row = current && current !== 'new' ? state.results.find(item => item.id === current) : null;
      el.innerHTML = `<section class="surface"><div class="surface-head"><div><strong>Race results</strong><div class="small muted">Attach the official PDF for each race before publishing.</div></div></div><div class="surface-body">${adminList(state.results, item => `<article class="content-record"><div><span class="status ${item.published ? 'green' : 'amber'}">${item.published ? 'Published' : 'Draft'}</span><h3>${esc(item.title)}</h3><p>${esc(item.discipline)} · ${esc(formatDate(item.race_date))}</p></div><button class="btn btn-ghost btn-small" data-edit-content="results" data-edit-id="${item.id}">Open</button></article>`, 'results')}${current ? resultEditor(row || {}) : ''}</div></section>`;
    } else if (state.staffSection === 'media') {
      const row = current && current !== 'new' ? state.media.find(item => item.id === current) : null;
      el.innerHTML = `<section class="surface"><div class="surface-head"><div><strong>Event media</strong><div class="small muted">Photographs appear in the gallery; video links appear with BFBS coverage.</div></div></div><div class="surface-body">${adminList(state.media, item => `<article class="content-record"><div><span class="status ${item.published ? 'green' : 'amber'}">${item.published ? 'Published' : 'Draft'}</span><h3>${esc(item.title)}</h3><p>${esc(item.media_type === 'video' ? 'Video link' : 'Photograph')}${item.credit ? ` · ${esc(item.credit)}` : ''}</p></div><button class="btn btn-ghost btn-small" data-edit-content="media" data-edit-id="${item.id}">Open</button></article>`, 'media')}${current ? mediaEditor(row || {}) : ''}</div></section>`;
    } else if (state.staffSection === 'tables') {
      const selectedPlan = state.plans.find(item => item.id === current) || state.plans[0];
      el.innerHTML = `<section class="surface"><div class="surface-head"><div><strong>VIP table plans</strong><div class="small muted">Chair’s Table, President’s Table and Patrons’ Table; ten places maximum at each.</div></div></div><div class="surface-body"><div class="plan-date-strip">${state.plans.map(plan => `<button class="${selectedPlan?.id === plan.id ? 'active' : ''}" data-plan-id="${plan.id}"><strong>${esc(new Date(`${plan.event_date}T12:00:00+01:00`).toLocaleDateString('en-GB',{weekday:'short'}))}</strong><span>${esc(new Date(`${plan.event_date}T12:00:00+01:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short'}))}</span><small>${plan.published ? 'Published' : 'Draft'}</small></button>`).join('')}</div>${selectedPlan ? tablePlanEditor(selectedPlan) : '<div class="empty">No event evenings are configured.</div>'}</div></section>`;
    }
    bindStaffContent();
  }

  function bindStaffContent() {
    document.querySelectorAll('[data-new-content]').forEach(button => button.onclick = () => {
      state.selected[state.staffSection] = 'new'; renderStaffContent();
    });
    document.querySelectorAll('[data-edit-content]').forEach(button => button.onclick = () => {
      state.selected[button.dataset.editContent] = button.dataset.editId; renderStaffContent();
    });
    document.querySelectorAll('[data-cancel-content]').forEach(button => button.onclick = () => {
      state.selected[state.staffSection] = null; renderStaffContent();
    });
    document.querySelectorAll('[data-delete-content]').forEach(button => button.onclick = () => deleteContent(button.dataset.deleteContent, button.dataset.deleteId));
    document.querySelectorAll('[data-plan-id]').forEach(button => button.onclick = () => {
      state.selected.tables = button.dataset.planId; renderStaffContent();
    });
    const forms = {
      announcementEditor: saveAnnouncement,
      programmeEditor: saveProgramme,
      venueEditor: saveVenue,
      resultEditor: saveResult,
      mediaEditor: saveMedia,
      tablePlanMetadata: saveTablePlan,
    };
    Object.entries(forms).forEach(([id,handler]) => { const form = document.querySelector(`#${id}`); if (form) form.onsubmit = handler; });
    document.querySelectorAll('.vip-table-editor').forEach(form => form.onsubmit = saveTableAssignments);
  }

  async function saveRecord(form, table, payload, success) {
    const button = form.querySelector('button[type=submit]'), result = form.querySelector('.service-save-result');
    const original = button.textContent; button.disabled = true; button.textContent = 'Saving...'; if (result) result.innerHTML = '';
    const id = form.dataset.recordId;
    const response = id ? await client.from(table).update(payload).eq('id', id) : await client.from(table).insert(payload);
    if (response.error) { message(result, response.error.message); button.disabled = false; button.textContent = original; return false; }
    toast(success); state.selected[state.staffSection] = null; await loadStaff(); return true;
  }

  async function saveAnnouncement(event) {
    event.preventDefault();
    const form = event.currentTarget, data = formData(form), action = event.submitter?.dataset.notificationAction || 'save';
    const existing = state.announcements.find(item => item.id === form.dataset.recordId);
    if (action === 'send' && existing?.push_sent_at && !window.confirm('Send this notification to the selected audience again?')) return;
    const buttons = [...form.querySelectorAll('button')], result = form.querySelector('.service-save-result');
    buttons.forEach(button => { button.disabled = true; });
    message(result, action === 'send' ? 'Publishing and sending...' : 'Saving...', '');
    const payload = {
      event_id: eventId,
      title: data.title.trim(),
      body: data.body.trim(),
      priority: data.priority,
      audience: [data.audience || 'all'],
      publish_at: action === 'send' ? new Date().toISOString() : (existing?.publish_at || new Date().toISOString()),
      expires_at: meribelIso(data.expires_at),
      action_label: data.action_label.trim() || null,
      action_url: safeUrl(data.action_url) || null,
      published: action === 'send' ? true : !!data.published,
      push_notification: action === 'send',
    };
    const response = form.dataset.recordId
      ? await client.from('announcements').update(payload).eq('id', form.dataset.recordId).select().single()
      : await client.from('announcements').insert(payload).select().single();
    if (response.error) {
      message(result, response.error.message);
      buttons.forEach(button => { button.disabled = false; });
      return;
    }
    if (action === 'send') {
      const delivery = await client.functions.invoke('send-push-announcement', { body: { action: 'send', announcement_id: response.data.id } });
      if (delivery.error) {
        let detail = delivery.error.message;
        try { detail = (await delivery.error.context.json()).error || detail; } catch {}
        state.notificationResult = { type: 'error', text: `The notice was published, but the browser notification could not be sent: ${detail}` };
      } else {
        const sent = Number(delivery.data?.delivered || 0), failed = Number(delivery.data?.failed || 0), eligible = Number(delivery.data?.eligible || 0);
        state.notificationResult = { type: failed ? 'warn' : 'success', text: `Notification completed: ${sent} delivered, ${failed} failed, ${eligible} eligible device${eligible === 1 ? '' : 's'}.` };
        toast('Notification sent');
      }
    } else {
      state.notificationResult = { type: 'success', text: 'Notification saved without sending.' };
      toast('Notification saved');
    }
    state.selected.announcements = null;
    await loadNotifications();
  }
  async function saveProgramme(event) {
    event.preventDefault(); const form = event.currentTarget, data = formData(form);
    await saveRecord(form, 'schedule_items', { event_id:eventId,title:data.title.trim(),description:data.description.trim()||null,starts_at:meribelIso(data.starts_at),ends_at:meribelIso(data.ends_at),category:data.category,venue_id:data.venue_id||null,audience:['all'],stream_url:safeUrl(data.stream_url)||null,attendee_notes:data.attendee_notes.trim()||null,published:!!data.published }, 'Programme item saved');
  }
  async function saveVenue(event) {
    event.preventDefault(); const form = event.currentTarget, data = formData(form);
    await saveRecord(form, 'venues', { event_id:eventId,name:data.name.trim(),venue_type:data.venue_type,piste_sector:data.piste_sector.trim()||null,map_reference:data.map_reference.trim()||null,directions_text:data.directions_text.trim()||null,map_url:safeUrl(data.map_url)||null,sort_order:Number(data.sort_order||0),active:!!data.active,published:!!data.published }, 'Méribel location saved');
  }
  const uploadAsset = async (folder, file) => {
    if (!file || !file.size) return null;
    if (file.size > 10 * 1024 * 1024) throw new Error('The selected file exceeds the 10 MB limit.');
    const clean = file.name.replace(/[^A-Za-z0-9._-]+/g, '-');
    const path = `${eventId}/${folder}/${crypto.randomUUID()}-${clean}`;
    const response = await client.storage.from('isssc-public').upload(path, file, { contentType:file.type, upsert:false });
    if (response.error) throw response.error;
    return { storage_bucket:'isssc-public', storage_object_path:path, original_filename:file.name };
  };
  async function saveResult(event) {
    event.preventDefault(); const form = event.currentTarget, data = formData(form), current = state.results.find(item => item.id === form.dataset.recordId);
    const button = form.querySelector('button[type=submit]'), result = form.querySelector('.service-save-result'), file = form.elements.result_file.files[0];
    button.disabled = true; button.textContent = file ? 'Uploading...' : 'Saving...'; result.innerHTML = '';
    try {
      if (file && file.type !== 'application/pdf') throw new Error('Race results must be uploaded as a PDF.');
      const upload = await uploadAsset('results', file);
      const payload = { event_id:eventId,title:data.title.trim(),discipline:data.discipline,race_date:data.race_date,summary:data.summary.trim()||null,venue_id:data.venue_id||null,schedule_item_id:data.schedule_item_id||null,external_url:safeUrl(data.external_url)||null,published:!!data.published,published_by:data.published?getSession()?.user?.id:null,published_at:data.published?new Date().toISOString():null,...(upload||{}) };
      if (!payload.summary && !payload.external_url && !payload.storage_object_path && !current?.storage_object_path) throw new Error('Add a result PDF, external link or result summary before saving.');
      if (current && !upload) { payload.storage_bucket=current.storage_bucket;payload.storage_object_path=current.storage_object_path;payload.original_filename=current.original_filename; }
      const response = current ? await client.from('race_results').update(payload).eq('id',current.id) : await client.from('race_results').insert(payload);
      if (response.error) throw response.error;
      toast('Race result saved'); state.selected.results = null; await loadStaff();
    } catch (error) { message(result,error.message);button.disabled=false;button.textContent='Save'; }
  }
  async function saveMedia(event) {
    event.preventDefault(); const form = event.currentTarget, data = formData(form), current = state.media.find(item => item.id === form.dataset.recordId);
    const button = form.querySelector('button[type=submit]'), result = form.querySelector('.service-save-result'), file = form.elements.media_file.files[0];
    button.disabled = true; button.textContent = file ? 'Uploading...' : 'Saving...'; result.innerHTML = '';
    try {
      if (file && !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Photographs must be PNG, JPEG or WebP.');
      const upload = await uploadAsset('media',file), external = safeUrl(data.external_url)||null;
      const payload = {event_id:eventId,title:data.title.trim(),caption:data.caption.trim()||null,media_type:data.media_type,race_result_id:data.race_result_id||null,external_url:external,credit:data.credit.trim()||null,sort_order:Number(data.sort_order||0),published:!!data.published,...(upload||{})};
      if (!payload.external_url&&!payload.storage_object_path&&!current?.storage_object_path)throw new Error('Upload a photograph or add a video link before saving.');
      if(data.media_type==='video'&&!payload.external_url)throw new Error('Video items need a BFBS or YouTube link.');
      if(current&&!upload){payload.storage_bucket=current.storage_bucket;payload.storage_object_path=current.storage_object_path;}
      const response=current?await client.from('event_media').update(payload).eq('id',current.id):await client.from('event_media').insert(payload);
      if(response.error)throw response.error;
      toast('Media item saved');state.selected.media=null;await loadStaff();
    }catch(error){message(result,error.message);button.disabled=false;button.textContent='Save';}
  }

  async function deleteContent(kind,id) {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    const tables={announcements:'announcements',programme:'schedule_items',venues:'venues',results:'race_results',media:'event_media'};
    const response=await client.from(tables[kind]).delete().eq('id',id);
    if(response.error){toast(response.error.message);return;}
    toast('Record deleted');state.selected[kind]=null;
    if(kind==='announcements')await loadNotifications();else await loadStaff();
  }

  async function saveTablePlan(event) {
    event.preventDefault();const form=event.currentTarget,data=formData(form),result=form.querySelector('.service-save-result');
    const payload={dinner_time:data.dinner_time||null,venue_id:data.venue_id||null,notes:data.notes.trim()||null,published:!!data.published,published_by:data.published?getSession()?.user?.id:null,published_at:data.published?new Date().toISOString():null};
    const response=await client.from('table_plans').update(payload).eq('id',form.dataset.planId);
    if(response.error){message(result,response.error.message);return;}
    await client.from('seating_tables').update({published:!!data.published}).eq('table_plan_id',form.dataset.planId);
    toast('Table-plan details saved');await loadStaff();
  }

  async function saveTableAssignments(event) {
    event.preventDefault();const form=event.currentTarget,result=form.querySelector('.service-save-result'),button=form.querySelector('button[type=submit]'),assignments=[];
    for(const row of form.querySelectorAll('.seat-editor')){
      const seat=Number(row.dataset.seatNumber),value=row.querySelector('select').value,guestName=row.querySelector(`[name="guest_name_${seat}"]`).value.trim(),guestRole=row.querySelector(`[name="guest_role_${seat}"]`).value.trim(),sponsorHost=row.querySelector(`[name="sponsor_host_${seat}"]`).checked;
      if(!value)continue;
      const [type,id]=value.split(':');
      if(type==='guest'&&!guestName){message(result,`Enter the name for seat ${seat}.`);return;}
      assignments.push({seat_number:seat,attendee_id:type==='attendee'?id:null,event_sponsor_id:type==='sponsor'?id:null,guest_name:guestName||null,guest_role:guestRole||null,sponsor_host:sponsorHost});
    }
    button.disabled=true;button.textContent='Saving...';result.innerHTML='';
    const response=await client.rpc('replace_table_assignments',{p_seating_table_id:form.dataset.tableId,p_assignments:assignments});
    if(response.error){message(result,response.error.message);button.disabled=false;button.textContent='Save table';return;}
    toast('Table allocation saved');await loadStaff();
  }

  function protocolMarkup() {
    return `<section class="surface transfer-admin-surface"><div class="surface-head"><div><strong>Transfer manifests</strong><div class="small muted">Group confirmed passengers into operational transfers and publish details to signed-in attendees.</div></div>${canTransfers()?'<button class="btn btn-primary" id="newTransferRun" type="button">Add transfer</button>':''}</div><div class="surface-body"><div id="transferAdminPanel" class="empty">Loading transfers...</div></div></section>`;
  }

  async function loadTransfers() {
    const results=await Promise.all([
      client.from('transfer_runs').select('*').eq('event_id',eventId).order('departure_at'),
      client.from('transfer_passengers').select('*').order('sort_order'),
      client.from('attendees').select('id,title_rank,first_name,surname,email,mobile,attendance_status,record_source').eq('event_id',eventId).neq('attendance_status','cancelled').order('surname').order('first_name'),
    ]);
    const failed=results.find(item=>item.error);const panel=document.querySelector('#transferAdminPanel');
    if(failed){if(panel)message(panel,failed.error.message);return;}
    [state.transfers,state.passengers,state.attendees]=results.map(item=>item.data||[]);renderTransferAdmin();
  }

  function bindProtocol() {
    const add=document.querySelector('#newTransferRun');if(add)add.onclick=()=>{state.selected.transfer='new';renderTransferAdmin();};
  }

  function transferEditor(run={}) {
    const assigned=new Set(state.passengers.filter(item=>item.transfer_run_id===run.id).map(item=>item.attendee_id));
    return `<form id="transferRunEditor" class="record-form transfer-editor" data-run-id="${run.id||''}"><div class="form-grid compact-grid"><div class="form-section"><h3>${run.id?'Edit':'New'} transfer</h3><p>Times are entered in local Méribel/Geneva time. Use Add person above if someone is not listed.</p></div><div class="field"><label>Transfer name *</label><input name="transfer_name" required value="${esc(run.transfer_name||'')}"></div><div class="field"><label>Direction *</label><select name="direction"><option value="arrival"${selected(run.direction,'arrival')}>Arrival</option><option value="departure"${selected(run.direction,'departure')}>Departure</option><option value="local"${selected(run.direction,'local')}>Local movement</option></select></div><div class="field"><label>Departure date and time *</label><input type="datetime-local" name="departure_at" min="2027-01-27T00:00" max="2027-02-09T23:59" required value="${esc(localInput(run.departure_at)||'2027-01-30T12:00')}"></div><div class="field"><label>Status</label><select name="status"><option value="planned"${selected(run.status,'planned')}>Planned</option><option value="confirmed"${selected(run.status,'confirmed')}>Confirmed</option><option value="departed"${selected(run.status,'departed')}>Departed</option><option value="completed"${selected(run.status,'completed')}>Completed</option><option value="cancelled"${selected(run.status,'cancelled')}>Cancelled</option></select></div><div class="field"><label>Pickup *</label><input name="pickup_location" required value="${esc(run.pickup_location||'')}"></div><div class="field"><label>Destination *</label><input name="destination" required value="${esc(run.destination||'')}"></div><div class="field"><label>Service / operator</label><input name="service_type" value="${esc(run.service_type||'')}"></div><div class="field"><label>Vehicle details</label><input name="vehicle_details" value="${esc(run.vehicle_details||'')}"></div><div class="field"><label>Driver name</label><input name="driver_name" value="${esc(run.driver_name||'')}"></div><div class="field"><label>Driver mobile</label><input type="tel" name="driver_mobile" value="${esc(run.driver_mobile||'')}"></div><div class="field"><label>Lead traveller</label><select name="lead_traveller_attendee_id">${options(state.attendees,run.lead_traveller_attendee_id,item=>`${item.title_rank||''} ${item.first_name} ${item.surname}${item.record_source==='protocol_manual'?' · Protocol entry':''}`.trim(),'No linked person')}</select></div><div class="field"><label>Capacity</label><input type="number" name="capacity" min="1" max="100" value="${run.capacity||''}"></div><div class="field"><label>Lead traveller name</label><input name="lead_traveller_name" value="${esc(run.lead_traveller_name||'')}"></div><div class="field"><label>Lead traveller mobile</label><input type="tel" name="lead_traveller_mobile" value="${esc(run.lead_traveller_mobile||'')}"></div><div class="field full"><label>Information visible to attendees</label><textarea name="attendee_notes">${esc(run.attendee_notes||'')}</textarea></div><div class="field full"><label>Protocol notes</label><textarea name="protocol_notes">${esc(run.protocol_notes||'')}</textarea></div><div class="field checkbox full"><input id="transferPublished" type="checkbox" name="published"${checked(run.published)}><div><label for="transferPublished">Publish to signed-in attendees</label><small>Driver and lead-traveller contact details and the passenger list will be visible.</small></div></div></div><div class="transfer-passenger-picker"><h4>Passenger manifest</h4><p>Select every person travelling on this transfer.</p><div class="passenger-check-grid">${state.attendees.map(item=>`<label><input type="checkbox" name="passenger" value="${item.id}"${checked(assigned.has(item.id))}><span><strong>${esc(`${item.title_rank||''} ${item.first_name} ${item.surname}`.trim())}</strong><small>${esc([item.mobile||item.email,item.record_source==='protocol_manual'?'Protocol entry':''].filter(Boolean).join(' · '))}</small></span></label>`).join('')}</div></div><div class="service-actions"><button class="btn btn-primary" type="submit">Save transfer</button>${run.id?`<button class="btn btn-ghost" type="button" data-transfer-document="preview">Preview PDF</button><button class="btn btn-ghost" type="button" data-transfer-document="download">Download PDF</button><button class="btn btn-ghost" type="button" id="deleteTransferRun">Delete</button>`:''}<button class="btn btn-ghost" type="button" id="cancelTransferRun">Cancel</button><div class="service-save-result"></div></div></form>`;
  }

  function renderTransferAdmin() {
    const el=document.querySelector('#transferAdminPanel');if(!el)return;
    const selectedRun=state.selected.transfer&&state.selected.transfer!=='new'?state.transfers.find(item=>item.id===state.selected.transfer):null;
    el.classList.remove('empty');el.innerHTML=`<div class="transfer-admin-list">${state.transfers.length?state.transfers.map(run=>{const count=state.passengers.filter(item=>item.transfer_run_id===run.id).length;return `<article><div><span class="status ${run.published?'green':'amber'}">${run.published?'Published':'Draft'}</span><h3>${esc(run.transfer_name)}</h3><p>${esc(formatDate(run.departure_at))} at ${esc(formatTime(run.departure_at))} · ${esc(run.pickup_location)} to ${esc(run.destination)}</p><small>${count} passenger${count===1?'':'s'} · ${esc(run.status)}</small></div><button class="btn btn-ghost btn-small" data-edit-transfer="${run.id}">Open</button></article>`;}).join(''):'<div class="empty">No transfer manifests have been created yet.</div>'}</div>${state.selected.transfer?transferEditor(selectedRun||{}):''}`;
    document.querySelectorAll('[data-edit-transfer]').forEach(button=>button.onclick=()=>{state.selected.transfer=button.dataset.editTransfer;renderTransferAdmin();});
    const form=document.querySelector('#transferRunEditor');if(form)form.onsubmit=saveTransferRun;
    const cancel=document.querySelector('#cancelTransferRun');if(cancel)cancel.onclick=()=>{state.selected.transfer=null;renderTransferAdmin();};
    const remove=document.querySelector('#deleteTransferRun');if(remove)remove.onclick=deleteTransferRun;
    document.querySelectorAll('[data-transfer-document]').forEach(button=>button.onclick=()=>openTransferDocument(button.dataset.transferDocument,button));
  }

  async function saveTransferRun(event) {
    event.preventDefault();const form=event.currentTarget,data=formData(form),button=form.querySelector('button[type=submit]'),result=form.querySelector('.service-save-result'),passengerIds=[...form.querySelectorAll('input[name=passenger]:checked')].map(item=>item.value),capacity=data.capacity?Number(data.capacity):null;
    if(capacity&&passengerIds.length>capacity){message(result,`You selected ${passengerIds.length} passengers for a vehicle with ${capacity} places.`);return;}
    button.disabled=true;button.textContent='Saving...';result.innerHTML='';
    const lead=state.attendees.find(item=>item.id===data.lead_traveller_attendee_id),payload={event_id:eventId,direction:data.direction,transfer_name:data.transfer_name.trim(),service_type:data.service_type.trim()||null,departure_at:meribelIso(data.departure_at),pickup_location:data.pickup_location.trim(),destination:data.destination.trim(),driver_name:data.driver_name.trim()||null,driver_mobile:data.driver_mobile.trim()||null,lead_traveller_attendee_id:data.lead_traveller_attendee_id||null,lead_traveller_name:data.lead_traveller_name.trim()||(lead?`${lead.title_rank||''} ${lead.first_name} ${lead.surname}`.trim():null),lead_traveller_mobile:data.lead_traveller_mobile.trim()||lead?.mobile||null,vehicle_details:data.vehicle_details.trim()||null,capacity,status:data.status,attendee_notes:data.attendee_notes.trim()||null,protocol_notes:data.protocol_notes.trim()||null,published:!!data.published,updated_by:getSession()?.user?.id};
    let runId=form.dataset.runId,response;
    if(runId)response=await client.from('transfer_runs').update(payload).eq('id',runId);
    else{response=await client.from('transfer_runs').insert({...payload,created_by:getSession()?.user?.id}).select('id').single();runId=response.data?.id;}
    if(response.error||!runId){message(result,response.error?.message||'The transfer could not be saved.');button.disabled=false;button.textContent='Save transfer';return;}
    const passengers=await client.rpc('replace_transfer_passengers',{p_transfer_run_id:runId,p_attendee_ids:passengerIds});
    if(passengers.error){message(result,passengers.error.message);button.disabled=false;button.textContent='Save transfer';return;}
    toast('Transfer manifest saved');state.selected.transfer=runId;await loadTransfers();
  }

  async function deleteTransferRun() {
    if(!confirm('Delete this transfer and its passenger manifest?'))return;
    const response=await client.from('transfer_runs').delete().eq('id',state.selected.transfer);
    if(response.error){toast(response.error.message);return;}toast('Transfer deleted');state.selected.transfer=null;await loadTransfers();
  }

  async function openTransferDocument(mode,button) {
    const run=state.transfers.find(item=>item.id===state.selected.transfer);if(!run)return;
    const result=button.parentElement.querySelector('.service-save-result'),original=button.textContent,previewWindow=mode==='preview'?window.open('','_blank'):null;
    button.disabled=true;button.textContent='Preparing...';if(result)result.innerHTML='';
    const response=await client.functions.invoke('transfer-manifest',{body:{action:'document',transfer_run_id:run.id}});
    if(response.error){if(previewWindow)previewWindow.close();message(result,response.error.message);button.disabled=false;button.textContent=original;return;}
    const blob=response.data instanceof Blob?response.data:new Blob([response.data],{type:'application/pdf'}),url=URL.createObjectURL(blob);
    if(mode==='preview'){if(previewWindow)previewWindow.location.href=url;else window.open(url,'_blank','noopener');}
    else{const link=document.createElement('a');link.href=url;link.download=`${run.transfer_name.replace(/[^A-Za-z0-9._-]+/g,'-')}-manifest.pdf`;document.body.appendChild(link);link.click();link.remove();}
    setTimeout(()=>URL.revokeObjectURL(url),60000);button.disabled=false;button.textContent=original;
  }

  return { publicMarkup, bindPublic, loadPublic, staffMarkup, bindStaff, loadStaff, notificationMarkup, loadNotifications, protocolMarkup, bindProtocol, loadTransfers };
}
