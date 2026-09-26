begin;
-- Keep the submitted answer columns aligned with the canonical booking fields.
-- The source payload retains extra questions which have no dedicated column.
create function private.registration_requested(p_booking public.booking_requests,p_original jsonb) returns jsonb
language sql stable set search_path='' as $$
 select coalesce(p_original,'{}'::jsonb) || case when p_booking.id is null then '{}'::jsonb else
  coalesce((select jsonb_object_agg(k,to_jsonb(p_booking)->k) from unnest(array[
   'other_information','accommodation_required','accommodation_from','accommodation_to','hotel_preference','room_share_requested','room_share_with','room_sharing_option','dinners_with_guests',
   'arrival_method','arrival_airport_station','arrival_flight_number','arrival_datetime','arrival_resort_datetime','arrival_transfer_requested','arrival_special_transfer_datetime',
   'departure_method','departure_airport_station','departure_flight_number','departure_datetime','departure_resort_datetime','departure_transfer_requested','departure_special_transfer_datetime',
   'lift_pass_required','first_ski_day','last_ski_day','carre_neige_requested','lessons_required','lesson_type','lesson_dates','equipment_hire_required','boot_size',
   'arrival_details','departure_details','in_resort_details']::text[]) k where to_jsonb(p_booking)->k is not null),'{}'::jsonb) end
