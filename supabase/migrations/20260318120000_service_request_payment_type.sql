-- Payment type: one_off only, dd_only, or both
-- DD: recurring amount, day of month (1-28), first payment ~14 days after mandate

alter table public.service_requests
  add column if not exists payment_type text not null default 'one_off' check (payment_type in ('one_off', 'dd_only', 'both')),
  add column if not exists dd_amount_pence integer null,
  add column if not exists dd_day_of_month integer null check (dd_day_of_month is null or (dd_day_of_month >= 1 and dd_day_of_month <= 28)),
  add column if not exists gocardless_subscription_id text null;
