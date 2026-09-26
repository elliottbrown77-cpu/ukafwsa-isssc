begin;
-- Bulk workspaces use explicit grants, event checks and optimistic row fingerprints.
create table public.workspace_audit (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id),
 actor_id uuid not null references auth.users(id), entity text not null, record_id uuid not null,
 before_data jsonb, after_data jsonb, reason text, created_at timestamptz not null default now()
);
alter table public.workspace_audit enable row level security;
revoke all on public.workspace_audit from public,anon,authenticated;
grant select on public.workspace_audit to authenticated;
create policy workspace_audit_read on public.workspace_audit for select to authenticated using(private.has_staff_role(array['admin']) and private.can_access_replay(event_id));

create function private.require_workspace(p_event uuid,p_sheet text,p_edit boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.events where id=p_event) then raise exception 'Event not found'; end if;
 if not private.can_access_replay(p_event) then raise exception 'Test event is Admin only' using errcode='42501'; end if;
 if p_sheet in ('registrations','hotels','lift_passes','transport','services') then
  if p_edit then perform private.require_actor_role(auth.uid(),array['admin','protocol','operations']);
  else perform private.require_report(p_event,case when p_sheet in ('hotels','lift_passes','transport') then p_sheet else 'master' end,false); end if;
 elsif p_sheet in ('charges','billing','invoices','transfer_review') then perform private.require_actor_role(auth.uid(),array['admin','finance']);
 else raise exception 'Unknown worksheet'; end if;
end $$;