$$;
revoke all on function private.registration_requested(public.booking_requests,jsonb) from public,anon,authenticated;
create or replace function public.get_bulk_workspace(p_event_id uuid,p_sheet text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; tab text;
begin
 perform private.require_workspace(p_event_id,p_sheet);
 if p_sheet in ('hotels','lift_passes','transport','services','transfer_review') then
  tab:=case p_sheet when 'hotels' then 'stay_charge_periods' when 'lift_passes' then 'lift_passes' when 'transport' then 'travel_records' when 'transfer_review' then 'travel_records' else 'attendee_service_items' end;
  execute format('select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object(''entity'',$2,''first_name'',a.first_name,''surname'',a.surname,''company'',a.display_company,''version'',md5(to_jsonb(t)::text)) order by a.surname,a.first_name),''[]'') from public.%I t join public.attendees a on a.id=t.attendee_id where a.event_id=$1',tab) into result using p_event_id,tab;
 elsif p_sheet='registrations' then
  select coalesce(jsonb_agg(row order by row->>'surname',row->>'first_name'),'[]') into result from (
   select coalesce(to_jsonb(b)-'source_payload','{}') || to_jsonb(a) || jsonb_build_object(
    'id',a.id,'entity','attendees','registration_id',b.id,'registration_status',b.status,
    'requested',private.registration_requested(b,coalesce(intake.raw_payload,'{}'::jsonb)||coalesce(b.source_payload,'{}'::jsonb)),
    'registration_intake_id',intake.id,
    'version',md5(to_jsonb(a)::text||coalesce(to_jsonb(b)::text,'')||coalesce(to_jsonb(intake)::text,'')),
    'stays',coalesce((select jsonb_agg(to_jsonb(s)) from public.stay_charge_periods s where s.attendee_id=a.id),'[]'),
    'lift_passes',coalesce((select jsonb_agg(to_jsonb(l)) from public.lift_passes l where l.attendee_id=a.id),'[]'),
    'services',coalesce((select jsonb_agg(to_jsonb(s)) from public.attendee_service_items s where s.attendee_id=a.id),'[]'),
    'travel',coalesce((select jsonb_agg(to_jsonb(t)) from public.travel_records t where t.attendee_id=a.id),'[]')) row
   from public.attendees a left join lateral(select * from public.booking_requests b where b.attendee_id=a.id order by b.updated_at desc,b.id limit 1)b on true
   left join lateral(select * from public.intake_submissions i where i.mapped_attendee_id=a.id order by i.submitted_at desc,i.id limit 1)intake on true where a.event_id=p_event_id
   union all
   select (to_jsonb(b)-'source_payload')||jsonb_build_object('entity','booking_requests','registration_status',b.status,'requested',private.registration_requested(b,b.source_payload),'version',md5(to_jsonb(b)::text)) from public.booking_requests b where b.event_id=p_event_id and b.attendee_id is null and b.status<>'draft'
  ) q;
 elsif p_sheet='charges' then
  select coalesce(jsonb_agg(row order by row->>'surname',row->>'description'),'[]') into result from (
   select to_jsonb(c)||jsonb_build_object('id',c.source_id,'entity',c.source_type,'attendee_id',a.id,'first_name',a.first_name,'surname',a.surname,
    'company',a.display_company,'version',private.billing_charge_signature(a.id),'chargeable',coalesce(u.chargeable,l.chargeable,true),'usage_date',u.usage_date,'notes',coalesce(u.notes,l.notes),
    'billing_from',s.billing_from,'billing_to',s.billing_to,'start_date',l.start_date,'end_date',l.end_date,'protocol_confirmed',coalesce(s.protocol_confirmed,l.protocol_confirmed),
    'locked',exists(select 1 from public.invoice_lines l join public.invoices i on i.id=l.invoice_id where l.attendee_id=a.id and i.status in ('approved','issued','paid'))) row
   from public.attendees a cross join lateral private.billing_charges(a.id)c
   left join public.usage_extras u on c.source_type='usage' and u.id=c.source_id
   left join public.stay_charge_periods s on c.source_type='stay' and s.id=c.source_id
   left join public.lift_passes l on c.source_type='lift_pass' and l.id=c.source_id where a.event_id=p_event_id
  )q;
 elsif p_sheet='billing' then
  select coalesce(jsonb_agg(to_jsonb(r)||to_jsonb(e)||jsonb_build_object('id',a.id,'entity','billing','email',a.email,'company',a.display_company,'billing_plan',to_jsonb(p),
   'charge_signature',private.billing_charge_signature(a.id),'package_complete',private.finance_transfer_package_complete(a.id),
   'chargeable_transfer',exists(select 1 from public.travel_records t where t.attendee_id=a.id and t.transfer_chargeable),
   'transfer_package',(select u.rate_code from public.usage_extras u where u.attendee_id=a.id and u.category in ('transfer','admin') order by u.updated_at desc limit 1),
   'invoice_stages',coalesce((select jsonb_agg(distinct jsonb_build_object('id',i.id,'reference',i.invoice_reference,'status',i.status,'gross',i.gross_total)) from public.invoices i left join public.invoice_lines l on l.invoice_id=i.id where i.event_id=p_event_id and (i.attendee_id=a.id or l.attendee_id=a.id) and i.status not in ('cancelled','void')),'[]')) order by a.surname,a.first_name),'[]') into result
   from public.attendees a join public.v_invoice_readiness r on r.attendee_id=a.id left join public.v_finance_charge_estimates e on e.attendee_id=a.id left join public.attendee_billing_plans p on p.attendee_id=a.id where a.event_id=p_event_id;
 else
  select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('entity','invoices','version',md5(to_jsonb(i)::text),
   'dispatch_status',coalesce((select j.status from public.invoice_dispatch_jobs j where j.invoice_id=i.id order by j.created_at desc limit 1),(select d.delivery_status from public.invoice_deliveries d where d.invoice_id=i.id order by d.requested_at desc limit 1),'not queued'),
   'recipient',coalesce(i.recipient_name_snapshot,o.billing_name,o.organisation_name,concat_ws(' ',a.first_name,a.surname)),
   'email',coalesce(i.recipient_email_snapshot,o.billing_email,a.email),
   'delivery',coalesce((select jsonb_agg(to_jsonb(d) order by d.requested_at desc) from public.invoice_deliveries d where d.invoice_id=i.id),'[]')) order by i.created_at desc),'[]') into result
   from public.invoices i left join public.attendees a on a.id=i.attendee_id left join public.organisations o on o.id=i.billing_account_organisation_id where i.event_id=p_event_id;
 end if;
 return result;
end $$;

