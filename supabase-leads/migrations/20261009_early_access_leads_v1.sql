-- Project: tabbeagle-test (gaileljkciseopfgwsbc), shared with invoice TEST by decision 2026-10-09. NOT the production project.
-- Applied 2026-10-09 to tabbeagle-test via Supabase MCP as migration "early_access_leads_v1".
create table public.early_access_leads (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null unique check (char_length(email_normalized) between 3 and 254),
  name text not null check (char_length(name) between 2 and 120),
  business_type text not null check (char_length(business_type) between 2 and 80),
  invoice_volume text not null check (char_length(invoice_volume) between 2 and 40),
  pain_point text check (pain_point is null or char_length(pain_point) <= 300),
  consent_at timestamptz not null,
  source text not null default 'landing' check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);
alter table public.early_access_leads enable row level security;
revoke all on public.early_access_leads from anon, authenticated;
comment on table public.early_access_leads is 'Early access sign-ups from the public landing. No RLS policies: only the service role (Edge Function) may read or write.';
