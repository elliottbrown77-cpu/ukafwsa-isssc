-- v35. Apply only after staging verification. No historic personal data is embedded.
begin;
alter table public.events add column is_test boolean not null default false;
alter table public.events add column delivery_disabled boolean not null default false;
alter table public.events add constraint test_event_delivery_disabled check (not is_test or (delivery_disabled and not active and invoice_prefix like 'TEST-%'));

create table public.report_permissions (
 event_id uuid not null references public.events(id), user_id uuid not null references public.profiles(id),
 report_key text not null check(report_key in ('master','hotels','lift_passes','equipment','lessons','transport')),
 can_export boolean not null default false, primary key(event_id,user_id,report_key)
);
create table public.report_export_audit (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), actor_id uuid not null references public.profiles(id),
 report_key text not null, format text not null check(format in ('csv','xlsx')), filters jsonb not null, columns jsonb not null,
 row_count integer not null, row_ids jsonb not null, exported_at timestamptz not null default now()
);
create table public.lift_change_requests (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), lift_pass_id uuid not null references public.lift_passes(id),
 attendee_id uuid not null references public.attendees(id), before_data jsonb not null, proposed_data jsonb not null,
 justification text not null check(length(btrim(justification)) between 1 and 4000), requested_by uuid not null references public.profiles(id), requested_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, review_note text,
 after_data jsonb, finance_action text
);
create unique index one_pending_lift_change on public.lift_change_requests(lift_pass_id) where status='pending';
create table private.lift_approval_context (transaction_id bigint not null, lift_pass_id uuid not null, primary key(transaction_id,lift_pass_id));
revoke all on private.lift_approval_context from public,anon,authenticated;

alter table public.report_permissions enable row level security;
alter table public.report_export_audit enable row level security;
alter table public.lift_change_requests enable row level security;
revoke all on public.report_permissions,public.report_export_audit,public.lift_change_requests from public,anon,authenticated;
grant select on public.report_permissions,public.report_export_audit,public.lift_change_requests to authenticated;
create policy report_permissions_read on public.report_permissions for select to authenticated using (private.has_staff_role(array['admin']) or (user_id=auth.uid() and private.has_staff_role(array['protocol','operations','finance','sponsor_manager','read_only','content_manager'])));
create policy export_audit_admin on public.report_export_audit for select to authenticated using(private.has_staff_role(array['admin']));
create policy change_request_read on public.lift_change_requests for select to authenticated using(private.has_staff_role(array['admin']) or (requested_by=auth.uid() and private.has_staff_role(array['protocol','operations'])));