create or replace function public.save_bulk_cell(p_event_id uuid,p_sheet text,p_id uuid,p_version text,p_patch jsonb,p_reason text default null) returns void language plpgsql security definer set search_path='' as $$
declare oldrow jsonb; afterrow jsonb; rec jsonb; col text; assignments text; tab text; allowed text[]; aid uuid; br public.booking_requests; i public.invoices; u public.usage_extras; rate public.rate_card; st public.stay_charge_periods; lp public.lift_passes; tr public.travel_records; si public.attendee_service_items; proposed jsonb; request_patch jsonb; request_fields text[]; source_patch jsonb:='{}'; intake_patch jsonb:='{}'; source_keys text[]; source_before jsonb; canonical_patch jsonb; intake_id uuid;
begin
 perform private.require_workspace(p_event_id,p_sheet,true);
 if jsonb_typeof(p_patch)<>'object' or p_patch='{}' or length(p_patch::text)>20000 then raise exception 'Invalid edit'; end if;
 -- Lock the event consistently with billing-plan generation before source rows.
 perform pg_advisory_xact_lock(hashtext(p_event_id::text),3501);
 select value into rec from jsonb_array_elements(public.get_bulk_workspace(p_event_id,p_sheet)) where value->>'id'=p_id::text;
 if rec is null or rec->>'version' is distinct from p_version then raise exception 'Record changed; refresh before saving'; end if;
 if p_sheet in ('hotels','lift_passes','transport','services','transfer_review') then
  tab:=rec->>'entity';
  allowed:=case p_sheet
   when 'transfer_review' then array['transfer_chargeable','billing_reviewed','billing_review_notes']
   when 'hotels' then array['actual_check_in','actual_check_out','billing_from','billing_to','rate_code','protocol_confirmed']
   when 'lift_passes' then array['required','start_date','end_date','carre_neige_required','chargeable','rate_code','protocol_confirmed','notes']
   when 'transport' then array['method_of_transport','airport_station','flight_travel_number','travel_datetime','resort_datetime','transfer_requested','transfer_service','transfer_chargeable','special_transfer_datetime','assignment_notes','protocol_confirmed']
   else array['service_date','title','status','quantity','chargeable','rate_code','attendee_details','protocol_notes'] end;
  if exists(select 1 from jsonb_object_keys(p_patch)k where not k=any(allowed)) then raise exception 'Unsupported operational field'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tab) into oldrow using p_id;
  if md5(oldrow::text) is distinct from p_version then raise exception 'Record changed; refresh before saving'; end if;
  if p_sheet='transfer_review' then
   tr:=jsonb_populate_record(null::public.travel_records,oldrow||p_patch);
   if p_patch ? 'transfer_chargeable' then
    if nullif(btrim(p_reason),'') is null then raise exception 'A reason is required to change transfer charging'; end if;
    if tr.transfer_chargeable and (not coalesce(tr.transfer_requested,false) or not coalesce(tr.protocol_confirmed,false)) then raise exception 'Confirm the requested transfer in Protocol before charging'; end if;
    if not tr.transfer_chargeable and exists(select 1 from public.usage_extras x where x.attendee_id=tr.attendee_id and x.category='transfer' and x.chargeable) then raise exception 'Resolve the existing transfer package before removing its chargeable journey'; end if;
    update public.travel_records set transfer_chargeable=tr.transfer_chargeable,billing_reviewed=false,billing_review_notes=null,billing_reviewed_by=null,billing_reviewed_at=null where id=tr.id;
    update public.attendees set data_checked=false,checked_by=null,checked_at=null where id=tr.attendee_id;
    update public.invoices set status='awaiting_billing_update',updated_at=clock_timestamp() where status in ('draft','ready_for_review') and id in(select invoice_id from public.invoice_lines where attendee_id=tr.attendee_id);
    if not (p_patch ? 'billing_reviewed' and p_patch->>'billing_reviewed'='true' and nullif(btrim(p_patch->>'billing_review_notes'),'') is not null) then tr.billing_reviewed:=false;tr.billing_review_notes:=null;end if;
   end if;
   perform public.review_finance_transfer(tr.id,tr.billing_reviewed,tr.billing_review_notes);
  elsif p_sheet='hotels' then
   st:=jsonb_populate_record(null::public.stay_charge_periods,oldrow||p_patch);
   perform public.save_protocol_stay(st.attendee_id,st.id,st.location_id,st.room_type_id,st.sharing_with_attendee_id,st.actual_check_in,st.actual_check_out,st.billing_from,st.billing_to,st.rate_code,st.protocol_confirmed);
  elsif p_sheet='lift_passes' then
   lp:=jsonb_populate_record(null::public.lift_passes,oldrow||p_patch);
   if (oldrow->>'protocol_confirmed')::boolean then
    select jsonb_object_agg(k,(oldrow||p_patch)->k) into proposed from unnest(allowed)k;
    perform public.request_lift_change(p_id,proposed,p_reason);
   else perform public.save_protocol_lift_pass(lp.attendee_id,lp.id,lp.required,lp.start_date,lp.end_date,lp.carre_neige_required,lp.chargeable,lp.rate_code,lp.protocol_confirmed,lp.notes); end if;
  elsif p_sheet='transport' then
   tr:=jsonb_populate_record(null::public.travel_records,oldrow||p_patch);
   perform public.save_protocol_travel(tr.attendee_id,tr.direction,tr.method_of_transport,tr.airport_station,tr.flight_travel_number,tr.travel_datetime,tr.resort_datetime,tr.transfer_requested,tr.transfer_service,tr.transfer_chargeable,tr.special_transfer_datetime,tr.assignment_notes,tr.protocol_confirmed);
  else
   si:=jsonb_populate_record(null::public.attendee_service_items,oldrow||p_patch);
   perform public.save_protocol_service_item(si.attendee_id,si.id,si.service_type,si.service_date,si.title,si.status,si.quantity,si.chargeable,si.rate_code,si.attendee_details,si.protocol_notes);
  end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1',tab) into afterrow using p_id;
 elsif p_sheet='registrations' then
  tab:=rec->>'entity';
  select coalesce(array_agg(k),'{}'::text[]) into source_keys from jsonb_object_keys(p_patch) k where left(k,10)='submitted_';
  if cardinality(source_keys)>0 then
   if exists(select 1 from unnest(source_keys) k where substring(k from 11) !~ '^[a-z][a-z0-9_]{0,79}$'
    or not (rec->'requested' ? substring(k from 11))
    or substring(k from 11)=any(array['id','event_id','attendee_id','user_id','invitation_id','first_name','surname','email','mobile','category','title_rank','post_nominals','service','discipline','position_role','date_of_birth','dietary_requirements','equipment_hire_required','boot_size','known_as','display_company','privacy_acknowledged_at','public_reference'])) then
    raise exception 'Use the attendee column for identity fields; unknown submitted answers cannot be amended';
   end if;
   select jsonb_object_agg(substring(k from 11),v) into source_patch from jsonb_each(p_patch) e(k,v) where k=any(source_keys);
   p_patch:=p_patch-source_keys;
  end if;
  allowed:=array['category','title_rank','first_name','surname','post_nominals','email','mobile','service','discipline','position_role','dietary_requirements','date_of_birth','equipment_hire_required','boot_size'];
  if tab='attendees' then allowed:=allowed||array['known_as','display_company','attendee_notes','protocol_notes'];
  else allowed:=allowed||array['other_information','accommodation_required','accommodation_from','accommodation_to','hotel_preference','room_share_requested','room_share_with','room_sharing_option','dinners_with_guests','arrival_method','arrival_airport_station','arrival_flight_number','arrival_datetime','arrival_resort_datetime','arrival_transfer_requested','arrival_special_transfer_datetime','departure_method','departure_airport_station','departure_flight_number','departure_datetime','departure_resort_datetime','departure_transfer_requested','departure_special_transfer_datetime','lift_pass_required','first_ski_day','last_ski_day','carre_neige_requested','lessons_required','lesson_type','lesson_dates','arrival_details','departure_details','in_resort_details']; end if;
  request_fields:=array['other_information','accommodation_required','accommodation_from','accommodation_to','hotel_preference','room_share_requested','room_share_with','room_sharing_option','dinners_with_guests','arrival_method','arrival_airport_station','arrival_flight_number','arrival_datetime','arrival_resort_datetime','arrival_transfer_requested','arrival_special_transfer_datetime','departure_method','departure_airport_station','departure_flight_number','departure_datetime','departure_resort_datetime','departure_transfer_requested','departure_special_transfer_datetime','lift_pass_required','first_ski_day','last_ski_day','carre_neige_requested','lessons_required','lesson_type','lesson_dates','arrival_details','departure_details','in_resort_details'];
  if tab='attendees' and rec->>'registration_id' is not null then allowed:=allowed||request_fields; end if;
  if exists(select 1 from jsonb_object_keys(p_patch)k where not k=any(allowed)) then raise exception 'Field is not editable here; use the operational approval workflow for confirmed services'; end if;
  if p_patch ? 'email' and coalesce(p_patch->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Valid email required'; end if;
  if (p_patch ? 'first_name' and btrim(coalesce(p_patch->>'first_name',''))='') or (p_patch ? 'surname' and btrim(coalesce(p_patch->>'surname',''))='') then raise exception 'Name is required'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tab) into oldrow using p_id;
  if (rec->>'entity'='booking_requests' and md5(oldrow::text)<>p_version) or (rec->>'entity'='attendees' and md5(oldrow::text||coalesce((select to_jsonb(b)::text from public.booking_requests b where b.attendee_id=p_id order by b.updated_at desc,b.id limit 1),'')||coalesce((select to_jsonb(intake_source)::text from public.intake_submissions intake_source where intake_source.mapped_attendee_id=p_id order by intake_source.submitted_at desc,intake_source.id limit 1),''))<>p_version) then raise exception 'Record changed; refresh before saving'; end if;
  if tab='attendees' and rec->>'registration_id' is not null then
   select coalesce(jsonb_object_agg(k,v),'{}') into request_patch from jsonb_each(p_patch)e(k,v) where k=any(request_fields);
   if request_patch<>'{}' then
    select * into br from public.booking_requests where id=(rec->>'registration_id')::uuid for update;
    if md5(oldrow::text||to_jsonb(br)::text||coalesce((select to_jsonb(intake_source)::text from public.intake_submissions intake_source where intake_source.mapped_attendee_id=p_id order by intake_source.submitted_at desc,intake_source.id limit 1),''))<>p_version then raise exception 'Record changed; refresh before saving'; end if;
    select string_agg(format('%I = v.%I',k,k),',') into assignments from jsonb_object_keys(request_patch)k;
    execute format('update public.booking_requests t set %s,source_payload=t.source_payload||$3,updated_at=clock_timestamp() from jsonb_populate_record(null::public.booking_requests,$1) v where t.id=$2',assignments) using request_patch,br.id,request_patch;
    insert into public.workspace_audit(event_id,actor_id,entity,record_id,before_data,after_data,reason) values(p_event_id,auth.uid(),'booking_requests',br.id,to_jsonb(br),(select to_jsonb(b) from public.booking_requests b where b.id=br.id),p_reason);
    intake_patch:=intake_patch||request_patch;
    p_patch:=p_patch-request_fields;
   end if;
  end if;
  select string_agg(format('%I = v.%I',k,k),',') into assignments from jsonb_object_keys(p_patch)k;
  if assignments is not null then
  execute format('update public.%I t set %s,updated_at=clock_timestamp() from jsonb_populate_record(null::public.%I,$1) v where t.id=$2 returning to_jsonb(t)',tab,assignments,tab) into afterrow using p_patch,p_id;
  else afterrow:=oldrow; end if;
  if source_patch<>'{}'::jsonb then
   intake_patch:=intake_patch||source_patch;
   if tab='booking_requests' or rec->>'registration_id' is not null then
    select * into br from public.booking_requests where id=case when tab='booking_requests' then p_id else (rec->>'registration_id')::uuid end for update;
    source_before:=to_jsonb(br);
    select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) into canonical_patch from jsonb_each(source_patch)e(k,v) where k=any(request_fields);
    select string_agg(format('%I = v.%I',k,k),',') into assignments from jsonb_object_keys(canonical_patch)k;
    if assignments is null then
     update public.booking_requests set source_payload=source_payload||source_patch,updated_at=clock_timestamp() where id=br.id;
    else
     execute format('update public.booking_requests t set %s,source_payload=t.source_payload||$3,updated_at=clock_timestamp() from jsonb_populate_record(null::public.booking_requests,$1) v where t.id=$2',assignments) using canonical_patch,br.id,source_patch;
    end if;
    insert into public.workspace_audit(event_id,actor_id,entity,record_id,before_data,after_data,reason) values(p_event_id,auth.uid(),'booking_requests',br.id,source_before,(select to_jsonb(b) from public.booking_requests b where b.id=br.id),p_reason);
   elsif rec->>'registration_intake_id' is null then raise exception 'This attendee has no linked registration form answer to amend'; end if;
  end if;
  if tab='attendees' and rec->>'registration_intake_id' is not null and intake_patch<>'{}'::jsonb then
   intake_id:=(rec->>'registration_intake_id')::uuid;
   select to_jsonb(intake_source) into source_before from public.intake_submissions intake_source where id=intake_id for update;
   update public.intake_submissions set raw_payload=raw_payload||intake_patch where id=intake_id;
   insert into public.workspace_audit(event_id,actor_id,entity,record_id,before_data,after_data,reason) values(p_event_id,auth.uid(),'intake_submissions',intake_id,source_before,(select to_jsonb(intake_source) from public.intake_submissions intake_source where intake_source.id=intake_id),p_reason);
  end if;
  if tab='booking_requests' then select to_jsonb(b) into afterrow from public.booking_requests b where id=p_id; end if;
  if tab='attendees' then update public.attendees set data_checked=false,checked_by=null,checked_at=null where id=p_id; end if;
 elsif p_sheet='charges' then
  if (rec->>'locked')::boolean then raise exception 'Confirmed invoice charges are immutable; use an adjustment'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'A reason is required for charge amendments'; end if;
  if rec->>'entity'='usage' then
   if exists(select 1 from jsonb_object_keys(p_patch)k where k not in ('quantity','rate_code','notes')) then raise exception 'Unsupported usage charge field'; end if;
   select * into u from public.usage_extras where id=p_id for update; oldrow:=to_jsonb(u); aid:=u.attendee_id;
   if private.billing_charge_signature(aid) is distinct from p_version then raise exception 'Record changed; refresh before saving'; end if;
   if u.category in ('admin','transfer') then raise exception 'Choose the transfer/admin package in the Billing worksheet'; end if;
   u:=jsonb_populate_record(u,p_patch);
   if u.quantity<=0 then raise exception 'Quantity must be greater than zero'; end if;
   select * into rate from public.rate_card where event_id=p_event_id and rate_code=u.rate_code and active and status='approved';
   if rate.id is null or rate.charge_category<>u.category then raise exception 'Choose an approved rate in the same charge category'; end if;
   update public.usage_extras set quantity=u.quantity,rate_code=u.rate_code,notes=u.notes,updated_at=clock_timestamp() where id=p_id returning to_jsonb(usage_extras) into afterrow;
   update public.attendee_service_items set quantity=u.quantity,rate_code=u.rate_code,updated_at=clock_timestamp() where usage_extra_id=p_id;
  elsif rec->>'entity'='stay' then
   if exists(select 1 from jsonb_object_keys(p_patch)k where k not in ('billing_from','billing_to','rate_code')) then raise exception 'Edit accommodation billing dates or rate only'; end if;
   select * into st from public.stay_charge_periods where id=p_id for update;oldrow:=to_jsonb(st);aid:=st.attendee_id;
   if private.billing_charge_signature(aid) is distinct from p_version then raise exception 'Record changed; refresh before saving'; end if;
   if not st.protocol_confirmed then raise exception 'Confirm accommodation in Protocol before amending its charge'; end if;
   st:=jsonb_populate_record(st,p_patch);
   select * into rate from public.rate_card where event_id=p_event_id and rate_code=st.rate_code and active and status='approved';
   if rate.id is null or rate.charge_category<>'accommodation' then raise exception 'Choose an approved accommodation rate'; end if;
   perform public.assign_stay_service(st.id,st.location_id,st.room_type_id,st.billing_from,st.billing_to,st.rate_code,auth.uid());
   select to_jsonb(s) into afterrow from public.stay_charge_periods s where s.id=p_id;
  elsif rec->>'entity'='lift_pass' then
   if exists(select 1 from jsonb_object_keys(p_patch)k where k not in ('start_date','end_date','rate_code','chargeable')) then raise exception 'Edit lift dates, rate or chargeable status only'; end if;
   select * into lp from public.lift_passes where id=p_id for update;oldrow:=to_jsonb(lp);aid:=lp.attendee_id;
   if private.billing_charge_signature(aid) is distinct from p_version then raise exception 'Record changed; refresh before saving'; end if;
   if not lp.protocol_confirmed then raise exception 'Confirm lift pass in Protocol before amending its charge'; end if;
   lp:=jsonb_populate_record(lp,p_patch);
   if lp.chargeable then
    select * into rate from public.rate_card where event_id=p_event_id and rate_code=lp.rate_code and active and status='approved';
    if rate.id is null or rate.charge_category<>'lift_pass' then raise exception 'Choose an approved lift-pass rate'; end if;
   end if;
   select jsonb_object_agg(k,to_jsonb(lp)->k) into proposed from unnest(array['required','start_date','end_date','carre_neige_required','chargeable','rate_code','protocol_confirmed','notes'])k;
   perform public.request_lift_change(p_id,proposed,p_reason);
   afterrow:=oldrow;
  else raise exception 'This charge follows another operational workflow'; end if;
  if rec->>'entity'<>'lift_pass' then
   update public.attendees set data_checked=false,checked_by=null,checked_at=null where id=aid;
   update public.invoices set status='awaiting_billing_update',updated_at=clock_timestamp() where status in ('draft','ready_for_review') and id in(select invoice_id from public.invoice_lines where attendee_id=aid);
  end if;
 elsif p_sheet='invoices' then
  if exists(select 1 from jsonb_object_keys(p_patch)k where k not in ('payment_link','purchase_order_reference','due_date','notes')) then raise exception 'Unsupported invoice field'; end if;
  if p_patch ? 'payment_link' and coalesce(p_patch->>'payment_link','')<>'' and (p_patch->>'payment_link' !~ '^https://[^[:space:]]+$' or length(p_patch->>'payment_link')>2000) then raise exception 'Payment link must be a valid HTTPS URL'; end if;
  select * into i from public.invoices where id=p_id for update; oldrow:=to_jsonb(i); if md5(oldrow::text) is distinct from p_version then raise exception 'Record changed; refresh before saving'; end if; i:=jsonb_populate_record(i,p_patch);
  perform public.save_finance_invoice_metadata(i.id,i.purchase_order_reference,i.payment_link,i.due_date,i.payment_terms_days,i.notes);
  select to_jsonb(x) into afterrow from public.invoices x where id=p_id;
 else raise exception 'Unsupported edit'; end if;
 insert into public.workspace_audit(event_id,actor_id,entity,record_id,before_data,after_data,reason) values(p_event_id,auth.uid(),p_sheet,p_id,oldrow,afterrow,p_reason);
