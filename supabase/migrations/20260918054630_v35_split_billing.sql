begin;
-- Explicit, audited payer allocations. Existing invoices remain on the legacy path
-- until Finance deliberately saves a plan; no historic payer choices are inferred.
create table public.attendee_billing_plans(
 attendee_id uuid primary key references public.attendees(id), event_id uuid not null references public.events(id),
 organisation_id uuid references public.organisations(id), company_layout text not null check(company_layout in ('separate','combined')),
 allocations jsonb not null check(jsonb_typeof(allocations)='object'), charge_signature text not null,
 revision integer not null default 1, updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now()
);
create table public.billing_plan_audit(
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id),attendee_id uuid not null references public.attendees(id),
 actor_id uuid not null references auth.users(id),before_data jsonb,after_data jsonb not null,created_at timestamptz not null default now()
);
alter table public.attendee_billing_plans enable row level security;
alter table public.billing_plan_audit enable row level security;
revoke all on public.attendee_billing_plans,public.billing_plan_audit from public,anon,authenticated;
grant select on public.attendee_billing_plans,public.billing_plan_audit to authenticated;
create policy finance_plans_read on public.attendee_billing_plans for select to authenticated using(private.can_access_replay(event_id) and exists(select 1 from public.profiles where id=auth.uid() and active and app_role in ('admin','finance')));
create policy finance_plan_audit_read on public.billing_plan_audit for select to authenticated using(private.can_access_replay(event_id) and exists(select 1 from public.profiles where id=auth.uid() and active and app_role in ('admin','finance')));
alter table public.invoices add column billing_plan_managed boolean not null default false;
alter table public.invoices add column billing_plan_signature text;
create index billing_plans_company on public.attendee_billing_plans(event_id,organisation_id,company_layout);
create unique index billing_plan_draft_person on public.invoices(attendee_id,invoice_type) where billing_plan_managed and attendee_id is not null and status not in ('cancelled','void');
create unique index billing_plan_draft_company on public.invoices(event_id,billing_account_organisation_id) where billing_plan_managed and attendee_id is null and status not in ('cancelled','void');

create function private.billing_charges(p_attendee uuid) returns table(charge_key text,source_type text,source_id uuid,description text,quantity numeric,unit_price numeric,net_amount numeric,vat_rate numeric,vat_amount numeric,gross_amount numeric,rate_code text)
language sql stable security definer set search_path='' as $$
 with base as (
 select 'stay'::text typ,s.id,s.attendee_id,coalesce(r.description,'Accommodation') description,coalesce(s.billable_nights,0)::numeric qty,coalesce(s.unit_rate,0) price,coalesce(s.accommodation_charge,0) net,coalesce(r.vat_rate,0) vat,0::numeric extra,s.rate_code
 from public.stay_charge_periods s join public.attendees a on a.id=s.attendee_id left join public.rate_card r on r.event_id=a.event_id and r.rate_code=s.rate_code and r.active where s.attendee_id=p_attendee
 union all
 select 'lift_pass',l.id,l.attendee_id,coalesce(r.description,'Lift pass'),coalesce(l.pass_days,0),coalesce(l.unit_rate,0),coalesce(l.total_charge,0),coalesce(r.vat_rate,0),0,l.rate_code
 from public.lift_passes l join public.attendees a on a.id=l.attendee_id left join public.rate_card r on r.event_id=a.event_id and r.rate_code=l.rate_code and r.active where l.attendee_id=p_attendee
 union all
 select 'usage',u.id,u.attendee_id,coalesce(r.description,u.category),coalesce(u.quantity,0),coalesce(u.unit_rate,0),coalesce(u.total_charge,0),coalesce(r.vat_rate,0),case when coalesce(u.chargeable,true) then round(coalesce(u.quantity,0)*coalesce(v.unit_price,0),2) else 0 end,u.rate_code
 from public.usage_extras u join public.attendees a on a.id=u.attendee_id left join public.rate_card r on r.event_id=a.event_id and r.rate_code=u.rate_code and r.active left join public.rate_card v on v.event_id=a.event_id and v.rate_code=r.paired_rate_code and v.active and v.tax_treatment='explicit_vat_amount'
 where u.attendee_id=p_attendee and not public.usage_charge_suppressed(u.id)
 ) select typ||':'||id,typ,id,description,qty,price,net,vat,round(net*vat/100,2)+extra,net+round(net*vat/100,2)+extra,rate_code from base where net<>0 or extra<>0 order by typ,id
$$;
create function private.billing_charge_signature(p_attendee uuid) returns text language sql stable security definer set search_path='' as $$
 select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.charge_key),'[]'::jsonb)::text) from private.billing_charges(p_attendee)c