-- Return JSON rather than a SETOF result: PostgREST's row cap must not silently truncate a worksheet.
create function public.get_bulk_workspace(p_event_id uuid,p_sheet text) returns jsonb language plpgsql security definer set search_path='' as $$
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
    'requested',coalesce(b.source_payload,intake.raw_payload,'{}'::jsonb),
    'version',md5(to_jsonb(a)::text||coalesce(to_jsonb(b)::text,'')),
    'stays',coalesce((select jsonb_agg(to_jsonb(s)) from public.stay_charge_periods s where s.attendee_id=a.id),'[]'),
    'lift_passes',coalesce((select jsonb_agg(to_jsonb(l)) from public.lift_passes l where l.attendee_id=a.id),'[]'),
    'services',coalesce((select jsonb_agg(to_jsonb(s)) from public.attendee_service_items s where s.attendee_id=a.id),'[]'),
    'travel',coalesce((select jsonb_agg(to_jsonb(t)) from public.travel_records t where t.attendee_id=a.id),'[]')) row
   from public.attendees a left join lateral(select * from public.booking_requests b where b.attendee_id=a.id order by b.updated_at desc,b.id limit 1)b on true
   left join lateral(select raw_payload from public.intake_submissions i where i.mapped_attendee_id=a.id order by i.submitted_at desc,i.id limit 1)intake on true where a.event_id=p_event_id
   union all
   select (to_jsonb(b)-'source_payload')||jsonb_build_object('entity','booking_requests','registration_status',b.status,'requested',b.source_payload,'version',md5(to_jsonb(b)::text)) from public.booking_requests b where b.event_id=p_event_id and b.attendee_id is null and b.status<>'draft'
  ) q;
 elsif p_sheet='charges' then
  select coalesce(jsonb_agg(row order by row->>'surname',row->>'description'),'[]') into result from (
   select to_jsonb(c)||jsonb_build_object('id',c.source_id,'entity',c.source_type,'attendee_id',a.id,'first_name',a.first_name,'surname',a.surname,
    'company',a.display_company,'version',private.billing_charge_signature(a.id),'chargeable',u.chargeable,'usage_date',u.usage_date,'notes',u.notes,
    'locked',exists(select 1 from public.invoice_lines l join public.invoices i on i.id=l.invoice_id where l.attendee_id=a.id and i.status in ('approved','issued','paid'))) row
   from public.attendees a cross join lateral private.billing_charges(a.id)c left join public.usage_extras u on c.source_type='usage' and u.id=c.source_id where a.event_id=p_event_id
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

-- A typed allow-list ensures pasted values cannot alter identity, permissions or confirmations.
create function public.save_bulk_cell(p_event_id uuid,p_sheet text,p_id uuid,p_version text,p_patch jsonb,p_reason text default null) returns void language plpgsql security definer set search_path='' as $$
declare oldrow jsonb; afterrow jsonb; rec jsonb; col text; assignments text; tab text; allowed text[]; aid uuid; br public.booking_requests; i public.invoices; u public.usage_extras; rate public.rate_card; st public.stay_charge_periods; lp public.lift_passes; tr public.travel_records; si public.attendee_service_items; proposed jsonb; request_patch jsonb; request_fields text[];
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
   when 'transfer_review' then array['billing_reviewed','billing_review_notes']
   when 'hotels' then array['actual_check_in','actual_check_out','billing_from','billing_to','rate_code','protocol_confirmed']
   when 'lift_passes' then array['required','start_date','end_date','carre_neige_required','chargeable','rate_code','protocol_confirmed','notes']
   when 'transport' then array['method_of_transport','airport_station','flight_travel_number','travel_datetime','resort_datetime','transfer_requested','transfer_service','transfer_chargeable','special_transfer_datetime','assignment_notes','protocol_confirmed']
   else array['service_date','title','status','quantity','chargeable','rate_code','attendee_details','protocol_notes'] end;
  if exists(select 1 from jsonb_object_keys(p_patch)k where not k=any(allowed)) then raise exception 'Unsupported operational field'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tab) into oldrow using p_id;
  if md5(oldrow::text) is distinct from p_version then raise exception 'Record changed; refresh before saving'; end if;
  if p_sheet='transfer_review' then
   tr:=jsonb_populate_record(null::public.travel_records,oldrow||p_patch);
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
  allowed:=array['category','title_rank','first_name','surname','post_nominals','email','mobile','service','discipline','position_role','dietary_requirements','date_of_birth','equipment_hire_required','boot_size'];
  if tab='attendees' then allowed:=allowed||array['known_as','display_company','attendee_notes','protocol_notes'];
  else allowed:=allowed||array['other_information','accommodation_required','accommodation_from','accommodation_to','hotel_preference','room_share_requested','room_share_with','room_sharing_option','dinners_with_guests','arrival_method','arrival_airport_station','arrival_flight_number','arrival_datetime','arrival_resort_datetime','arrival_transfer_requested','arrival_special_transfer_datetime','departure_method','departure_airport_station','departure_flight_number','departure_datetime','departure_resort_datetime','departure_transfer_requested','departure_special_transfer_datetime','lift_pass_required','first_ski_day','last_ski_day','carre_neige_requested','lessons_required','lesson_type','lesson_dates','arrival_details','departure_details','in_resort_details']; end if;
  request_fields:=array['other_information','accommodation_required','accommodation_from','accommodation_to','hotel_preference','room_share_requested','room_share_with','room_sharing_option','dinners_with_guests','arrival_method','arrival_airport_station','arrival_flight_number','arrival_datetime','arrival_resort_datetime','arrival_transfer_requested','arrival_special_transfer_datetime','departure_method','departure_airport_station','departure_flight_number','departure_datetime','departure_resort_datetime','departure_transfer_requested','departure_special_transfer_datetime','lift_pass_required','first_ski_day','last_ski_day','carre_neige_requested','lessons_required','lesson_type','lesson_dates','arrival_details','departure_details','in_resort_details'];
  if tab='attendees' and rec->>'registration_id' is not null then allowed:=allowed||request_fields; end if;
  if exists(select 1 from jsonb_object_keys(p_patch)k where not k=any(allowed)) then raise exception 'Field is not editable here; use the operational approval workflow for confirmed services'; end if;
  if p_patch ? 'email' and coalesce(p_patch->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Valid email required'; end if;
  if (p_patch ? 'first_name' and btrim(coalesce(p_patch->>'first_name',''))='') or (p_patch ? 'surname' and btrim(coalesce(p_patch->>'surname',''))='') then raise exception 'Name is required'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tab) into oldrow using p_id;
  if (rec->>'entity'='booking_requests' and md5(oldrow::text)<>p_version) or (rec->>'entity'='attendees' and md5(oldrow::text||coalesce((select to_jsonb(b)::text from public.booking_requests b where b.attendee_id=p_id order by b.updated_at desc,b.id limit 1),''))<>p_version) then raise exception 'Record changed; refresh before saving'; end if;
  if tab='attendees' and rec->>'registration_id' is not null then
   select coalesce(jsonb_object_agg(k,v),'{}') into request_patch from jsonb_each(p_patch)e(k,v) where k=any(request_fields);
   if request_patch<>'{}' then
    select * into br from public.booking_requests where id=(rec->>'registration_id')::uuid for update;
    if md5(oldrow::text||to_jsonb(br)::text)<>p_version then raise exception 'Record changed; refresh before saving'; end if;
    select string_agg(format('%I = v.%I',k,k),',') into assignments from jsonb_object_keys(request_patch)k;
    execute format('update public.booking_requests t set %s,updated_at=clock_timestamp() from jsonb_populate_record(null::public.booking_requests,$1) v where t.id=$2',assignments) using request_patch,br.id;
    insert into public.workspace_audit(event_id,actor_id,entity,record_id,before_data,after_data,reason) values(p_event_id,auth.uid(),'booking_requests',br.id,to_jsonb(br),(select to_jsonb(b) from public.booking_requests b where b.id=br.id),p_reason);
    p_patch:=p_patch-request_fields;
   end if;
  end if;
  select string_agg(format('%I = v.%I',k,k),',') into assignments from jsonb_object_keys(p_patch)k;
  if assignments is not null then
  execute format('update public.%I t set %s,updated_at=clock_timestamp() from jsonb_populate_record(null::public.%I,$1) v where t.id=$2 returning to_jsonb(t)',tab,assignments,tab) into afterrow using p_patch,p_id;
  else afterrow:=oldrow; end if;
  if tab='attendees' then update public.attendees set data_checked=false,checked_by=null,checked_at=null where id=p_id; end if;
 elsif p_sheet='charges' then
  if rec->>'entity'<>'usage' then raise exception 'Hotel and lift charges follow confirmed operational dates and rates; amend those in Protocol'; end if;
  if (rec->>'locked')::boolean then raise exception 'Confirmed invoice charges are immutable; use an adjustment'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch)k where k not in ('quantity','rate_code','notes')) then raise exception 'Unsupported charge field'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'A reason is required for charge amendments'; end if;
  select * into u from public.usage_extras where id=p_id for update; oldrow:=to_jsonb(u); aid:=u.attendee_id;
  if private.billing_charge_signature(aid) is distinct from p_version then raise exception 'Record changed; refresh before saving'; end if;
  if u.category in ('admin','transfer') then raise exception 'Choose the transfer/admin package in the Billing worksheet'; end if;
  u:=jsonb_populate_record(u,p_patch);
  if u.quantity<=0 then raise exception 'Quantity must be greater than zero'; end if;
  select * into rate from public.rate_card where event_id=p_event_id and rate_code=u.rate_code and active and status='approved';
  if rate.id is null or rate.charge_category<>u.category then raise exception 'Choose an approved rate in the same charge category'; end if;
  update public.usage_extras set quantity=u.quantity,rate_code=u.rate_code,notes=u.notes,updated_at=clock_timestamp() where id=p_id returning to_jsonb(usage_extras) into afterrow;
  update public.attendee_service_items set quantity=u.quantity,rate_code=u.rate_code,updated_at=clock_timestamp() where usage_extra_id=p_id;
  update public.attendees set data_checked=false,checked_by=null,checked_at=null where id=aid;
  update public.invoices set status='awaiting_billing_update',updated_at=clock_timestamp() where status in ('draft','ready_for_review') and id in(select invoice_id from public.invoice_lines where attendee_id=aid);
 elsif p_sheet='invoices' then
  if exists(select 1 from jsonb_object_keys(p_patch)k where k not in ('payment_link','purchase_order_reference','due_date','notes')) then raise exception 'Unsupported invoice field'; end if;
  if p_patch ? 'payment_link' and coalesce(p_patch->>'payment_link','')<>'' and (p_patch->>'payment_link' !~ '^https://[^[:space:]]+$' or length(p_patch->>'payment_link')>2000) then raise exception 'Payment link must be a valid HTTPS URL'; end if;
  select * into i from public.invoices where id=p_id for update; oldrow:=to_jsonb(i); if md5(oldrow::text) is distinct from p_version then raise exception 'Record changed; refresh before saving'; end if; i:=jsonb_populate_record(i,p_patch);
  perform public.save_finance_invoice_metadata(i.id,i.purchase_order_reference,i.payment_link,i.due_date,i.payment_terms_days,i.notes);
  select to_jsonb(x) into afterrow from public.invoices x where id=p_id;
 else raise exception 'Unsupported edit'; end if;
 insert into public.workspace_audit(event_id,actor_id,entity,record_id,before_data,after_data,reason) values(p_event_id,auth.uid(),p_sheet,p_id,oldrow,afterrow,p_reason);
