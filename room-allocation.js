export function createRoomAllocator({client,eventId,getProfile,escapeHtml,toast}){
  const h=escapeHtml;
  const state={requests:[],rooms:[],allocations:[],locations:[],attendees:[],suggestions:[],view:'queue',status:'active',hotel:'all',query:'',selectedRequestId:null,selectedRoomId:null,manualRequestId:null,roomEditorId:null,loading:false,synced:false};
  const canEdit=()=>['admin','protocol','operations'].includes(getProfile()?.app_role);
  const value=(v)=>h(v??'');
  const selected=(a,b)=>String(a??'')===String(b??'')?' selected':'';
  const checked=(v)=>v?' checked':'';
  const fmtDate=(v)=>v?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${v}T12:00:00Z`)):'Not supplied';
  const label=(v)=>({awaiting_review:'Awaiting decision',allocated:'Allocated',waitlist:'Waitlist',cancelled:'Cancelled',available:'Available',out_of_service:'Out of service'})[v]||v||'Unknown';
  const statusClass=(v)=>v==='allocated'||v==='available'?'green':v==='cancelled'||v==='out_of_service'?'red':v==='waitlist'?'purple':'amber';
  const request=()=>state.requests.find(row=>row.id===state.selectedRequestId);
  const allocation=(id)=>state.allocations.find(row=>row.request_id===id&&row.allocation_status==='confirmed');
  const room=(id)=>state.rooms.find(row=>row.id===id);
  const locationName=(id)=>state.locations.find(row=>row.id===id)?.name||'Unknown hotel';
  const roomName=(row)=>`${locationName(row.location_id)} · ${row.room_reference}`;

  function markup(){
    return `<div class="allocator" id="roomAllocator"><div class="surface allocator-head"><div class="surface-head"><div><strong>Hotel room allocation</strong><div class="muted small">Match accommodation requests to physical rooms. Use Add person above for anyone who has not registered; Protocol makes every final decision.</div></div>${canEdit()?'<div class="allocator-actions"><button class="btn btn-ghost" id="syncRoomRequests">Refresh registration requests</button><button class="btn btn-primary" id="addManualRoomRequest">Add room request</button></div>':''}</div><div class="surface-body"><div id="allocatorMetrics" class="grid grid-4 allocator-metrics"></div></div></div><nav class="protocol-workspace-nav allocator-nav" aria-label="Hotel allocation views"><button data-allocator-view="queue" class="${state.view==='queue'?'active':''}">Allocation queue</button><button data-allocator-view="rooms" class="${state.view==='rooms'?'active':''}">Room inventory</button></nav><div id="allocatorBody" class="surface"><div class="surface-body empty">Loading hotel rooms…</div></div></div>`;
  }

  async function load({sync=false}={}){
    if(state.loading)return;
    state.loading=true;
    renderBody('Loading hotel rooms…');
    try{
      if(canEdit()&&(sync||!state.synced)){
        const refreshed=await client.rpc('refresh_room_allocation_requests',{p_event_id:eventId});
        if(refreshed.error)throw refreshed.error;
        state.synced=true;
      }
      const [requests,rooms,allocations,locations,attendees]=await Promise.all([
        client.from('room_allocation_requests').select('*').eq('event_id',eventId).order('created_at'),
        client.from('hotel_rooms').select('*').eq('event_id',eventId).order('sort_order'),
        client.from('hotel_room_allocations').select('*').eq('event_id',eventId).order('decided_at',{ascending:false}),
        client.from('accommodation_locations').select('id,name').eq('event_id',eventId).order('name'),
        client.from('attendees').select('id,title_rank,first_name,surname,email,mobile,category,display_company,record_source,attendance_status').eq('event_id',eventId).neq('attendance_status','cancelled').order('surname').order('first_name')
      ]);
      const failed=[requests,rooms,allocations,locations,attendees].find(result=>result.error);
      if(failed)throw failed.error;
      state.requests=requests.data||[];state.rooms=rooms.data||[];state.allocations=allocations.data||[];state.locations=locations.data||[];state.attendees=attendees.data||[];
      if(state.selectedRequestId&&!request())state.selectedRequestId=null;
      render();
    }catch(error){renderBody(error.message||'Unable to load hotel allocation data.',true)}
    finally{state.loading=false}
  }

  function render(){
    renderMetrics();
    renderBody();
    bindBody();
  }
  function renderMetrics(){
    const el=document.querySelector('#allocatorMetrics');if(!el)return;
    const active=state.requests.filter(r=>r.source_active&&r.allocation_status!=='cancelled');
    const values=[
      [active.filter(r=>r.allocation_status==='awaiting_review').length,'Awaiting Protocol'],
      [active.filter(r=>r.allocation_status==='allocated').length,'Final allocations'],
      [state.rooms.filter(r=>r.active&&r.inventory_status==='available').length,'Rooms in service'],
      [state.rooms.filter(r=>r.active&&!r.verified).length,'Rooms to verify']
    ];
    el.innerHTML=values.map(([n,t])=>`<div class="card metric"><strong>${n}</strong><span>${t}</span></div>`).join('');
  }
  function renderBody(message='',isError=false){
    const el=document.querySelector('#allocatorBody');if(!el)return;
    if(message){el.innerHTML=`<div class="surface-body empty${isError?' error-text':''}">${h(message)}</div>`;return}
    el.innerHTML=state.view==='rooms'?inventoryMarkup():queueMarkup();
  }

  function queueRows(){
    const term=state.query.trim().toLowerCase();
    return state.requests.filter(r=>{
      const active=r.source_active&&r.allocation_status!=='cancelled';
      const statusOk=state.status==='all'||(state.status==='active'?active:r.allocation_status===state.status);
      const hotelOk=state.hotel==='all'||String(r.hotel_preference||'').toLowerCase().includes(state.hotel.toLowerCase());
      const queryOk=!term||[r.display_name,r.email,r.organisation_name,r.category,r.hotel_preference].some(v=>String(v||'').toLowerCase().includes(term));
      return statusOk&&hotelOk&&queryOk;
    });
  }
  function queueMarkup(){
    const rows=queueRows();
    return `<div class="surface-head allocator-toolbar"><div><strong>Accommodation requests</strong><div class="muted small">Registration details are shown as requests and remain separate from the final room decision.</div></div><div class="allocator-filters"><input id="allocatorQuery" type="search" placeholder="Guest, organisation or hotel" value="${value(state.query)}"><select id="allocatorStatus"><option value="active"${selected(state.status,'active')}>Active</option><option value="awaiting_review"${selected(state.status,'awaiting_review')}>Awaiting decision</option><option value="allocated"${selected(state.status,'allocated')}>Allocated</option><option value="waitlist"${selected(state.status,'waitlist')}>Waitlist</option><option value="all"${selected(state.status,'all')}>All</option></select><select id="allocatorHotel"><option value="all">All hotel preferences</option>${state.locations.filter(l=>['eterlou','savoy','chaudanne'].includes(l.name.toLowerCase())).map(l=>`<option value="${value(l.name)}"${selected(state.hotel,l.name)}>${value(l.name)}</option>`).join('')}</select></div></div><div class="surface-body"><div class="table-scroll"><table class="data-table allocator-table"><thead><tr><th>Guest / group</th><th>Request source</th><th>Hotel preference</th><th>Stay</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${value(r.display_name)}</strong><small>${value(r.organisation_name||r.email||r.category||'')}</small></td><td><span class="status ${r.source_type==='protocol'?'purple':'green'}">${r.source_type==='protocol'?'Protocol entry':'Registration'}</span></td><td>${value(r.hotel_preference||'No preference')}<small>${r.room_share_requested?`Share${r.requested_share_with?` with ${value(r.requested_share_with)}`:''}`:'No sharing request'}</small></td><td>${fmtDate(r.requested_check_in)}<small>to ${fmtDate(r.requested_check_out)}</small></td><td><span class="status ${statusClass(r.allocation_status)}">${label(r.allocation_status)}</span></td><td><button class="btn btn-ghost btn-small" data-open-room-request="${r.id}">Review</button></td></tr>`).join('')}</tbody></table></div>${rows.length?'':'<div class="empty">No room requests match these filters.</div>'}<div id="allocatorDetail">${state.manualRequestId!==null?manualRequestMarkup():state.selectedRequestId?requestDetailMarkup():''}</div></div>`;
  }

  function requestDetailMarkup(){
    const r=request();if(!r)return'';
    const a=allocation(r.id),assigned=a?room(a.hotel_room_id):null;
    const chosen=room(state.selectedRoomId)||assigned||null;
    return `<section class="allocator-detail"><div class="review-heading"><div><span class="status ${statusClass(r.allocation_status)}">${label(r.allocation_status)}</span><h3>${value(r.display_name)}</h3><p>${value(r.email||r.mobile||r.organisation_name||'')}</p></div><button class="btn btn-ghost btn-small" id="closeRoomRequest">Close</button></div><div class="allocator-request-grid"><div><small>Category</small><strong>${value(r.category||'Not supplied')}</strong></div><div><small>Organisation</small><strong>${value(r.organisation_name||'Not supplied')}</strong></div><div><small>Requested hotel</small><strong>${value(r.hotel_preference||'No preference')}</strong></div><div><small>Requested stay</small><strong>${fmtDate(r.requested_check_in)} – ${fmtDate(r.requested_check_out)}</strong></div><div><small>Party size</small><strong>${r.occupancy_required}</strong></div><div><small>Room setup</small><strong>${value(r.room_setup_preference||'Not supplied')}</strong></div><div><small>Sharing</small><strong>${r.room_share_requested?value(r.requested_share_with||'Requested; person not named'):'Not requested'}</strong></div><div><small>Priority</small><strong>${value(r.priority)}</strong></div></div>${r.protocol_notes?`<div class="notice allocator-note"><strong>Protocol notes</strong><br>${value(r.protocol_notes)}</div>`:''}${a?`<div class="notice success allocator-current"><strong>Current final allocation:</strong> ${value(a.hotel_name_snapshot)} · ${value(a.room_reference_snapshot)}, ${fmtDate(a.check_in)}–${fmtDate(a.check_out)}, ${a.occupancy_count} place${a.occupancy_count===1?'':'s'}.</div>`:''}${r.source_type==='protocol'&&canEdit()?`<button class="btn btn-ghost btn-small" id="editManualRoomRequest">Edit manual request</button>`:''}<div class="allocator-suggestion-head"><div><h4>Suggested rooms</h4><p>Ranked by dates, requested hotel, capacity, setup and reserved group. No room is allocated until Protocol confirms it below.</p></div><button class="btn btn-ghost btn-small" id="reloadSuggestions">Refresh suggestions</button></div><div id="roomSuggestions">${suggestionsMarkup()}</div>${decisionMarkup(r,chosen,a)}</section>`;
  }
  function suggestionsMarkup(){
    if(!state.suggestions.length)return '<div class="empty">No available rooms match the supplied dates and party size. Check the request dates or use the full room list below.</div>';
    return `<div class="allocator-suggestions">${state.suggestions.map((s,index)=>`<article class="allocator-suggestion ${state.selectedRoomId===s.hotel_room_id?'selected':''}"><div class="allocator-score"><strong>${s.match_score}</strong><small>match</small></div><div><span class="status ${s.verified?'green':'amber'}">${s.verified?'Verified':'Verify details'}</span><h4>${value(s.hotel_name)} · ${value(s.room_reference)}</h4><p>${value(s.room_type_label||'Room')} · ${value(s.bed_configuration||'Setup not recorded')}</p><small>${s.available_places} of ${s.capacity} places available${s.current_occupants?` · sharing with ${value(s.current_occupants)}`:''}</small><div class="allocator-reasons">${(s.match_reasons||[]).map(x=>`<span>${value(x)}</span>`).join('')}${(s.warnings||[]).map(x=>`<span class="warn">${value(x)}</span>`).join('')}</div></div>${canEdit()?`<button class="btn ${index===0?'btn-primary':'btn-ghost'} btn-small" data-choose-room="${s.hotel_room_id}">Review this room</button>`:''}</article>`).join('')}</div>`;
  }
  function decisionMarkup(r,chosen,a){
    if(!canEdit())return '<div class="notice">Read-only access. A Protocol editor must make the final allocation.</div>';
    const activeRooms=state.rooms.filter(x=>x.active&&x.inventory_status==='available');
    return `<form id="finalRoomDecision" class="record-form allocator-decision"><div><span class="eyebrow">Protocol decision</span><h4>Confirm the physical room</h4><p>Suggestions never reserve a room. Check the dates, capacity and room details before confirming.</p></div><div class="form-grid compact-grid"><div class="field full"><label>Physical room *</label><select name="hotel_room_id" required><option value="">Choose a room…</option>${activeRooms.map(x=>`<option value="${x.id}"${selected(chosen?.id,x.id)}>${value(roomName(x))} · ${value(x.room_type_label||'Room')} · capacity ${x.capacity}${x.verified?'':' · VERIFY'}</option>`).join('')}</select></div><div class="field"><label>Check-in *</label><input type="date" name="check_in" value="${value(a?.check_in||r.requested_check_in||'')}" required></div><div class="field"><label>Check-out *</label><input type="date" name="check_out" value="${value(a?.check_out||r.requested_check_out||'')}" required></div><div class="field"><label>Places used *</label><input type="number" name="occupancy_count" min="1" max="10" value="${a?.occupancy_count||r.occupancy_required||1}" required></div><div class="field full"><label>Decision notes</label><textarea name="decision_notes" placeholder="Record why this room was chosen or any exception">${value(a?.decision_notes||'')}</textarea></div></div>${chosen&&!chosen.verified?'<div class="notice warn"><strong>Verification required:</strong> this room has missing or conflicting source details. Protocol may still confirm it after checking with the hotel.</div>':''}<div class="service-actions"><button class="btn btn-primary" type="submit">${a?'Update final allocation':'Confirm final allocation'}</button>${a?'<button class="btn btn-ghost" id="cancelRoomAllocation" type="button">Return to review</button>':''}<div class="service-save-result" id="roomDecisionResult"></div></div></form>`;
  }

  function manualRequestMarkup(){
    const r=state.requests.find(x=>x.id===state.manualRequestId)||{};
    return `<section class="allocator-detail"><div class="review-heading"><div><span class="status purple">Protocol entry</span><h3>${r.id?'Edit room request':'Add room request'}</h3><p>Select a person created from registration or by Protocol. Unlinked names remain available for genuine group requests.</p></div><button class="btn btn-ghost btn-small" id="closeManualRoomRequest">Close</button></div><form id="manualRoomRequestForm" class="record-form"><div class="form-grid"><div class="field full"><label>Person</label><select name="attendee_id"><option value="">No linked person / group request</option>${state.attendees.map(a=>`<option value="${a.id}"${selected(r.attendee_id,a.id)}>${value(`${a.title_rank||''} ${a.first_name||''} ${a.surname||''}`.trim())} · ${value(a.email||'no email')}${a.record_source==='protocol_manual'?' · Protocol entry':''}</option>`).join('')}</select><small>If the person is not listed, close this request and use Add person above first.</small></div><div class="field"><label>Guest / group name</label><input name="display_name" value="${value(r.display_name||'')}" placeholder="Required only for an unlinked group"></div><div class="field"><label>Email</label><input type="email" name="email" value="${value(r.email||'')}"></div><div class="field"><label>Mobile</label><input name="mobile" value="${value(r.mobile||'')}"></div><div class="field"><label>Category</label><input name="category" value="${value(r.category||'')}"></div><div class="field"><label>Organisation</label><input name="organisation_name" value="${value(r.organisation_name||'')}"></div><div class="field"><label>Hotel preference</label><select name="hotel_preference"><option value="">No preference</option>${state.locations.map(l=>`<option value="${value(l.name)}"${selected(r.hotel_preference,l.name)}>${value(l.name)}</option>`).join('')}</select></div><div class="field"><label>Check-in *</label><input type="date" name="requested_check_in" value="${value(r.requested_check_in||'2027-01-30')}" required></div><div class="field"><label>Check-out *</label><input type="date" name="requested_check_out" value="${value(r.requested_check_out||'2027-02-06')}" required></div><div class="field"><label>Party size *</label><input type="number" min="1" max="10" name="occupancy_required" value="${r.occupancy_required||1}" required></div><div class="field"><label>Room setup preference</label><input name="room_setup_preference" value="${value(r.room_setup_preference||'')}"></div><div class="field"><label>Priority</label><select name="priority"><option value="normal"${selected(r.priority,'normal')}>Normal</option><option value="priority"${selected(r.priority,'priority')}>Priority</option><option value="urgent"${selected(r.priority,'urgent')}>Urgent</option></select></div><div class="field checkbox"><input id="manualShare" type="checkbox" name="room_share_requested"${checked(r.room_share_requested)}><label for="manualShare">Sharing requested</label></div><div class="field"><label>Requested to share with</label><input name="requested_share_with" value="${value(r.requested_share_with||'')}"></div><div class="field full"><label>Protocol notes</label><textarea name="protocol_notes">${value(r.protocol_notes||'')}</textarea></div></div><div class="service-actions"><button class="btn btn-primary" type="submit">Save room request</button><div class="service-save-result" id="manualRoomResult"></div></div></form></section>`;
  }

  function inventoryRows(){
    const term=state.query.trim().toLowerCase();
    return state.rooms.filter(r=>(state.hotel==='all'||locationName(r.location_id)===state.hotel)&&(!term||[locationName(r.location_id),r.room_reference,r.room_number,r.room_type_label,r.reserved_for].some(v=>String(v||'').toLowerCase().includes(term))));
  }
  function inventoryMarkup(){
    const rows=inventoryRows();
    return `<div class="surface-head allocator-toolbar"><div><strong>Physical room inventory</strong><div class="muted small">81 rooms imported from the Eterlou, Savoy and Chaudanne workbooks. Source costs are reference only and never drive invoices.</div></div>${canEdit()?'<button class="btn btn-primary" id="addHotelRoom">Add room</button>':''}<div class="allocator-filters"><input id="allocatorQuery" type="search" placeholder="Hotel, room or reserved group" value="${value(state.query)}"><select id="allocatorHotel"><option value="all">All hotels</option>${state.locations.filter(l=>state.rooms.some(r=>r.location_id===l.id)).map(l=>`<option value="${value(l.name)}"${selected(state.hotel,l.name)}>${value(l.name)}</option>`).join('')}</select></div></div><div class="surface-body"><div class="table-scroll"><table class="data-table allocator-table"><thead><tr><th>Hotel / room</th><th>Type and setup</th><th>Capacity</th><th>Reserved group</th><th>Verification</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${value(locationName(r.location_id))} · ${value(r.room_reference)}</strong><small>${fmtDate(r.available_from)}–${fmtDate(r.available_to)}</small></td><td>${value(r.room_type_label||'Not recorded')}<small>${value(r.bed_configuration||'')}</small></td><td>${r.capacity}</td><td>${value(r.reserved_for||'Open')}</td><td><span class="status ${!r.active||r.inventory_status==='out_of_service'?'red':r.verified?'green':'amber'}">${!r.active||r.inventory_status==='out_of_service'?'Out of service':r.verified?'Verified':'Check details'}</span></td><td>${canEdit()?`<button class="btn btn-ghost btn-small" data-edit-hotel-room="${r.id}">Edit</button>`:''}</td></tr>`).join('')}</tbody></table></div><div id="roomInventoryEditor">${state.roomEditorId!==null?roomEditorMarkup():''}</div></div>`;
  }
  function roomEditorMarkup(){
    const r=state.rooms.find(x=>x.id===state.roomEditorId)||{};
    return `<section class="allocator-detail"><div class="review-heading"><div><span class="status ${r.id?(r.verified?'green':'amber'):'purple'}">${r.id?'Inventory record':'Manual addition'}</span><h3>${r.id?value(roomName(r)):'Add physical room'}</h3><p>Mark rooms out of service rather than deleting their history.</p></div><button class="btn btn-ghost btn-small" id="closeRoomEditor">Close</button></div><form id="hotelRoomForm" class="record-form"><div class="form-grid"><div class="field"><label>Hotel *</label><select name="location_id" required><option value="">Choose hotel…</option>${state.locations.map(l=>`<option value="${l.id}"${selected(r.location_id,l.id)}>${value(l.name)}</option>`).join('')}</select></div><div class="field"><label>Room reference *</label><input name="room_reference" value="${value(r.room_reference||'')}" required></div><div class="field"><label>Room number</label><input name="room_number" value="${value(r.room_number||'')}"></div><div class="field"><label>Physical room type</label><input name="room_type_label" value="${value(r.room_type_label||'')}"></div><div class="field"><label>Bed configuration</label><input name="bed_configuration" value="${value(r.bed_configuration||'')}"></div><div class="field"><label>Capacity *</label><input type="number" min="1" max="10" name="capacity" value="${r.capacity||1}" required></div><div class="field"><label>Available from *</label><input type="date" name="available_from" value="${value(r.available_from||'2027-01-29')}" required></div><div class="field"><label>Available to *</label><input type="date" name="available_to" value="${value(r.available_to||'2027-02-06')}" required></div><div class="field"><label>Reserved group</label><input name="reserved_for" value="${value(r.reserved_for||'')}"></div><div class="field"><label>Status</label><select name="inventory_status"><option value="available"${selected(r.inventory_status,'available')}>Available</option><option value="out_of_service"${selected(r.inventory_status,'out_of_service')}>Out of service</option></select></div><div class="field checkbox"><input id="roomVerified" type="checkbox" name="verified"${checked(r.verified)}><label for="roomVerified">Details verified by Protocol</label></div><div class="field full"><label>Inventory notes</label><textarea name="notes">${value(r.notes||'')}</textarea></div></div><div class="service-actions"><button class="btn btn-primary" type="submit">Save room</button><div class="service-save-result" id="hotelRoomResult"></div></div></form></section>`;
  }

  async function openRequest(id){
    state.selectedRequestId=id;state.manualRequestId=null;state.selectedRoomId=allocation(id)?.hotel_room_id||null;state.suggestions=[];render();
    document.querySelector('#allocatorDetail')?.scrollIntoView({behavior:'smooth',block:'start'});
    await loadSuggestions();
  }
  async function loadSuggestions(){
    if(!state.selectedRequestId)return;
    const el=document.querySelector('#roomSuggestions');if(el)el.innerHTML='<div class="empty">Checking room capacity and dates…</div>';
    const {data,error}=await client.rpc('get_room_allocation_suggestions',{p_request_id:state.selectedRequestId});
    if(error){if(el)el.innerHTML=`<div class="notice error-text">${value(error.message)}</div>`;return}
    state.suggestions=data||[];render();
  }
  async function saveManual(form){
    const body=Object.fromEntries(new FormData(form));
    if(!body.attendee_id&&!body.display_name?.trim())return showResult('#manualRoomResult','Select a person or enter a group name.',true);
    const person=state.attendees.find(item=>item.id===body.attendee_id);
    const {data,error}=await client.rpc('save_manual_room_request',{p_event_id:eventId,p_request_id:state.manualRequestId||null,p_attendee_id:body.attendee_id||null,p_display_name:body.display_name||'',p_email:body.email||person?.email||'',p_mobile:body.mobile||person?.mobile||'',p_category:body.category||person?.category||'',p_organisation_name:body.organisation_name||person?.display_company||'',p_hotel_preference:body.hotel_preference||'',p_requested_check_in:body.requested_check_in||null,p_requested_check_out:body.requested_check_out||null,p_room_share_requested:!!body.room_share_requested,p_requested_share_with:body.requested_share_with||'',p_occupancy_required:Number(body.occupancy_required||1),p_room_setup_preference:body.room_setup_preference||'',p_priority:body.priority||'normal',p_protocol_notes:body.protocol_notes||''});
    if(error)return showResult('#manualRoomResult',error.message,true);
    toast('Manual room request saved');state.manualRequestId=null;state.selectedRequestId=data;await load();await openRequest(data);
  }
  async function confirmDecision(form){
    const body=Object.fromEntries(new FormData(form));
    const button=form.querySelector('[type="submit"]');button.disabled=true;
    const {error}=await client.rpc('confirm_room_allocation',{p_request_id:state.selectedRequestId,p_hotel_room_id:body.hotel_room_id,p_check_in:body.check_in,p_check_out:body.check_out,p_occupancy_count:Number(body.occupancy_count),p_decision_notes:body.decision_notes||''});
    button.disabled=false;if(error)return showResult('#roomDecisionResult',error.message,true);
    toast('Final room allocation confirmed by Protocol');await load();await openRequest(state.selectedRequestId);
  }
  async function cancelAllocation(){
    const reason=window.prompt('Reason for returning this allocation to review:','Protocol review');if(reason===null)return;
    const {error}=await client.rpc('cancel_room_allocation',{p_request_id:state.selectedRequestId,p_reason:reason});
    if(error)return showResult('#roomDecisionResult',error.message,true);
    toast('Allocation returned to review');state.selectedRoomId=null;await load();await openRequest(state.selectedRequestId);
  }
  async function saveRoom(form){
    const body=Object.fromEntries(new FormData(form));
    const payload={event_id:eventId,location_id:body.location_id,room_reference:body.room_reference.trim(),room_number:body.room_number.trim()||null,room_type_label:body.room_type_label.trim()||null,bed_configuration:body.bed_configuration.trim()||null,capacity:Number(body.capacity),available_from:body.available_from,available_to:body.available_to,reserved_for:body.reserved_for.trim()||null,inventory_status:body.inventory_status,verified:!!body.verified,notes:body.notes.trim()||null,active:true};
    let result;
    if(state.roomEditorId){result=await client.from('hotel_rooms').update(payload).eq('id',state.roomEditorId).select('id').single()}
    else{payload.source_key=`manual:${crypto.randomUUID()}`;payload.source_workbook='Protocol manual entry';payload.sort_order=1000+state.rooms.length;result=await client.from('hotel_rooms').insert(payload).select('id').single()}
    if(result.error)return showResult('#hotelRoomResult',result.error.message,true);
    toast('Room inventory saved');state.roomEditorId=null;await load();
  }
  function showResult(selector,message,error=false){const el=document.querySelector(selector);if(el)el.innerHTML=`<span class="${error?'error-text':'success-text'}">${value(message)}</span>`}

  function bindBody(){
    const query=document.querySelector('#allocatorQuery');if(query)query.oninput=()=>{const position=query.selectionStart;state.query=query.value;render();const next=document.querySelector('#allocatorQuery');next?.focus();next?.setSelectionRange(position,position)};
    const status=document.querySelector('#allocatorStatus');if(status)status.onchange=()=>{state.status=status.value;render()};
    const hotel=document.querySelector('#allocatorHotel');if(hotel)hotel.onchange=()=>{state.hotel=hotel.value;render()};
    document.querySelectorAll('[data-open-room-request]').forEach(button=>button.onclick=()=>openRequest(button.dataset.openRoomRequest));
    document.querySelectorAll('[data-choose-room]').forEach(button=>button.onclick=()=>{state.selectedRoomId=button.dataset.chooseRoom;render()});
    document.querySelectorAll('[data-edit-hotel-room]').forEach(button=>button.onclick=()=>{state.roomEditorId=button.dataset.editHotelRoom;render();document.querySelector('#roomInventoryEditor')?.scrollIntoView({behavior:'smooth'})});
    const close=document.querySelector('#closeRoomRequest');if(close)close.onclick=()=>{state.selectedRequestId=null;state.suggestions=[];render()};
    const reload=document.querySelector('#reloadSuggestions');if(reload)reload.onclick=loadSuggestions;
    const edit=document.querySelector('#editManualRoomRequest');if(edit)edit.onclick=()=>{state.manualRequestId=state.selectedRequestId;state.selectedRequestId=null;render()};
    const manualClose=document.querySelector('#closeManualRoomRequest');if(manualClose)manualClose.onclick=()=>{state.manualRequestId=null;render()};
    const manualForm=document.querySelector('#manualRoomRequestForm');if(manualForm)manualForm.onsubmit=e=>{e.preventDefault();saveManual(manualForm)};
    const finalForm=document.querySelector('#finalRoomDecision');if(finalForm){finalForm.onsubmit=e=>{e.preventDefault();confirmDecision(finalForm)};finalForm.hotel_room_id.onchange=()=>{state.selectedRoomId=finalForm.hotel_room_id.value;render()}}
    const cancel=document.querySelector('#cancelRoomAllocation');if(cancel)cancel.onclick=cancelAllocation;
    const roomClose=document.querySelector('#closeRoomEditor');if(roomClose)roomClose.onclick=()=>{state.roomEditorId=null;render()};
    const roomForm=document.querySelector('#hotelRoomForm');if(roomForm)roomForm.onsubmit=e=>{e.preventDefault();saveRoom(roomForm)};
  }

  function bind(){
    document.querySelectorAll('[data-allocator-view]').forEach(button=>button.onclick=()=>{state.view=button.dataset.allocatorView;state.query='';state.hotel='all';state.selectedRequestId=null;state.manualRequestId=null;state.roomEditorId=null;render()});
    const sync=document.querySelector('#syncRoomRequests');if(sync)sync.onclick=async()=>{sync.disabled=true;await load({sync:true});sync.disabled=false;toast('Registration accommodation requests refreshed')};
    const addManual=document.querySelector('#addManualRoomRequest');if(addManual)addManual.onclick=()=>{state.view='queue';state.manualRequestId='';state.selectedRequestId=null;render()};
    const addRoom=document.querySelector('#addHotelRoom');if(addRoom)addRoom.onclick=()=>{state.roomEditorId='';render()};
    bindBody();
  }

  return {markup,bind,load};
}
