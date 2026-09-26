begin;

alter table public.events
  add column historical_read_only boolean not null default false;

alter table public.events
  add constraint historical_replay_read_only_guard
  check (not historical_read_only or (is_test and delivery_disabled and not active and event_year=2026));

create or replace function private.can_access_replay(p_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.events where id=p_event and is_test)
   or private.has_staff_role(array['admin'])
   or exists(
     select 1 from public.events e
     where e.id=p_event and e.is_test and e.historical_read_only
       and e.event_year=2026 and e.delivery_disabled and not e.active
       and private.has_staff_role(array['admin','sponsor_manager','protocol','finance','operations','content_manager','read_only'])
   );
$$;

create or replace function private.guard_replay_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare eid uuid; old_eid uuid; rowdata jsonb; parent_key text; parent_table text; parent_eid uuid;
begin
 rowdata:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 eid:=private.replay_event_id(tg_table_name,rowdata);
 if tg_op='UPDATE' then old_eid:=private.replay_event_id(tg_table_name,to_jsonb(old));end if;
 if not private.can_access_replay(eid) or (old_eid is not null and not private.can_access_replay(old_eid)) then raise exception 'Test event is Admin only' using errcode='42501';end if;
 if exists(select 1 from public.events where id=eid and historical_read_only) then raise exception 'Historical replay is read-only' using errcode='42501';end if;
 if tg_table_name='events' and tg_op='UPDATE' and coalesce((to_jsonb(old)->>'is_test')::boolean,false) and not coalesce((to_jsonb(new)->>'is_test')::boolean,false) then raise exception 'Test events cannot become live events';end if;
 if tg_table_name='events' and tg_op='INSERT' and coalesce((to_jsonb(new)->>'is_test')::boolean,false) and not private.has_staff_role(array['admin']) then raise exception 'Test event is Admin only';end if;
 if tg_op<>'DELETE' then
 for parent_key,parent_table in select * from (values ('attendee_id','attendees'),('invoice_id','invoices'),('transfer_run_id','transfer_runs'),('hotel_room_id','hotel_rooms'),('lead_traveller_attendee_id','attendees'),('sharing_with_attendee_id','attendees'),('linked_main_attendee_id','attendees'),('mapped_attendee_id','attendees'),('event_sponsor_id','event_sponsors'),('seating_table_id','seating_tables'),('table_plan_id','table_plans')) x(k,t) loop
  if rowdata->>parent_key is not null then
   execute format('select event_id from public.%I where id=$1',parent_table) into parent_eid using (rowdata->>parent_key)::uuid;
   if parent_eid is not null and parent_eid is distinct from eid and exists(select 1 from public.events where id in (eid,parent_eid) and is_test) then raise exception 'Test and live records cannot be linked';end if;
  end if;
 end loop;
 end if;
 if tg_op='UPDATE' and eid is distinct from old_eid and (exists(select 1 from public.events where id in (eid,old_eid) and is_test)) then raise exception 'Records cannot move between test and live events';end if;
 if exists(select 1 from public.events where id=eid and delivery_disabled) then
  if tg_table_name in ('invoice_deliveries','notification_deliveries','push_subscriptions','invitations') then raise exception 'External delivery is disabled for this test event';end if;
  if tg_table_name='announcements' and coalesce((rowdata->>'push_notification')::boolean,false) then raise exception 'Test notifications cannot be sent';end if;
  if tg_table_name='event_email_settings' and coalesce((rowdata->>'active')::boolean,false) then raise exception 'Test email cannot be enabled';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;

commit;
