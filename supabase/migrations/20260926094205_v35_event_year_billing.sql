begin;
-- The previous waiver path hard-coded a 2027 rate, which prevents historic replay.
do $$
declare def text;
begin
 select pg_get_functiondef('public.save_finance_transfer_package(uuid,text,boolean,text)'::regprocedure) into def;
 def:=replace(def,'''2027_ADMIN_ONLY''','(select event_year::text||''_ADMIN_ONLY'' from public.events where id=v_event_id)');
 execute def;
end $$;
-- Views must respect underlying event-isolation policies rather than their owner's privileges.
do $$ declare v record; begin
 for v in select viewname from pg_views where schemaname='public' loop
 execute format('alter view public.%I set (security_invoker=true)',v.viewname);
 end loop;
end $$;
commit;
