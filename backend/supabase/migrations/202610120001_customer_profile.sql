-- Customer profile. Additive and backward compatible: create_customer keeps working unchanged.
alter table public.customers
  add column contact_name text check(contact_name is null or length(btrim(contact_name)) between 1 and 120),
  add column phone text check(phone is null or phone ~ '^[0-9+()[:space:].-]{7,30}$'),
  add column alternate_email text check(alternate_email is null or (length(alternate_email) <= 254 and alternate_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  add column company_name text check(company_name is null or length(btrim(company_name)) between 1 and 160),
  add column billing_address text check(billing_address is null or length(billing_address) <= 300),
  add column work_address text check(work_address is null or length(work_address) <= 300),
  add column payment_terms_days integer check(payment_terms_days is null or payment_terms_days between 0 and 365),
  add column reminders_enabled boolean not null default true,
  add column collection_day smallint check(collection_day is null or collection_day between 1 and 28),
  add column notes text check(notes is null or length(notes) <= 2000),
  add column tags text[] not null default '{}' check(cardinality(tags) <= 10);

-- Trims and normalizes the profile JSON once, so inserts, retries and updates compare the same values.
create function public.customer_profile_normalize(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
select jsonb_build_object(
  'contact_name', nullif(btrim(p->>'contact_name'),''),
  'phone', nullif(btrim(p->>'phone'),''),
  'alternate_email', nullif(lower(btrim(p->>'alternate_email')),''),
  'company_name', nullif(btrim(p->>'company_name'),''),
  'billing_address', nullif(btrim(p->>'billing_address'),''),
  'work_address', nullif(btrim(p->>'work_address'),''),
  'payment_terms_days', case when nullif(p->>'payment_terms_days','') is null then null else (p->>'payment_terms_days')::integer end,
  'reminders_enabled', coalesce((p->>'reminders_enabled')::boolean, true),
  'collection_day', case when nullif(p->>'collection_day','') is null then null else (p->>'collection_day')::smallint end,
  'notes', nullif(btrim(p->>'notes'),''),
  'tags', coalesce(p->'tags', '[]'::jsonb)
);
$$;

create function public.customer_profile_snapshot(c public.customers) returns jsonb
language sql immutable set search_path = '' as $$
select jsonb_build_object(
  'contact_name', c.contact_name, 'phone', c.phone, 'alternate_email', c.alternate_email,
  'company_name', c.company_name, 'billing_address', c.billing_address, 'work_address', c.work_address,
  'payment_terms_days', c.payment_terms_days, 'reminders_enabled', c.reminders_enabled,
  'collection_day', c.collection_day, 'notes', c.notes, 'tags', to_jsonb(c.tags)
);
$$;

create function public.create_customer_profile(p_organization_id uuid, p_request_id uuid, p_display_name text, p_billing_email text, p_profile jsonb)
returns public.customers language plpgsql security definer set search_path = '' as $$
declare result public.customers; email text := nullif(lower(btrim(p_billing_email)),'');
  incoming jsonb := public.customer_profile_normalize(p_profile);
begin
  if not public.is_organization_member(p_organization_id,true) then raise insufficient_privilege; end if;
  if p_request_id is null then raise exception 'Missing request ID' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || p_request_id::text, 0));
  select * into result from public.customers where organization_id = p_organization_id and source = 'MANUAL' and source_record_id = p_request_id::text;
  if found then
    if result.display_name is distinct from btrim(p_display_name) or result.billing_email is distinct from email
       or public.customer_profile_snapshot(result) is distinct from incoming then
      raise exception 'Different retry payload';
    end if;
    return result;
  end if;
  insert into public.customers(organization_id,display_name,billing_email,source_record_id,
      contact_name,phone,alternate_email,company_name,billing_address,work_address,
      payment_terms_days,reminders_enabled,collection_day,notes,tags)
    values(p_organization_id,btrim(p_display_name),email,p_request_id::text,
      incoming->>'contact_name', incoming->>'phone', incoming->>'alternate_email', incoming->>'company_name',
      incoming->>'billing_address', incoming->>'work_address',
      (incoming->>'payment_terms_days')::integer, (incoming->>'reminders_enabled')::boolean,
      (incoming->>'collection_day')::smallint, incoming->>'notes',
      array(select jsonb_array_elements_text(incoming->'tags')))
    returning * into result;
  insert into public.audit_events(organization_id,event_type,actor_id,correlation_id,outcome)
    values(p_organization_id,'CUSTOMER_CREATED',auth.uid(),p_request_id,jsonb_build_object('customer_id',result.id,'profile',true));
  return result;
end;
$$;

create function public.update_customer_profile(p_organization_id uuid, p_customer_id uuid, p_display_name text, p_billing_email text, p_profile jsonb)
returns public.customers language plpgsql security definer set search_path = '' as $$
declare result public.customers; email text := nullif(lower(btrim(p_billing_email)),'');
  incoming jsonb := public.customer_profile_normalize(p_profile);
begin
  if not public.is_organization_member(p_organization_id,true) then raise insufficient_privilege; end if;
  update public.customers set display_name = btrim(p_display_name), billing_email = email,
      contact_name = incoming->>'contact_name', phone = incoming->>'phone', alternate_email = incoming->>'alternate_email',
      company_name = incoming->>'company_name', billing_address = incoming->>'billing_address', work_address = incoming->>'work_address',
      payment_terms_days = (incoming->>'payment_terms_days')::integer, reminders_enabled = (incoming->>'reminders_enabled')::boolean,
      collection_day = (incoming->>'collection_day')::smallint, notes = incoming->>'notes',
      tags = array(select jsonb_array_elements_text(incoming->'tags')), updated_at = now()
    where organization_id = p_organization_id and id = p_customer_id and status = 'ACTIVE'
    returning * into result;
  if not found then raise exception 'Customer not found' using errcode = 'P0002'; end if;
  insert into public.audit_events(organization_id,event_type,actor_id,correlation_id,outcome)
    values(p_organization_id,'CUSTOMER_UPDATED',auth.uid(),gen_random_uuid(),jsonb_build_object('customer_id',result.id));
  return result;
end;
$$;

revoke all on function public.customer_profile_normalize(jsonb), public.customer_profile_snapshot(public.customers) from public, anon, authenticated;
revoke all on function public.create_customer_profile(uuid,uuid,text,text,jsonb), public.update_customer_profile(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_customer_profile(uuid,uuid,text,text,jsonb), public.update_customer_profile(uuid,uuid,text,text,jsonb) to authenticated;