end $$;

create function public.bulk_billing_action(p_event_id uuid,p_action text,p_ids uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare id uuid; ids uuid[]; result jsonb:='[]'; a public.attendees;
begin
 perform private.require_workspace(p_event_id,'billing',true);
 if coalesce(cardinality(p_ids),0) not between 1 and 200 then raise exception 'Select between 1 and 200 records'; end if;
 if p_action not in ('generate','check','confirm') then raise exception 'Unsupported action'; end if;
 perform pg_advisory_xact_lock(hashtext(p_event_id::text),3501);
 for id in select distinct unnest(p_ids) loop
  begin
   if p_action='confirm' then
    if not exists(select 1 from public.invoices where invoices.id=id and event_id=p_event_id) then raise exception 'Invoice outside working event'; end if;
    perform public.advance_finance_invoice(id,'approved',null,null,null); ids:=array[id];
   else
    select * into a from public.attendees where attendees.id=id and event_id=p_event_id;
    if a.id is null then raise exception 'Attendee outside working event'; end if;
    if p_action='check' then perform public.mark_finance_attendee_checked(id,false,null); ids:='{}';
    elsif exists(select 1 from public.attendee_billing_plans where attendee_id=id) then select array_agg(value::uuid) into ids from jsonb_array_elements_text(public.create_attendee_billing_drafts(id));
    elsif a.consolidated_invoice_included and a.billing_account_organisation_id is not null then ids:=array[public.create_finance_consolidated_draft(p_event_id,a.billing_account_organisation_id)];
    else ids:=array[public.create_finance_individual_draft(id)]; end if;
   end if;
   result:=result||jsonb_build_object('id',id,'ok',true,'invoice_ids',ids);
  exception when others then result:=result||jsonb_build_object('id',id,'ok',false,'error',sqlerrm); end;
 end loop;
 return result;
end $$;

create function public.export_bulk_workspace(p_event_id uuid,p_sheet text,p_format text,p_ids uuid[],p_columns text[],p_filters jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare rows jsonb; audit uuid;
begin
 perform private.require_workspace(p_event_id,p_sheet);
 if p_sheet in ('registrations','hotels','lift_passes','transport','services') then perform private.require_report(p_event_id,case when p_sheet in ('hotels','lift_passes','transport') then p_sheet else 'master' end,true); end if;
 if p_format not in ('csv','xlsx') or cardinality(p_columns)<1 then raise exception 'Invalid export'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',value->'id')||coalesce((select jsonb_object_agg(c,case when c like 'submitted_%' then value->'requested'->substring(c from 11) else value->c end) from unnest(p_columns)c),'{}')),'[]') into rows from jsonb_array_elements(public.get_bulk_workspace(p_event_id,p_sheet)) where (value->>'id')::uuid=any(p_ids);
 insert into public.report_export_audit(event_id,actor_id,report_key,format,filters,columns,row_count,row_ids) values(p_event_id,auth.uid(),'workspace_'||p_sheet,p_format,p_filters,to_jsonb(p_columns),jsonb_array_length(rows),coalesce((select jsonb_agg(value->'id') from jsonb_array_elements(rows)),'[]')) returning id into audit;
 return jsonb_build_object('rows',rows,'audit_id',audit);
end $$;

-- Names belong to the confirmed document, not a later edit of an attendee.
alter table public.invoice_lines add column attendee_name_snapshot text;
create function private.snapshot_line_attendee() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.attendee_id is not null then select concat_ws(' ',first_name,surname) into new.attendee_name_snapshot from public.attendees where id=new.attendee_id; end if;
 return new;
end $$;
create trigger snapshot_line_attendee before insert on public.invoice_lines for each row execute function private.snapshot_line_attendee();
create function private.snapshot_invoice_attendee_names() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and old.status not in ('approved','issued','paid') then
  update public.invoice_lines l set attendee_name_snapshot=concat_ws(' ',a.first_name,a.surname) from public.attendees a where l.invoice_id=old.id and l.attendee_id=a.id;
 end if;
 return new;
end $$;
create trigger snapshot_invoice_attendee_names before update on public.invoices for each row execute function private.snapshot_invoice_attendee_names();
revoke all on function private.snapshot_invoice_attendee_names() from public,anon,authenticated;

do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('get_bulk_workspace','save_bulk_cell','bulk_billing_action','export_bulk_workspace') loop
 execute format('revoke all on function %s from public,anon',f.sig); execute format('grant execute on function %s to authenticated',f.sig);
 end loop;
end $$;
revoke all on function private.require_workspace(uuid,text,boolean),private.snapshot_line_attendee() from public,anon,authenticated;

create table public.invoice_dispatch_jobs (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), invoice_id uuid not null references public.invoices(id),
 requested_by uuid not null references auth.users(id), capture_only boolean not null, recipient_email text not null, subject text not null,
 status text not null default 'queued' check(status in ('queued','processing','accepted','failed','unknown','captured')),
 error_message text, delivery_id uuid references public.invoice_deliveries(id), captured_payload jsonb, pdf_sha256 text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(invoice_id,capture_only)
);
alter table public.invoice_dispatch_jobs enable row level security;
revoke all on public.invoice_dispatch_jobs from public,anon,authenticated;
grant select on public.invoice_dispatch_jobs to authenticated;
grant all on public.invoice_dispatch_jobs to service_role;
create policy dispatch_read on public.invoice_dispatch_jobs for select to authenticated using(private.has_staff_role(array['admin','finance']) and private.can_access_replay(event_id));

create function public.queue_invoice_dispatch(p_event_id uuid,p_ids uuid[],p_capture boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare id uuid; i public.invoices; job public.invoice_dispatch_jobs; result jsonb:='[]'; test boolean;
begin
 perform private.require_workspace(p_event_id,'invoices',true);
 select is_test into test from public.events where events.id=p_event_id;
 if p_capture and not test then raise exception 'Capture is restricted to isolated test events'; end if;
 if not p_capture and exists(select 1 from public.events where events.id=p_event_id and (is_test or delivery_disabled)) then raise exception 'External delivery is disabled for this event'; end if;
 if coalesce(cardinality(p_ids),0) not between 1 and 200 then raise exception 'Select between 1 and 200 invoices'; end if;
 for id in select distinct unnest(p_ids) loop
  begin
   select * into i from public.invoices where invoices.id=id and event_id=p_event_id for update;
   if i.id is null or i.status not in ('approved','issued') then raise exception 'Confirm invoice before dispatch'; end if;
   if coalesce(i.recipient_email_snapshot,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invoice has no valid recipient email'; end if;
   if nullif(btrim(i.payment_instructions_snapshot),'') is null then raise exception 'Payment instructions are missing'; end if;
   insert into public.invoice_dispatch_jobs(event_id,invoice_id,requested_by,capture_only,recipient_email,subject)
   values(p_event_id,id,auth.uid(),p_capture,i.recipient_email_snapshot,'ISSSC invoice '||i.invoice_reference)
   on conflict(invoice_id,capture_only) do update set status='queued',error_message=null,recipient_email=excluded.recipient_email,subject=excluded.subject,updated_at=clock_timestamp()
   where invoice_dispatch_jobs.status='failed' and not exists(select 1 from public.invoice_deliveries d where d.invoice_id=id and d.delivery_status<>'failed');
   select * into job from public.invoice_dispatch_jobs where invoice_id=id and capture_only=p_capture;
   result:=result||jsonb_build_object('id',id,'ok',true,'job',to_jsonb(job));
  exception when others then result:=result||jsonb_build_object('id',id,'ok',false,'error',sqlerrm); end;
 end loop;
 return result;
end $$;

-- Service-only atomic claim. A stalled attempt is uncertain, never automatically resent.
create function public.claim_invoice_dispatch_service(p_job_id uuid,p_actor_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.invoice_dispatch_jobs;
begin
 perform private.require_actor_role(p_actor_id,array['admin','finance']);
 select * into j from public.invoice_dispatch_jobs where id=p_job_id for update;
 if j.id is null then raise exception 'Dispatch job not found'; end if;
 if exists(select 1 from public.events where id=j.event_id and is_test) and not exists(select 1 from public.profiles where id=p_actor_id and app_role='admin' and active) then raise exception 'Test event is Admin only'; end if;
 if j.status<>'queued' then return jsonb_build_object('claimed',false,'job',to_jsonb(j)); end if;
 update public.invoice_dispatch_jobs set status='processing',updated_at=clock_timestamp() where id=j.id returning * into j;
 return jsonb_build_object('claimed',true,'job',to_jsonb(j));
end $$;

create function public.claim_invoice_delivery_service(p_invoice_id uuid,p_actor_id uuid,p_recipient text,p_subject text) returns uuid language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare i public.invoices; id uuid;
begin
 perform private.require_actor_role(p_actor_id,array['admin','finance']);
 select * into i from public.invoices where invoices.id=p_invoice_id for update;
 if i.id is null or i.status not in ('approved','issued') then raise exception 'Confirm invoice before dispatch'; end if;
 if exists(select 1 from public.events where events.id=i.event_id and (is_test or delivery_disabled)) then raise exception 'External delivery is disabled for this event'; end if;
 if exists(select 1 from public.invoice_deliveries where invoice_id=i.id and delivery_status<>'failed') then raise exception 'Already sent or an attempt is unresolved. Check the delivery record before resending'; end if;
 insert into public.invoice_deliveries(invoice_id,event_id,recipient_name,recipient_email,subject,requested_by) values(i.id,i.event_id,i.recipient_name_snapshot,p_recipient,p_subject,p_actor_id) returning invoice_deliveries.id into id;
 return id;
end $$;

create function private.freeze_queued_invoice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.payment_link,new.purchase_order_reference,new.notes,new.due_date,new.recipient_email_snapshot) is distinct from (old.payment_link,old.purchase_order_reference,old.notes,old.due_date,old.recipient_email_snapshot)
 and (exists(select 1 from public.invoice_dispatch_jobs where invoice_id=old.id and status in ('queued','processing','accepted','unknown','captured')) or exists(select 1 from public.invoice_deliveries where invoice_id=old.id and delivery_status<>'failed')) then raise exception 'Dispatch has started; invoice delivery details are frozen'; end if;
 return new;
end $$;
create trigger freeze_queued_invoice before update on public.invoices for each row execute function private.freeze_queued_invoice();
revoke all on function private.freeze_queued_invoice() from public,anon,authenticated;
revoke all on function public.queue_invoice_dispatch(uuid,uuid[],boolean) from public,anon;
grant execute on function public.queue_invoice_dispatch(uuid,uuid[],boolean) to authenticated;
revoke all on function public.claim_invoice_dispatch_service(uuid,uuid),public.claim_invoice_delivery_service(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_invoice_dispatch_service(uuid,uuid),public.claim_invoice_delivery_service(uuid,uuid,text,text) to service_role;
commit;
