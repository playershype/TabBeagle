-- Milestone 1. Apply only to a NEW isolated Supabase test project.
-- Deliberately fails on conflicting existing tables; never overwrites a live schema.
begin;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  timezone text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED')),
  created_by uuid not null unique references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('OWNER','ADMIN','MEMBER','VIEWER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(), unique(organization_id,user_id)
);
create index organization_members_user on public.organization_members(user_id,organization_id);
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  display_name text not null check(length(btrim(display_name)) between 1 and 160),
  billing_email text check(billing_email is null or (length(billing_email) <= 254 and billing_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  status text not null default 'ACTIVE' check(status in ('ACTIVE','ARCHIVED')),
  source text not null default 'MANUAL', source_record_id text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,id), unique(organization_id,source,source_record_id)
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  customer_id uuid not null, invoice_number text not null check(length(btrim(invoice_number)) between 1 and 80),
  currency text not null check(currency = 'USD'),
  original_amount_minor bigint not null check(original_amount_minor between 1 and 999999999999),
  outstanding_amount_minor bigint not null check(outstanding_amount_minor >= 0 and outstanding_amount_minor <= original_amount_minor),
  issue_date date not null, due_date date not null check(due_date >= issue_date),
  payment_status text not null default 'UNPAID' check(payment_status in ('UNPAID','PARTIALLY_PAID','PAID','VOID')),
  source text not null default 'MANUAL', source_record_id text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(organization_id,customer_id) references public.customers(organization_id,id),
  unique(organization_id,id), unique(organization_id,id,customer_id),
  unique(organization_id,invoice_number), unique(organization_id,source,source_record_id)
);
create table public.ar_cases (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  customer_id uuid not null, invoice_id uuid not null unique,
  state text not null check(state in ('OPEN','DUE','OVERDUE','PROMISED','DISPUTED','PAUSED','ESCALATED','PAID','CLOSED')),
  priority text not null default 'NORMAL', next_review_at timestamptz,
  responsible_party text not null default 'HUMAN', risk_level text not null default 'UNKNOWN',
  expected_cash_date date, pause_reason text, escalation_reason text,
  version bigint not null default 1 check(version > 0), closed_at timestamptz, closure_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(organization_id,invoice_id,customer_id) references public.invoices(organization_id,id,customer_id),
  unique(organization_id,id), unique(organization_id,invoice_id,customer_id)
);
create index ar_cases_review on public.ar_cases(organization_id,state,next_review_at);
create index invoices_org_due on public.invoices(organization_id,due_date);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  case_id uuid, invoice_id uuid, event_type text not null, actor_type text not null default 'HUMAN',
  actor_id uuid not null, actor_version text not null default 'milestone-1', occurred_at timestamptz not null default now(),
  correlation_id uuid not null, observation_refs jsonb not null default '[]', decision jsonb not null default '{}',
  reason_codes text[] not null default '{}', authority_class text not null default 'HUMAN_INITIATED',
  outcome jsonb not null default '{}', created_at timestamptz not null default now(),
  foreign key(organization_id,case_id) references public.ar_cases(organization_id,id),
  foreign key(organization_id,invoice_id) references public.invoices(organization_id,id)
);
create index audit_events_org on public.audit_events(organization_id,occurred_at);

-- SECURITY DEFINER only for small audited functions. No runtime service-role key.
create function public.is_organization_member(p_organization_id uuid, p_write boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id and m.user_id = auth.uid()
      and m.status = 'ACTIVE' and o.status = 'ACTIVE'
      and (not p_write or m.role in ('OWNER','ADMIN','MEMBER'))
  );
$$;
revoke all on function public.is_organization_member(uuid,boolean) from public, anon, authenticated;
grant execute on function public.is_organization_member(uuid,boolean) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.ar_cases enable row level security;
alter table public.audit_events enable row level security;
create policy organization_read on public.organizations for select to authenticated using(public.is_organization_member(id));
create policy membership_read on public.organization_members for select to authenticated using(public.is_organization_member(organization_id));
create policy customer_read on public.customers for select to authenticated using(public.is_organization_member(organization_id));
create policy invoice_read on public.invoices for select to authenticated using(public.is_organization_member(organization_id));
create policy case_read on public.ar_cases for select to authenticated using(public.is_organization_member(organization_id));
create policy audit_read on public.audit_events for select to authenticated using(public.is_organization_member(organization_id));
revoke all on public.organizations, public.organization_members, public.customers, public.invoices, public.ar_cases, public.audit_events from public, anon, authenticated;
grant select on public.organizations, public.organization_members, public.customers, public.invoices, public.ar_cases, public.audit_events to authenticated;

