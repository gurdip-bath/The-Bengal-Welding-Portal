-- Supabase as single source of truth for TR19/PCVR/certificates/surveys/scheduling

-- 1) Extend jobs with scheduling + certificate fields (so admin edits persist)
alter table public.jobs
  add column if not exists scheduled_clean_date date null,
  add column if not exists certificate_number text null,
  add column if not exists technician text null,
  add column if not exists grease_rating text null,
  add column if not exists duct_length text null,
  add column if not exists tr19_compliant boolean null;

create index if not exists jobs_scheduled_clean_date_idx on public.jobs(scheduled_clean_date);

-- 2) TR19 report JSON per job
create table if not exists public.tr19_reports (
  job_id text primary key references public.jobs(id) on delete cascade,
  report jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_tr19_reports_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tr19_reports_updated_at on public.tr19_reports;
create trigger set_tr19_reports_updated_at
before update on public.tr19_reports
for each row execute procedure public.set_tr19_reports_updated_at();

alter table public.tr19_reports enable row level security;

create policy "tr19_reports_select_staff"
on public.tr19_reports for select
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "tr19_reports_upsert_staff"
on public.tr19_reports for insert
with check (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "tr19_reports_update_staff"
on public.tr19_reports for update
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "tr19_reports_delete_staff"
on public.tr19_reports for delete
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

-- 3) TR19 PCVR log (generated report references)
create table if not exists public.tr19_report_log (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.jobs(id) on delete cascade,
  report_ref text not null,
  job_title text null,
  customer_name text null,
  generated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

create index if not exists tr19_report_log_job_id_idx on public.tr19_report_log(job_id);
create index if not exists tr19_report_log_generated_at_idx on public.tr19_report_log(generated_at desc);

alter table public.tr19_report_log enable row level security;

create policy "tr19_report_log_select_staff"
on public.tr19_report_log for select
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "tr19_report_log_insert_staff"
on public.tr19_report_log for insert
with check (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "tr19_report_log_delete_staff"
on public.tr19_report_log for delete
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

-- 4) TR19 grease surveys (legacy bengal_surveys) as a first-class entity
create table if not exists public.tr19_grease_surveys (
  id text primary key,
  job_id text not null references public.jobs(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','submitted')),
  submitted_at timestamptz null,
  survey jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tr19_grease_surveys_job_id_idx on public.tr19_grease_surveys(job_id);
create index if not exists tr19_grease_surveys_status_idx on public.tr19_grease_surveys(status);
create index if not exists tr19_grease_surveys_updated_at_idx on public.tr19_grease_surveys(updated_at desc);

create or replace function public.set_tr19_grease_surveys_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tr19_grease_surveys_updated_at on public.tr19_grease_surveys;
create trigger set_tr19_grease_surveys_updated_at
before update on public.tr19_grease_surveys
for each row execute procedure public.set_tr19_grease_surveys_updated_at();

alter table public.tr19_grease_surveys enable row level security;

create policy "tr19_grease_surveys_select_staff"
on public.tr19_grease_surveys for select
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "tr19_grease_surveys_upsert_staff"
on public.tr19_grease_surveys for insert
with check (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "tr19_grease_surveys_update_staff"
on public.tr19_grease_surveys for update
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "tr19_grease_surveys_delete_staff"
on public.tr19_grease_surveys for delete
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

