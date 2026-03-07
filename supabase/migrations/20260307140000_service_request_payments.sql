create table if not exists public.service_request_payments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gocardless_customer_id text,
  gocardless_mandate_id text,
  first_payment_id text,
  amount_paid_pence int,
  paid_at timestamptz,
  billing_request_id text,
  status text not null default 'pending'
);

create index if not exists service_request_payments_mandate_idx
  on public.service_request_payments (gocardless_mandate_id);

alter table public.service_request_payments enable row level security;

drop policy if exists "service_request_payments_select_own" on public.service_request_payments;
create policy "service_request_payments_select_own"
on public.service_request_payments
for select
using (auth.uid() = user_id);
