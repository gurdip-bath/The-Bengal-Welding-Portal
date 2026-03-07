-- Add engineer access fields to service_requests and jobs

-- service_requests
alter table public.service_requests
  add column if not exists access_difficulty text null,
  add column if not exists appliance_location text null,
  add column if not exists access_instructions text null,
  add column if not exists equipment_required text null,
  add column if not exists ppe_required text null;

alter table public.service_requests
  add constraint service_requests_access_difficulty_check
  check (access_difficulty is null or access_difficulty in ('easy','medium','difficult'));

-- jobs
alter table public.jobs
  add column if not exists access_difficulty text null,
  add column if not exists appliance_location text null,
  add column if not exists access_instructions text null,
  add column if not exists equipment_required text null,
  add column if not exists ppe_required text null;

alter table public.jobs
  add constraint jobs_access_difficulty_check
  check (access_difficulty is null or access_difficulty in ('easy','medium','difficult'));
