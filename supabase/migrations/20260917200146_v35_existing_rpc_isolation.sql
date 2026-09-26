begin;
-- Existing SECURITY DEFINER routines bypass RLS. Add event checks to their entry points,
-- preserving their signatures and implementation. Applies only to v34 routines.
do $$
declare f record; definition text; checks text; arg text; target text;
begin
 for f in select p.oid,p.proname,p.proargnames from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
 where n.nspname='public' and l.lanname='plpgsql' and p.prokind='f' and p.prorettype<>'trigger'::regtype
 and p.proname not in ('get_staff_report','export_staff_report','request_lift_change','review_lift_change','admin_set_report_permission') loop
 checks:='';
 foreach arg in array coalesce(f.proargnames,array[]::text[]) loop
 target:=case arg
 when 'p_event_id' then 'p_event_id'
 when 'p_source_event_id' then 'p_source_event_id'
 when 'p_attendee_id' then '(select event_id from public.attendees where id=p_attendee_id)'
 when 'p_lift_pass_id' then '(select a.event_id from public.lift_passes x join public.attendees a on a.id=x.attendee_id where x.id=p_lift_pass_id)'
 when 'p_invoice_id' then '(select event_id from public.invoices where id=p_invoice_id)'
 when 'p_request_id' then case when f.proname='accept_booking_request_service' then '(select event_id from public.booking_requests where id=p_request_id)' else '(select event_id from public.room_allocation_requests where id=p_request_id)' end
 when 'p_submission_id' then '(select event_id from public.intake_submissions where id=p_submission_id)'
 when 'p_event_sponsor_id' then '(select event_id from public.event_sponsors where id=p_event_sponsor_id)'
 when 'p_seating_table_id' then '(select event_id from public.seating_tables where id=p_seating_table_id)'
 when 'p_hotel_room_id' then '(select event_id from public.hotel_rooms where id=p_hotel_room_id)'
 when 'p_travel_id' then '(select a.event_id from public.travel_records x join public.attendees a on a.id=x.attendee_id where x.id=p_travel_id)'
 when 'p_item_id' then '(select a.event_id from public.attendee_service_items x join public.attendees a on a.id=x.attendee_id where x.id=p_item_id)'
 when 'p_transfer_run_id' then '(select event_id from public.transfer_runs where id=p_transfer_run_id)'
 else null end;
 if target is not null then checks:=checks||format(E'\n if not private.can_access_replay(%s) then raise exception ''Test event is Admin only'' using errcode=''42501''; end if;\n',target);end if;
 end loop;
 if checks<>'' then
 definition:=pg_get_functiondef(f.oid);
 definition:=regexp_replace(definition,E'\\mbegin\\M','begin'||checks,'i');
 execute definition;
 end if;
 end loop;
end $$;
create or replace function public.get_registration_sponsors_v2(p_event_id uuid) returns table(sponsor_name text)
language sql security definer set search_path='' as $$
 select o.organisation_name from public.event_sponsors es join public.organisations o on o.id=es.organisation_id
 where es.event_id=p_event_id and private.can_access_replay(p_event_id) and es.active and o.active and es.sponsor_status='confirmed' and lower(o.organisation_name)<>'other'
 order by lower(o.organisation_name),o.organisation_name;
$$;
commit;