create function public.create_organization(p_name text, p_timezone text)
returns public.organizations language plpgsql security definer set search_path = '' as $$
declare result public.organizations;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
  select * into result from public.organizations where created_by = auth.uid();
  if found then
    if not public.is_organization_member(result.id, true) then raise insufficient_privilege; end if;
    if result.name is distinct from btrim(p_name) or result.timezone is distinct from p_timezone then raise exception 'Different retry payload'; end if;
    return result;
  end if;
  insert into public.organizations(name,timezone,created_by) values(btrim(p_name),p_timezone,auth.uid()) returning * into result;
  insert into public.organization_members(organization_id,user_id,role) values(result.id,auth.uid(),'OWNER');
  insert into public.audit_events(organization_id,event_type,actor_id,correlation_id)
    values(result.id,'ORGANIZATION_CREATED',auth.uid(),result.id);
  return result;
end;
$$;

create function public.create_customer(p_organization_id uuid, p_request_id uuid, p_display_name text, p_billing_email text)
returns public.customers language plpgsql security definer set search_path = '' as $$
declare result public.customers; email text := nullif(lower(btrim(p_billing_email)),'');
begin
  if not public.is_organization_member(p_organization_id,true) then raise insufficient_privilege; end if;
  if p_request_id is null then raise exception 'Missing request ID' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || p_request_id::text, 0));
  select * into result from public.customers where organization_id = p_organization_id and source = 'MANUAL' and source_record_id = p_request_id::text;
  if found then
    if result.display_name is distinct from btrim(p_display_name) or result.billing_email is distinct from email then raise exception 'Different retry payload'; end if;
    return result;
  end if;
  insert into public.customers(organization_id,display_name,billing_email,source_record_id)
    values(p_organization_id,btrim(p_display_name),email,p_request_id::text) returning * into result;
  insert into public.audit_events(organization_id,event_type,actor_id,correlation_id,outcome)
    values(p_organization_id,'CUSTOMER_CREATED',auth.uid(),p_request_id,jsonb_build_object('customer_id',result.id));
  return result;
end;
$$;

create function public.create_invoice(p_organization_id uuid, p_customer_id uuid, p_request_id uuid,
  p_invoice_number text, p_amount_minor bigint, p_currency text, p_issue_date date, p_due_date date)
returns public.invoices language plpgsql security definer set search_path = '' as $$
declare result public.invoices; case_id uuid; org_today date;
begin
  if not public.is_organization_member(p_organization_id,true) then raise insufficient_privilege; end if;
  if p_request_id is null then raise exception 'Missing request ID' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || p_request_id::text, 0));
  select * into result from public.invoices where organization_id = p_organization_id and source = 'MANUAL' and source_record_id = p_request_id::text;
  if found then
    if result.customer_id is distinct from p_customer_id or result.invoice_number is distinct from btrim(p_invoice_number)
      or result.original_amount_minor is distinct from p_amount_minor or result.currency is distinct from p_currency
      or result.issue_date is distinct from p_issue_date or result.due_date is distinct from p_due_date then raise exception 'Different retry payload'; end if;
    return result;
  end if;
  if not exists(select 1 from public.customers where organization_id = p_organization_id and id = p_customer_id and status = 'ACTIVE') then
    raise exception 'Invalid customer' using errcode = '23503';
  end if;
  select (now() at time zone timezone)::date into org_today from public.organizations where id = p_organization_id;
  insert into public.invoices(organization_id,customer_id,invoice_number,currency,original_amount_minor,outstanding_amount_minor,issue_date,due_date,source_record_id)
    values(p_organization_id,p_customer_id,btrim(p_invoice_number),p_currency,p_amount_minor,p_amount_minor,p_issue_date,p_due_date,p_request_id::text) returning * into result;
  insert into public.ar_cases(organization_id,customer_id,invoice_id,state,next_review_at)
    values(p_organization_id,p_customer_id,result.id,case when p_due_date < org_today then 'OVERDUE' when p_due_date = org_today then 'DUE' else 'OPEN' end,now()) returning id into case_id;
  insert into public.audit_events(organization_id,case_id,invoice_id,event_type,actor_id,correlation_id,outcome)
    values(p_organization_id,case_id,result.id,'INVOICE_AND_CASE_CREATED',auth.uid(),p_request_id,jsonb_build_object('outstanding_amount_minor',p_amount_minor,'currency',p_currency));
  return result;
end;
$$;
revoke all on function public.create_organization(text,text), public.create_customer(uuid,uuid,text,text), public.create_invoice(uuid,uuid,uuid,text,bigint,text,date,date) from public, anon, authenticated;
grant execute on function public.create_organization(text,text), public.create_customer(uuid,uuid,text,text), public.create_invoice(uuid,uuid,uuid,text,bigint,text,date,date) to authenticated;
commit;
