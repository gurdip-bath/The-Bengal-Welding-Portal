create table if not exists public.service_plan_subscriptions (
  user_id uuid not null,
  plan_key text not null,
  status text not null default 'pending_setup',
  billing_request_id text null,
  gocardless_customer_id text null,
  gocardless_mandate_id text null,
  gocardless_subscription_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_plan_subscriptions_pkey primary key (user_id, plan_key),
  constraint service_plan_subscriptions_user_fk foreign key (user_id) references auth.users(id) on delete cascade
);

create index if not exists service_plan_subscriptions_subscription_idx
  on public.service_plan_subscriptions (gocardless_subscription_id);

create index if not exists service_plan_subscriptions_mandate_idx
  on public.service_plan_subscriptions (gocardless_mandate_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_service_plan_subscriptions_updated_at on public.service_plan_subscriptions;
create trigger set_service_plan_subscriptions_updated_at
before update on public.service_plan_subscriptions
for each row execute procedure public.set_updated_at();

alter table public.service_plan_subscriptions enable row level security;

drop policy if exists "service_plan_subscriptions_select_own" on public.service_plan_subscriptions;
create policy "service_plan_subscriptions_select_own"
on public.service_plan_subscriptions
for select
using (auth.uid() = user_id);

