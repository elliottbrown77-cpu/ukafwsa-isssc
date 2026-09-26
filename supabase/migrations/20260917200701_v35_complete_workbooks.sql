begin;
create function public.export_master_workbook(p_event_id uuid,p_filters jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare people uuid[]; master jsonb; k text; rows jsonb; aid uuid; columns jsonb; result jsonb:='[]';
begin
 perform private.require_report(p_event_id,'master',true);
 master:=public.get_staff_report(p_event_id,'master',p_filters);
 select array_agg((r->>'attendee_id')::uuid) into people from jsonb_array_elements(master) r;
 foreach k in array array['master','hotels','lift_passes','equipment','lessons','transport','services','finance'] loop
 if k='master' then rows:=master;
 else select coalesce(jsonb_agg(r),'[]') into rows from private.report_rows(p_event_id,k) r where (r->>'attendee_id')::uuid=any(people);end if;
 select coalesce(jsonb_agg(key order by key),'["id"]') into columns from (select distinct jsonb_object_keys(r) key from jsonb_array_elements(rows) r) x;
 insert into public.report_export_audit(event_id,actor_id,report_key,format,filters,columns,row_count,row_ids)
 values(p_event_id,auth.uid(),k,'xlsx',p_filters,columns,jsonb_array_length(rows),coalesce((select jsonb_agg(r->'id') from jsonb_array_elements(rows)r),'[]')) returning id into aid;
 result:=result||jsonb_build_array(jsonb_build_object('name',k,'rows',rows,'columns',columns,'audit_id',aid));
 end loop;
 return result;
end $$;
revoke all on function public.export_master_workbook(uuid,jsonb) from public,anon;
grant execute on function public.export_master_workbook(uuid,jsonb) to authenticated;
commit;