create function private.require_report(p_event uuid,p_report text,p_export boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare r text; test boolean;
begin
 select app_role into r from public.profiles where id=auth.uid() and active;
 if auth.uid() is null or r is null or r='attendee' then raise exception 'Staff access required' using errcode='42501'; end if;
 select is_test into test from public.events where id=p_event;
 if test is null then raise exception 'Event not found'; end if;
 if test and r<>'admin' then raise exception 'Test event is Admin only' using errcode='42501'; end if;
 if p_report not in ('master','hotels','lift_passes','equipment','lessons','transport') then raise exception 'Unknown report'; end if;
 if r='admin' then return; end if;
 if p_report='transport' and r in ('protocol','operations') then return; end if;
 if exists(select 1 from public.report_permissions where event_id=p_event and user_id=auth.uid() and report_key=p_report and (not p_export or can_export)) then return; end if;
 raise exception 'Report permission required' using errcode='42501';
end $$;

create function public.admin_set_report_permission(p_event_id uuid,p_user_id uuid,p_report_key text,p_view boolean,p_export boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_actor_role(auth.uid(),array['admin']);
 if not exists(select 1 from public.profiles where id=p_user_id and active and app_role<>'attendee') then raise exception 'Active staff account required'; end if;
 if p_view then
 insert into public.report_permissions values(p_event_id,p_user_id,p_report_key,p_export) on conflict(event_id,user_id,report_key) do update set can_export=excluded.can_export;
 else delete from public.report_permissions where event_id=p_event_id and user_id=p_user_id and report_key=p_report_key; end if;
 insert into public.audit_log(table_name,record_id,action,actor_id,after_data) values('report_permissions',p_user_id,'UPDATE',auth.uid(),jsonb_build_object('event_id',p_event_id,'report',p_report_key,'view',p_view,'export',p_export));
end $$;

-- Explicit projections prevent a specialist report from acquiring financial or private fields.
create function private.report_rows(p_event uuid,p_report text) returns setof jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if p_report='master' then
 return query select jsonb_build_object('id',a.id,'attendee_id',a.id,'first_name',a.first_name,'surname',a.surname,'category',a.category,'company',a.display_company,'email',a.email,'mobile',a.mobile,'status',a.attendance_status,'date',(select min(s.actual_check_in) from public.stay_charge_periods s where s.attendee_id=a.id),
 'registration',(select i.raw_payload from public.intake_submissions i where i.mapped_attendee_id=a.id and i.event_id=p_event order by i.submitted_at desc limit 1),'role',a.position_role,'service',a.service,'dietary_requirements',a.dietary_requirements,'checked',a.data_checked,
 'hotels',(select string_agg(coalesce(l.name,s.requested_location,'Pending')||' '||coalesce(s.actual_check_in::text,'?')||' to '||coalesce(s.actual_check_out::text,'?'),'; ') from public.stay_charge_periods s left join public.accommodation_locations l on l.id=s.location_id where s.attendee_id=a.id),
 'lift_passes',(select string_agg(coalesce(p.start_date::text,'?')||' to '||coalesce(p.end_date::text,'?')||case when p.protocol_confirmed then ' confirmed' else ' pending' end,'; ') from public.lift_passes p where p.attendee_id=a.id),
 'services',(select string_agg(s.service_type||': '||s.title||' ('||s.status||')','; ') from public.attendee_service_items s where s.attendee_id=a.id),
 'transport',(select string_agg(t.direction||' '||coalesce(t.travel_datetime::text,'?')||' '||coalesce(t.airport_station,''),'; ') from public.travel_records t where t.attendee_id=a.id),
 'invoice_status',(select string_agg(distinct i.status,', ') from public.invoices i where i.event_id=a.event_id and (i.attendee_id=a.id or (a.consolidated_invoice_included and i.billing_account_organisation_id=a.billing_account_organisation_id))))
 from public.attendees a where a.event_id=p_event;
 elsif p_report='hotels' then
 return query select jsonb_build_object('id',coalesce(s.id,a.id),'attendee_id',a.id,'first_name',a.first_name,'surname',a.surname,'category',a.category,'company',a.display_company,
 'requested_hotel',s.requested_location,'hotel',l.name,'room_type',rt.name,'date',s.actual_check_in,'departure',s.actual_check_out,'requested_arrival',s.requested_check_in,'requested_departure',s.requested_check_out,'sharing_with',s.requested_share_with,
 'allocation_conflicts',(select count(*) from public.hotel_room_allocations h join public.hotel_rooms hr on hr.id=h.hotel_room_id where h.attendee_id=a.id and h.event_id=p_event and h.allocation_status='confirmed' and exists(select 1 from generate_series(h.check_in::timestamp,(h.check_out-1)::timestamp,interval '1 day') d where (select coalesce(sum(other.occupancy_count),0) from public.hotel_room_allocations other where other.hotel_room_id=h.hotel_room_id and other.allocation_status='confirmed' and other.check_in<=d::date and other.check_out>d::date)>hr.capacity)),'room_reference',(select string_agg(h.room_reference_snapshot,', ') from public.hotel_room_allocations h where h.attendee_id=a.id and h.event_id=p_event and h.allocation_status='confirmed'),
 'status',case when s.protocol_confirmed then 'confirmed' else 'pending' end)
 from public.attendees a left join public.stay_charge_periods s on s.attendee_id=a.id left join public.accommodation_locations l on l.id=s.location_id left join public.room_types rt on rt.id=s.room_type_id where a.event_id=p_event;
 elsif p_report='lift_passes' then
 return query select jsonb_build_object('id',coalesce(l.id,a.id),'attendee_id',a.id,'first_name',a.first_name,'surname',a.surname,'category',a.category,'company',a.display_company,'requested_start',(select i.raw_payload->>'first_ski_day' from public.intake_submissions i where i.mapped_attendee_id=a.id and i.event_id=p_event order by i.submitted_at desc limit 1),'requested_end',(select i.raw_payload->>'last_ski_day' from public.intake_submissions i where i.mapped_attendee_id=a.id and i.event_id=p_event order by i.submitted_at desc limit 1),'required',l.required,'pass_type',l.pass_type,'date',l.start_date,'end_date',l.end_date,'days',l.pass_days,'carre_neige',l.carre_neige_required,'status',case when l.protocol_confirmed then 'confirmed' else 'pending' end,'notes',l.notes)
 from public.attendees a left join public.lift_passes l on l.attendee_id=a.id where a.event_id=p_event;
 elsif p_report in ('equipment','lessons') then
 return query select jsonb_build_object('id',coalesce(s.id,a.id),'attendee_id',a.id,'first_name',a.first_name,'surname',a.surname,'category',a.category,'company',a.display_company,'title',coalesce(s.title,req.payload->>'lesson_type'),'requested_dates',case when p_report='lessons' then req.payload->>'lesson_dates' else null end,'date',s.service_date,'quantity',s.quantity,'details',s.attendee_details,'status',coalesce(s.status,'pending'))
 from public.attendees a left join lateral (select i.raw_payload payload from public.intake_submissions i where i.mapped_attendee_id=a.id and i.event_id=p_event order by i.submitted_at desc limit 1) req on true left join public.attendee_service_items s on s.attendee_id=a.id and s.service_type=case when p_report='equipment' then 'equipment_hire' else 'lesson' end
 where a.event_id=p_event and (s.id is not null or (p_report='equipment' and a.equipment_hire_required) or (p_report='lessons' and req.payload->>'lessons_required'='true'));
 elsif p_report='services' then
 return query select jsonb_build_object('id',s.id,'attendee_id',a.id,'first_name',a.first_name,'surname',a.surname,'service_type',s.service_type,'date',s.service_date,'title',s.title,'status',s.status,'quantity',s.quantity,'chargeable',s.chargeable,'rate_code',s.rate_code,'details',s.attendee_details,'protocol_notes',s.protocol_notes) from public.attendees a join public.attendee_service_items s on s.attendee_id=a.id where a.event_id=p_event;
 elsif p_report='finance' then
 return query select jsonb_build_object('id',l.id,'attendee_id',l.attendee_id,'invoice_reference',i.invoice_reference,'status',i.status,'description',l.description,'quantity',l.quantity,'unit_price',l.unit_price,'net',l.net_amount,'vat',l.vat_amount,'gross',l.gross_amount) from public.invoices i join public.invoice_lines l on l.invoice_id=i.id where i.event_id=p_event;
 elsif p_report='transport' then
 return query select jsonb_build_object('id',coalesce(t.id,a.id)::text||coalesce(':'||r.id::text,''),'attendee_id',a.id,'first_name',a.first_name,'surname',a.surname,'category',a.category,'company',a.display_company,'mobile',a.mobile,'direction',t.direction,'method',t.method_of_transport,'location',t.airport_station,'travel_number',t.flight_travel_number,'date',t.travel_datetime,'resort_time',t.resort_datetime,'transfer_requested',t.transfer_requested,'status',case when t.transfer_requested and r.id is null then 'unassigned' when t.protocol_confirmed then 'confirmed' else 'pending' end,'run',r.transfer_name,'run_time',r.departure_at,'pickup',r.pickup_location,'destination',r.destination,'driver',r.driver_name,'driver_mobile',r.driver_mobile,'lead_traveller',r.lead_traveller_name,'lead_mobile',r.lead_traveller_mobile,'capacity',r.capacity,'passengers',(select count(*) from public.transfer_passengers x where x.transfer_run_id=r.id),'vehicle',r.vehicle_details)
 from public.attendees a left join public.travel_records t on t.attendee_id=a.id
 left join public.transfer_passengers p on p.attendee_id=a.id and exists(select 1 from public.transfer_runs tr where tr.id=p.transfer_run_id and tr.event_id=p_event and tr.direction=t.direction and tr.status<>'cancelled')
 left join public.transfer_runs r on r.id=p.transfer_run_id and r.event_id=p_event
 where a.event_id=p_event;
 end if;
end $$;

create function private.filtered_report(p_event uuid,p_report text,p_filters jsonb) returns setof jsonb
language sql stable security definer set search_path='' as $$
 select r from private.report_rows(p_event,p_report) r
 where (coalesce(p_filters->>'search','')='' or position(lower(p_filters->>'search') in lower(r::text))>0)
 and (coalesce(p_filters->>'category','')='' or r->>'category'=p_filters->>'category')
 and (coalesce(p_filters->>'status','')='' or r->>'status'=p_filters->>'status')
 and (coalesce(p_filters->>'from','')='' or left(r->>'date',10)>=p_filters->>'from')
 and (coalesce(p_filters->>'to','')='' or left(r->>'date',10)<=p_filters->>'to')
 order by r->>'surname',r->>'first_name',r->>'id';
$$;
create function public.get_staff_report(p_event_id uuid,p_report_key text,p_filters jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_report(p_event_id,p_report_key);
 select coalesce(jsonb_agg(r),'[]') into result from private.filtered_report(p_event_id,p_report_key,p_filters) r;
 if jsonb_array_length(result)>10000 then raise exception 'Narrow the filters: report exceeds 10,000 rows'; end if;
 return result;
end $$;
create function public.export_staff_report(p_event_id uuid,p_report_key text,p_format text,p_filters jsonb,p_columns text[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rows jsonb; projected jsonb; aid uuid;
begin
 perform private.require_report(p_event_id,p_report_key,true);
 if p_format not in ('csv','xlsx') then raise exception 'Unsupported export format'; end if;
 if coalesce(cardinality(p_columns),0)=0 then raise exception 'Select at least one column'; end if;
 rows:=public.get_staff_report(p_event_id,p_report_key,p_filters);
 select coalesce(jsonb_agg((select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(r) where key=any(p_columns))),'[]') into projected from jsonb_array_elements(rows) r;
 insert into public.report_export_audit(event_id,actor_id,report_key,format,filters,columns,row_count,row_ids)
 values(p_event_id,auth.uid(),p_report_key,p_format,p_filters,to_jsonb(p_columns),jsonb_array_length(rows),coalesce((select jsonb_agg(r->'id') from jsonb_array_elements(rows) r),'[]')) returning id into aid;
 return jsonb_build_object('audit_id',aid,'rows',projected);
end $$;

create function private.guard_confirmed_lift() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.protocol_confirmed and (tg_op='DELETE' or (to_jsonb(new)-'updated_at') is distinct from (to_jsonb(old)-'updated_at')) then
 if not exists(select 1 from private.lift_approval_context where transaction_id=txid_current() and lift_pass_id=old.id) then
 raise exception 'Confirmed lift passes require a justified change request and Admin approval' using errcode='42501'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
-- Last BEFORE trigger checks computed charge changes as well as direct updates/deletes.
create trigger zz_guard_confirmed_lift before update or delete on public.lift_passes for each row execute function private.guard_confirmed_lift();

create function public.request_lift_change(p_lift_pass_id uuid,p_proposed jsonb,p_justification text) returns uuid
language plpgsql security definer set search_path='' as $$
declare l public.lift_passes; eid uuid; result uuid;
begin
 perform private.require_actor_role(auth.uid(),array['admin','protocol','operations']);
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
create function public.review_lift_change(p_request_id uuid,p_approve boolean,p_review_note text default '') returns void
language plpgsql security definer set search_path='' as $$
declare c public.lift_change_requests; l public.lift_passes; p jsonb; inv record; locked boolean:=false;
begin
 perform private.require_actor_role(auth.uid(),array['admin']);
 select * into c from public.lift_change_requests where id=p_request_id for update;
 if c.id is null or c.status<>'pending' then raise exception 'Pending request not found'; end if;
 if p_approve is null then raise exception 'Approval decision required'; end if;
 if not p_approve then
 if btrim(coalesce(p_review_note,''))='' then raise exception 'Rejection note required'; end if;
 update public.lift_change_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_review_note where id=c.id; return;
 end if;
 select * into l from public.lift_passes where id=c.lift_pass_id for update;
 if (to_jsonb(l)-'updated_at') is distinct from (c.before_data-'updated_at') then raise exception 'Lift pass changed since request; reject and submit a fresh request'; end if;
 p:=c.proposed_data;
 insert into private.lift_approval_context values(txid_current(),l.id);
 perform public.save_protocol_lift_pass(c.attendee_id,l.id,(p->>'required')::boolean,(p->>'start_date')::date,(p->>'end_date')::date,(p->>'carre_neige_required')::boolean,(p->>'chargeable')::boolean,p->>'rate_code',(p->>'protocol_confirmed')::boolean,p->>'notes');
 delete from private.lift_approval_context where transaction_id=txid_current() and lift_pass_id=l.id;
 for inv in select i.* from public.invoices i where i.event_id=c.event_id and (i.attendee_id=c.attendee_id or exists(select 1 from public.invoice_lines il where il.invoice_id=i.id and il.attendee_id=c.attendee_id) or exists(select 1 from public.attendees a where a.id=c.attendee_id and a.consolidated_invoice_included and a.billing_account_organisation_id=i.billing_account_organisation_id)) for update loop
 if inv.status in ('draft','awaiting_billing_update','ready_for_review') then
 if inv.invoice_type='individual' then perform public.rebuild_individual_invoice(inv.id); else perform public.rebuild_consolidated_invoice(inv.id); end if;
 elsif inv.status in ('approved','issued','paid') then locked:=true; end if;
 end loop;
 update public.lift_change_requests set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_review_note,
 after_data=(select to_jsonb(x) from public.lift_passes x where x.id=l.id),finance_action=case when locked then 'Finance adjustment required: locked invoice retained' else 'Open draft invoices recalculated' end where id=c.id;
end $$;

-- Restrict all new privileged entry points explicitly. Private helpers cannot be invoked by clients.
revoke all on function private.require_report(uuid,text,boolean),private.report_rows(uuid,text),private.filtered_report(uuid,text,jsonb),private.guard_confirmed_lift() from public,anon,authenticated;
revoke all on function public.admin_set_report_permission(uuid,uuid,text,boolean,boolean),public.get_staff_report(uuid,text,jsonb),public.export_staff_report(uuid,text,text,jsonb,text[]),public.request_lift_change(uuid,jsonb,text),public.review_lift_change(uuid,boolean,text) from public,anon;
grant execute on function public.admin_set_report_permission(uuid,uuid,text,boolean,boolean),public.get_staff_report(uuid,text,jsonb),public.export_staff_report(uuid,text,text,jsonb,text[]),public.request_lift_change(uuid,jsonb,text),public.review_lift_change(uuid,boolean,text) to authenticated;
commit;