end $$;

create or replace function public.request_lift_change(p_lift_pass_id uuid,p_proposed jsonb,p_justification text) returns uuid
language plpgsql security definer set search_path='' as $$
declare l public.lift_passes; eid uuid; result uuid;
begin
 perform private.require_actor_role(auth.uid(),array['admin','protocol','operations','finance']);
 if length(btrim(coalesce(p_justification,''))) not between 1 and 4000 then raise exception 'A justification of 1–4000 characters is required'; end if;
 select * into l from public.lift_passes where id=p_lift_pass_id for update;
 if l.id is null or not l.protocol_confirmed then raise exception 'Confirmed lift pass required'; end if;
 select event_id into eid from public.attendees where id=l.attendee_id;
 if exists(select 1 from public.events where id=eid and is_test) and not private.has_staff_role(array['admin']) then raise exception 'Test event is Admin only'; end if;
 if p_proposed is null or jsonb_typeof(p_proposed)<>'object' or exists(select 1 from jsonb_object_keys(p_proposed) k where k not in ('required','start_date','end_date','carre_neige_required','chargeable','rate_code','protocol_confirmed','notes')) then raise exception 'Invalid proposed fields'; end if;
 if not p_proposed ?& array['required','start_date','end_date','carre_neige_required','chargeable','rate_code','protocol_confirmed','notes'] then raise exception 'Complete proposed values required'; end if;
 if exists(select 1 from unnest(array['required','carre_neige_required','chargeable','protocol_confirmed']) k where jsonb_typeof(p_proposed->k) is distinct from 'boolean') then raise exception 'Boolean values required';end if;
 if (p_proposed->>'required')::boolean and ((p_proposed->>'start_date')::date is null or (p_proposed->>'end_date')::date is null or (p_proposed->>'end_date')::date<(p_proposed->>'start_date')::date or not (p_proposed->>'carre_neige_required')::boolean) then raise exception 'Valid dates and Carre Neige required'; end if;
 insert into public.lift_change_requests(event_id,lift_pass_id,attendee_id,before_data,proposed_data,justification,requested_by)
 values(eid,l.id,l.attendee_id,to_jsonb(l),p_proposed,btrim(p_justification),auth.uid()) returning id into result;
 return result;
end $$;
commit;
