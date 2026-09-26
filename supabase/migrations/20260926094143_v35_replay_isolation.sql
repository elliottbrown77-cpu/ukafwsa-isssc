begin;
create function private.replay_event_id(p_table text,p_row jsonb) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare eid uuid; k text; t text;
begin
 if p_table='events' then return (p_row->>'id')::uuid; end if;
 if p_row ? 'event_id' then return (p_row->>'event_id')::uuid; end if;
 if p_row->>'attendee_id' is not null then select event_id into eid from public.attendees where id=(p_row->>'attendee_id')::uuid;return eid; end if;
 if p_row->>'invoice_id' is not null then select event_id into eid from public.invoices where id=(p_row->>'invoice_id')::uuid;return eid; end if;
 if p_row->>'transfer_run_id' is not null then select event_id into eid from public.transfer_runs where id=(p_row->>'transfer_run_id')::uuid;return eid; end if;
 for k,t in select * from (values ('event_sponsor_id','event_sponsors'),('seating_table_id','seating_tables'),('table_plan_id','table_plans')) x(k,t) loop
 if p_row->>k is not null then execute format('select event_id from public.%I where id=$1',t) into eid using (p_row->>k)::uuid;return eid;end if;
 end loop;
 return null;
end $$;
create function private.can_access_replay(p_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.events where id=p_event and is_test) or private.has_staff_role(array['admin']);
$$;
create function private.guard_replay_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare eid uuid; old_eid uuid; rowdata jsonb; parent_key text; parent_table text; parent_eid uuid;
begin
 rowdata:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 eid:=private.replay_event_id(tg_table_name,rowdata);
 if tg_op='UPDATE' then old_eid:=private.replay_event_id(tg_table_name,to_jsonb(old));end if;
 if not private.can_access_replay(eid) or (old_eid is not null and not private.can_access_replay(old_eid)) then raise exception 'Test event is Admin only' using errcode='42501';end if;
 if tg_table_name='events' and tg_op='UPDATE' and coalesce((to_jsonb(old)->>'is_test')::boolean,false) and not coalesce((to_jsonb(new)->>'is_test')::boolean,false) then raise exception 'Test events cannot become live events';end if;
 if tg_table_name='events' and tg_op='INSERT' and coalesce((to_jsonb(new)->>'is_test')::boolean,false) and not private.has_staff_role(array['admin']) then raise exception 'Test event is Admin only';end if;
 -- Prevent an Admin accidentally joining test records to live parents.
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
-- Restrictive policies compose with existing permissions; triggers also cover SECURITY DEFINER writers.
do $$
declare t text; expr text;
begin
 for t in select tablename from pg_tables where schemaname='public' and tablename not in ('audit_log','profiles','report_export_audit') and (tablename='events' or exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=tablename and c.column_name in ('event_id','attendee_id','invoice_id','transfer_run_id','event_sponsor_id','seating_table_id','table_plan_id'))) loop
 expr:=case when t='events' then 'id' when exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='event_id') then 'event_id' else format('private.replay_event_id(%L,to_jsonb(%I.*))',t,t) end;
 execute format('create policy v35_test_isolation on public.%I as restrictive for all to anon,authenticated using(private.can_access_replay(%s)) with check(private.can_access_replay(%s))',t,expr,expr);
 execute format('create trigger v35_replay_write before insert or update or delete on public.%I for each row execute function private.guard_replay_write()',t);
 end loop;
end $$;
-- Historic 2026 data contains standard passes without Carre Neige. Only replay records can retain that historic fact.
create function private.is_replay_attendee(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.attendees a join public.events e on e.id=a.event_id where a.id=p_id and e.is_test);
$$;
alter table public.lift_passes drop constraint lift_passes_required_carre_neige_check;
alter table public.lift_passes add constraint lift_passes_required_carre_neige_check check(not required or carre_neige_required or private.is_replay_attendee(attendee_id));
revoke all on function private.replay_event_id(text,jsonb),private.can_access_replay(uuid),private.is_replay_attendee(uuid),private.guard_replay_write() from public,anon,authenticated;
grant execute on function private.replay_event_id(text,jsonb),private.can_access_replay(uuid),private.is_replay_attendee(uuid) to anon,authenticated;
commit;