$$;
create function private.require_billing_access(p_attendee uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare ev uuid; begin
 perform private.require_actor_role(auth.uid(),array['admin','finance']);
 select event_id into ev from public.attendees where id=p_attendee;
 if ev is null then raise exception 'Attendee not found'; end if;
 if not private.can_access_replay(ev) then raise exception 'Test event is Admin only' using errcode='42501'; end if;
 return ev;
end $$;
create function public.get_attendee_billing_plan(p_attendee_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare ev uuid; result jsonb; begin
 ev:=private.require_billing_access(p_attendee_id);
 select jsonb_build_object('plan',(select to_jsonb(p) from public.attendee_billing_plans p where attendee_id=p_attendee_id),'signature',private.billing_charge_signature(p_attendee_id),'charges',coalesce(jsonb_agg(to_jsonb(c) order by c.charge_key),'[]'::jsonb)) into result from private.billing_charges(p_attendee_id)c;
 return result;
end $$;
create function public.save_attendee_billing_plan(p_attendee_id uuid,p_organisation_id uuid,p_company_layout text,p_allocations jsonb,p_signature text,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare ev uuid; oldplan public.attendee_billing_plans; newplan public.attendee_billing_plans; c record; entry jsonb; amount numeric; any_company boolean:=false; inv record;
begin
 ev:=private.require_billing_access(p_attendee_id);
 perform pg_advisory_xact_lock(hashtextextended(ev::text,3501));
 perform 1 from public.attendees where id=p_attendee_id for update;
 select * into oldplan from public.attendee_billing_plans where attendee_id=p_attendee_id for update;
 if coalesce(oldplan.revision,0) is distinct from p_revision then raise exception 'Billing plan changed; reopen and review it'; end if;
 if p_signature is distinct from private.billing_charge_signature(p_attendee_id) then raise exception 'Charges changed; reopen and review the billing split'; end if;
 if p_company_layout is null or p_company_layout not in ('separate','combined') or jsonb_typeof(p_allocations) is distinct from 'object' then raise exception 'Valid layout and allocations required'; end if;
 if (select count(*) from jsonb_object_keys(p_allocations))<>(select count(*) from private.billing_charges(p_attendee_id)) then raise exception 'Allocate every current charge exactly once'; end if;
 for c in select * from private.billing_charges(p_attendee_id) loop
 entry:=p_allocations->c.charge_key;
 if entry is null or jsonb_typeof(entry->'value') is distinct from 'number' or coalesce(entry->>'kind','') not in ('percent','amount') then raise exception 'Choose a company share for every item'; end if;
 amount:=(entry->>'value')::numeric;
 if amount<0 or amount<>round(amount,2) or (entry->>'kind'='percent' and amount>100) or (entry->>'kind'='amount' and amount>c.gross_amount) or c.gross_amount<0 then raise exception 'Company share must be between zero and the item total (or 100 percent)'; end if;
 any_company:=any_company or amount>0;
 end loop;
 if any_company and (p_organisation_id is null or not exists(select 1 from public.organisations where id=p_organisation_id and active)) then raise exception 'Choose an active company billing account'; end if;
 if not any_company then p_organisation_id:=null; end if;
 -- A saved split may replace unconfirmed individual drafts, never financial commitments.
 for inv in select i.* from public.invoices i where i.event_id=ev and i.status not in ('cancelled','void') and (i.attendee_id=p_attendee_id or exists(select 1 from public.invoice_lines l where l.invoice_id=i.id and l.attendee_id=p_attendee_id) or (i.attendee_id is null and i.billing_account_organisation_id in (oldplan.organisation_id,p_organisation_id))) order by i.id for update loop
 if inv.status in ('approved','issued','paid') then raise exception 'A confirmed invoice exists; use a Finance adjustment instead of changing its payer'; end if;
 if exists(select 1 from public.invoice_adjustments where invoice_id=inv.id) then raise exception 'Review existing invoice adjustments before changing billing'; end if;
 if not inv.billing_plan_managed and inv.attendee_id is null then raise exception 'An existing combined draft includes this account; resolve it before changing the payer plan'; end if;
 end loop;
 insert into public.attendee_billing_plans(attendee_id,event_id,organisation_id,company_layout,allocations,charge_signature,updated_by)
 values(p_attendee_id,ev,p_organisation_id,p_company_layout,p_allocations,p_signature,auth.uid())
 on conflict(attendee_id) do update set organisation_id=excluded.organisation_id,company_layout=excluded.company_layout,allocations=excluded.allocations,charge_signature=excluded.charge_signature,revision=public.attendee_billing_plans.revision+1,updated_by=auth.uid(),updated_at=now() returning * into newplan;
 insert into public.billing_plan_audit(event_id,attendee_id,actor_id,before_data,after_data) values(ev,p_attendee_id,auth.uid(),case when oldplan.attendee_id is null then null else to_jsonb(oldplan) end,to_jsonb(newplan));
 -- Retire superseded drafts so there is never a full-charge draft alongside a split.
 update public.invoices i set status='cancelled',updated_at=now() where i.event_id=ev and i.status in ('draft','ready_for_review','awaiting_billing_update') and (i.attendee_id=p_attendee_id or (i.attendee_id is null and i.billing_plan_managed and i.billing_account_organisation_id in (oldplan.organisation_id,p_organisation_id)));
 return to_jsonb(newplan);
end $$;

create function private.billing_invoice_members(p_invoice uuid) returns setof public.attendee_billing_plans language sql stable security definer set search_path='' as $$
 select p.* from public.attendee_billing_plans p join public.invoices i on i.id=p_invoice
 where p.event_id=i.event_id and (i.attendee_id=p.attendee_id or (i.attendee_id is null and p.organisation_id=i.billing_account_organisation_id and p.company_layout='combined')) order by p.attendee_id
$$;
create function private.billing_invoice_signature(p_invoice uuid) returns text language sql stable security definer set search_path='' as $$
 select md5(coalesce(jsonb_agg(jsonb_build_object('attendee',p.attendee_id,'revision',p.revision,'charges',private.billing_charge_signature(p.attendee_id)) order by p.attendee_id),'[]'::jsonb)::text) from private.billing_invoice_members(p_invoice)p
$$;
create function private.rebuild_billing_plan_invoice(p_invoice uuid) returns void language plpgsql security definer set search_path='' as $$
declare inv public.invoices; p record; c record; share jsonb; company_gross numeric; company_net numeric; company_vat numeric; gross numeric; net numeric; vat numeric; adj record; base_amount numeric; adjustment numeric;
begin
 select * into inv from public.invoices where id=p_invoice for update;
 if not inv.billing_plan_managed or inv.status not in ('draft','ready_for_review','awaiting_billing_update') then raise exception 'Only open billing-plan drafts can be rebuilt'; end if;
 -- Source changes require explicit Finance review; never silently move a changed
 -- charge between payers during an operational update (including lift approval).
 if exists(select 1 from private.billing_invoice_members(p_invoice)bp where bp.charge_signature<>private.billing_charge_signature(bp.attendee_id)) then
 update public.invoices set status='awaiting_billing_update' where id=p_invoice; return;
 end if;
 delete from public.invoice_lines where invoice_id=p_invoice;
 for p in select * from private.billing_invoice_members(p_invoice) loop
 for c in select * from private.billing_charges(p.attendee_id) loop
 share:=p.allocations->c.charge_key;
 company_gross:=case when share->>'kind'='amount' then (share->>'value')::numeric else round(c.gross_amount*(share->>'value')::numeric/100,2) end;
 company_net:=case when c.gross_amount=0 then 0 else round(c.net_amount*company_gross/c.gross_amount,2) end;
 company_vat:=company_gross-company_net;
 gross:=case when inv.invoice_type='individual' then c.gross_amount-company_gross else company_gross end;
 net:=case when inv.invoice_type='individual' then c.net_amount-company_net else company_net end;
 vat:=case when inv.invoice_type='individual' then c.vat_amount-company_vat else company_vat end;
 if gross<>0 then
 insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
 values(p_invoice,p.attendee_id,c.source_type,c.source_id,(select concat_ws(' ',first_name,surname) from public.attendees where id=p.attendee_id)||' — '||c.description||case when inv.invoice_type='individual' then ' (individual share)' else ' (company share)' end,1,net,net,c.vat_rate,vat,gross,c.rate_code);
 end if;
 end loop;
 end loop;
 select coalesce(sum(gross_amount),0) into base_amount from public.invoice_lines where invoice_id=p_invoice;
 for adj in select * from public.invoice_adjustments where invoice_id=p_invoice and approved loop
 adjustment:=case when adj.adjustment_type='percentage' then round(base_amount*adj.value/100,2) else round(adj.value,2) end;
 adjustment:=case when adj.direction='discount' then -abs(adjustment) else abs(adjustment) end;
 insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount)
 values(p_invoice,adj.attendee_id,'adjustment',adj.id,adj.description,1,adjustment,adjustment,0,0,adjustment);
 end loop;
 update public.invoices set net_total=(select coalesce(sum(net_amount),0) from public.invoice_lines where invoice_id=p_invoice),vat_total=(select coalesce(sum(vat_amount),0) from public.invoice_lines where invoice_id=p_invoice),gross_total=(select coalesce(sum(gross_amount),0) from public.invoice_lines where invoice_id=p_invoice),billing_plan_signature=private.billing_invoice_signature(p_invoice),status='ready_for_review',updated_at=now() where id=p_invoice;
end $$;
create function public.create_attendee_billing_drafts(p_attendee_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare ev uuid; p public.attendee_billing_plans; member record; company boolean; target uuid; kind text; inv_id uuid; result jsonb:='[]';
begin
 ev:=private.require_billing_access(p_attendee_id);
 perform pg_advisory_xact_lock(hashtextextended(ev::text,3501));
 select * into p from public.attendee_billing_plans where attendee_id=p_attendee_id for update;
 if p.attendee_id is null then raise exception 'Save the billing plan first'; end if;
 for member in select * from public.attendee_billing_plans where attendee_id=p_attendee_id or (p.organisation_id is not null and p.company_layout='combined' and event_id=ev and organisation_id=p.organisation_id and company_layout='combined') order by attendee_id for update loop
 if member.charge_signature<>private.billing_charge_signature(member.attendee_id) then raise exception 'Charges changed; review and save the billing plan again'; end if;
 if not coalesce((select ready_for_invoice from public.v_invoice_readiness where attendee_id=member.attendee_id),false) or not private.finance_transfer_package_complete(member.attendee_id) then raise exception 'Every selected attendee must be ready for billing'; end if;
 end loop;
 for company in select false union all select true loop
 if company and p.organisation_id is null then continue; end if;
 if not company and not exists(select 1 from private.billing_charges(p_attendee_id)c where c.gross_amount>case when p.allocations->c.charge_key->>'kind'='amount' then (p.allocations->c.charge_key->>'value')::numeric else round(c.gross_amount*(p.allocations->c.charge_key->>'value')::numeric/100,2) end) then continue; end if;
 kind:=case when company then 'consolidated_company' else 'individual' end;
 target:=case when company and p.company_layout='combined' then null else p_attendee_id end;
 select id into inv_id from public.invoices where event_id=ev and billing_plan_managed and invoice_type=kind and attendee_id is not distinct from target and (not company or billing_account_organisation_id=p.organisation_id) and status not in ('cancelled','void') limit 1 for update;
 if inv_id is null then
 insert into public.invoices(event_id,attendee_id,billing_account_organisation_id,invoice_type,invoice_reference,status,payment_terms_days,billing_plan_managed)
 values(ev,target,case when company then p.organisation_id else null end,kind,private.next_invoice_reference(ev),'draft',(select coalesce(invoice_default_payment_terms_days,14) from public.events where id=ev),true) returning id into inv_id;
 end if;
 if (select status from public.invoices where id=inv_id) not in ('approved','issued','paid') then perform private.rebuild_billing_plan_invoice(inv_id); end if;
 if (select gross_total from public.invoices where id=inv_id)=0 then
 update public.invoices set status='cancelled' where id=inv_id;
 else result:=result||jsonb_build_array(inv_id); end if;
 end loop;
 return result;
end $$;

-- Company billing is available to non-sponsors too. Existing company details
-- are never overwritten by the allocation editor.
create function public.create_finance_billing_company(p_event_id uuid,p_details jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; begin
 perform private.require_actor_role(auth.uid(),array['admin','finance']);
 if not exists(select 1 from public.events where id=p_event_id) or not private.can_access_replay(p_event_id) then raise exception 'Event access denied'; end if;
 if nullif(btrim(p_details->>'name'),'') is null then raise exception 'Company name is required'; end if;
 insert into public.organisations(organisation_name,billing_name,billing_email,billing_address_1,billing_address_2,town_city,county_region,postcode,country,active)
 values(btrim(p_details->>'name'),btrim(p_details->>'name'),nullif(btrim(p_details->>'email'),''),nullif(btrim(p_details->>'address1'),''),nullif(btrim(p_details->>'address2'),''),nullif(btrim(p_details->>'town'),''),nullif(btrim(p_details->>'county'),''),nullif(btrim(p_details->>'postcode'),''),nullif(btrim(p_details->>'country'),''),true) returning id into result;
 return result;
end $$;
revoke all on function public.create_finance_billing_company(uuid,jsonb) from public,anon;
grant execute on function public.create_finance_billing_company(uuid,jsonb) to authenticated;

-- Route existing recalculation calls through the allocation engine for managed drafts.
do $$ declare nm text; def text; begin
 foreach nm in array array['rebuild_individual_invoice','rebuild_consolidated_invoice'] loop
 def:=pg_get_functiondef(('public.'||nm||'(uuid)')::regprocedure);
 def:=replace(def,'public.'||nm||'(', 'private.v35_legacy_'||nm||'(');
 execute def;
 execute format('create or replace function public.%I(p_invoice_id uuid) returns void language plpgsql security definer set search_path='''' as $body$ begin if (select billing_plan_managed from public.invoices where id=p_invoice_id) then perform private.rebuild_billing_plan_invoice(p_invoice_id); else if exists(select 1 from public.invoices i join public.attendees a on a.id=i.attendee_id or (i.attendee_id is null and a.event_id=i.event_id and a.billing_account_organisation_id=i.billing_account_organisation_id and a.consolidated_invoice_included) join public.attendee_billing_plans bp on bp.attendee_id=a.id where i.id=p_invoice_id) then raise exception ''Use the saved billing plan to rebuild this invoice''; end if; perform private.v35_legacy_%I(p_invoice_id); end if; end $body$',nm,nm);
 end loop;
end $$;
-- Prevent legacy APIs from recreating unsplit drafts once a plan exists.
do $$ declare def text; sig text; guard text; begin
 foreach sig in array array['public.create_or_rebuild_individual_invoice_service(uuid,uuid)','public.create_or_rebuild_consolidated_invoice_service(uuid,uuid,uuid)'] loop
 def:=pg_get_functiondef(sig::regprocedure);
 if sig like '%individual%' then
 guard:='perform pg_advisory_xact_lock(hashtextextended((select event_id::text from public.attendees where id=p_attendee_id),3501)); if exists(select 1 from public.attendee_billing_plans where attendee_id=p_attendee_id) then raise exception ''Use the saved billing plan to create drafts''; end if;';
 else
 guard:='perform pg_advisory_xact_lock(hashtextextended(p_event_id::text,3501)); if exists(select 1 from public.attendee_billing_plans bp join public.attendees a on a.id=bp.attendee_id where bp.event_id=p_event_id and (bp.organisation_id=p_organisation_id or (a.billing_account_organisation_id=p_organisation_id and a.consolidated_invoice_included))) then raise exception ''Use the saved billing plans to create company drafts''; end if;';
 end if;
 def:=replace(def,E'begin\n',E'begin\n'||guard||E'\n'); execute def;
 end loop;
end $$;
-- Reject confirmation of stale allocations even if somebody bypasses the UI.
create function private.guard_billing_plan_invoice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.billing_plan_managed and (new.billing_plan_managed is distinct from old.billing_plan_managed or new.event_id is distinct from old.event_id or new.attendee_id is distinct from old.attendee_id or new.billing_account_organisation_id is distinct from old.billing_account_organisation_id or new.invoice_type is distinct from old.invoice_type) then raise exception 'Billing-plan invoice identity is immutable'; end if;
 if new.billing_plan_managed and new.status='approved' and old.status is distinct from 'approved' then
 if old.status<>'ready_for_review' or exists(select 1 from private.billing_invoice_members(new.id) bp left join public.v_invoice_readiness r on r.attendee_id=bp.attendee_id where not coalesce(r.ready_for_invoice,false) or not private.finance_transfer_package_complete(bp.attendee_id)) or new.billing_plan_signature is distinct from private.billing_invoice_signature(new.id) or exists(select 1 from private.billing_invoice_members(new.id)p where p.charge_signature<>private.billing_charge_signature(p.attendee_id)) then raise exception 'Billing allocation or charges changed; rebuild and review the draft'; end if;
 end if;
 return new;
end $$;
create trigger billing_plan_invoice_guard before update on public.invoices for each row execute function private.guard_billing_plan_invoice();
-- Private implementation functions must not be callable through client grants.
do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and (p.proname like 'billing_%' or p.proname like 'v35_legacy_%' or p.proname in ('require_billing_access','rebuild_billing_plan_invoice','guard_billing_plan_invoice')) loop execute format('revoke all on function %s from public,anon,authenticated',f.sig); end loop;
end $$;
revoke all on function public.get_attendee_billing_plan(uuid),public.save_attendee_billing_plan(uuid,uuid,text,jsonb,text,integer),public.create_attendee_billing_drafts(uuid) from public,anon;
grant execute on function public.get_attendee_billing_plan(uuid),public.save_attendee_billing_plan(uuid,uuid,text,jsonb,text,integer),public.create_attendee_billing_drafts(uuid) to authenticated;
commit;
