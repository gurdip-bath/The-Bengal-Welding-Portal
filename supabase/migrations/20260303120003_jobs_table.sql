-- Jobs table in Supabase for shared jobs (aligned with Job type)
create table if not exists public.jobs (
  id text primary key,
  title text not null,
  description text null,
  customer_id text not null,
  customer_name text null,
  customer_email text null,
  customer_phone text null,
  customer_address text null,
  customer_postcode text null,
  contact_name text null,
  frequency text null,
  status text not null default 'PENDING',
  start_date date not null,
  warranty_end_date date not null,
  payment_status text not null default 'UNPAID',
  amount numeric not null default 0,
  start_time text null,
  duration integer null,
  job_type text null,
  lead_operative text null,
  service_request_id uuid null references public.service_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_customer_id_idx on public.jobs(customer_id);
create index if not exists jobs_start_date_idx on public.jobs(start_date);
create index if not exists jobs_service_request_id_idx on public.jobs(service_request_id);

create or replace function public.set_jobs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
before update on public.jobs
for each row execute procedure public.set_jobs_updated_at();

alter table public.jobs enable row level security;

-- Customers can select their own jobs (customer_id = auth.uid() as text)
-- Admins can select all
create policy "jobs_select"
on public.jobs for select
using (
  customer_id = auth.uid()::text
  or exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin')
);

-- Only admins can insert/update/delete jobs
create policy "jobs_insert_admin"
on public.jobs for insert
with check (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'));

create policy "jobs_update_admin"
on public.jobs for update
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'));

create policy "jobs_delete_admin"
on public.jobs for delete
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'));
