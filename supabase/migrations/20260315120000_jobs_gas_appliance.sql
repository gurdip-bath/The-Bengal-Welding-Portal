-- Add is_gas_appliance and gar_code to jobs
alter table public.jobs
  add column if not exists is_gas_appliance boolean not null default false,
  add column if not exists gar_code text null;
