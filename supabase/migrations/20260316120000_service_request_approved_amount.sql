-- Add approved_amount_pence and paid_at to service_requests
alter table public.service_requests
  add column if not exists approved_amount_pence integer null,
  add column if not exists paid_at timestamptz null;
