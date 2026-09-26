-- Preserve safe defaults for ordinary signups not on a staff allowlist.
begin;
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attendee uuid;
  v_role text:='attendee';
  v_active boolean:=true;
  v_display_name text;
begin
  if new.email is not null then
    select a.app_role,a.active,a.display_name
    into v_role,v_active,v_display_name
    from private.staff_access_allowlist a
    where a.email=lower(new.email)
    limit 1;

    -- SELECT INTO clears the initial values when no allowlist row matches.
    if not found then
      v_role:='attendee';v_active:=true;
      if exists(select 1 from private.initial_admin_allowlist x where x.active and lower(x.email)=lower(new.email)) then
        v_role:='admin';
      end if;
    end if;
  end if;

  insert into public.profiles(id,display_name,email,app_role,active)
  values(
    new.id,
    coalesce(v_display_name,new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1)),
    new.email,v_role,v_active
  )
  on conflict(id) do update set
    email=excluded.email,
    display_name=coalesce(v_display_name,public.profiles.display_name),
    app_role=case when v_role<>'attendee' then v_role else public.profiles.app_role end,
    active=case when v_role<>'attendee' then v_active else public.profiles.active end,
    updated_at=now();

  if new.email is not null then
    update public.booking_requests
    set user_id=new.id,updated_at=now()
    where user_id is null and lower(email)=lower(new.email)
      and status in ('draft','submitted','accepted');

    insert into public.user_attendee_links(user_id,attendee_id,event_id,link_source)
    select new.id,a.id,a.event_id,'email_match'
    from public.attendees a where lower(a.email)=lower(new.email)
    on conflict do nothing;

    select a.id into v_attendee
    from public.attendees a
    join public.events e on e.id=a.event_id
    where lower(a.email)=lower(new.email)
    order by e.active desc,e.event_year desc limit 1;

    if v_attendee is not null then
      update public.profiles set attendee_id=v_attendee,updated_at=now() where id=new.id;
    end if;
  end if;
  return new;
end;
$function$
;
commit;
