-- Complaints table
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  site_name text null,
  site_address text null,
  contact_email text not null,
  contact_phone text null,
  subject text null,
  complaint_type text null,
  description text not null,
  date_of_incident date null,
  preferred_contact text null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists complaints_user_id_idx on public.complaints(user_id);
create index if not exists complaints_status_idx on public.complaints(status);

alter table public.complaints enable row level security;

create policy "complaints_select_own" on public.complaints for select
  using (user_id = auth.uid());

create policy "complaints_insert_own" on public.complaints for insert
  with check (user_id = auth.uid());

create policy "complaints_select_admin" on public.complaints for select
  using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "complaints_update_admin" on public.complaints for update
  using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

-- Warranty claims table
create table if not exists public.warranty_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  product_name text null,
  gar_code text null,
  description text not null,
  date_of_issue date null,
  contact_email text null,
  contact_phone text null,
  attachments jsonb null,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'approved', 'rejected', 'resolved')),
  admin_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists warranty_claims_user_id_idx on public.warranty_claims(user_id);
create index if not exists warranty_claims_job_id_idx on public.warranty_claims(job_id);
create index if not exists warranty_claims_status_idx on public.warranty_claims(status);

alter table public.warranty_claims enable row level security;

create policy "warranty_claims_select_own" on public.warranty_claims for select
  using (user_id = auth.uid());

create policy "warranty_claims_insert_own" on public.warranty_claims for insert
  with check (user_id = auth.uid());

create policy "warranty_claims_select_admin" on public.warranty_claims for select
  using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "warranty_claims_update_admin" on public.warranty_claims for update
  using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

-- Customer access details (account-level, for My Account section)
create table if not exists public.customer_access_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_difficulty text null check (access_difficulty is null or access_difficulty in ('easy','medium','difficult')),
  appliance_location text null,
  access_instructions text null,
  equipment_required text null,
  ppe_required text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_access_details enable row level security;

create policy "customer_access_details_select_own" on public.customer_access_details for select
  using (user_id = auth.uid());

create policy "customer_access_details_insert_own" on public.customer_access_details for insert
  with check (user_id = auth.uid());

create policy "customer_access_details_update_own" on public.customer_access_details for update
  using (user_id = auth.uid());
