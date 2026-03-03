create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  business_name text null,
  business_address text null,
  contact_name text null,
  contact_email text not null,
  notes text null,
  requested_date date not null,
  created_at timestamptz not null default now()
);

alter table public.service_requests enable row level security;

drop policy if exists "service_requests_insert_own" on public.service_requests;
create policy "service_requests_insert_own"
on public.service_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists "service_requests_select_own" on public.service_requests;
create policy "service_requests_select_own"
on public.service_requests
for select
using (auth.uid() = user_id);

