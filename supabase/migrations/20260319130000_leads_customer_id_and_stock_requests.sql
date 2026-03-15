-- Add customer_id to leads for conversion tracking
alter table public.leads
  add column if not exists customer_id uuid null;

create index if not exists leads_customer_id_idx on public.leads(customer_id) where customer_id is not null;

-- Stock requests: staff request items for site / running out
create table if not exists public.stock_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  item_description text not null,
  quantity text null,
  site_or_job text null,
  notes text null,
  status text not null default 'pending' check (status in ('pending', 'ordered', 'delivered')),
  admin_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_requests_requested_by_idx on public.stock_requests(requested_by);
create index if not exists stock_requests_status_idx on public.stock_requests(status);
create index if not exists stock_requests_created_at_idx on public.stock_requests(created_at desc);

alter table public.stock_requests enable row level security;

-- Admins: full access
create policy "stock_requests_admin_all" on public.stock_requests
  for all
  using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'));

-- Engineers: select and insert their own; update only their own (app will not send status for engineers)
create policy "stock_requests_engineer_select_own" on public.stock_requests
  for select
  using (
    requested_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin')
  );

create policy "stock_requests_engineer_insert_own" on public.stock_requests
  for insert
  with check (
    requested_by = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer'))
  );

create policy "stock_requests_engineer_update_own" on public.stock_requests
  for update
  using (requested_by = auth.uid())
  with check (requested_by = auth.uid());

create policy "stock_requests_engineer_delete_own" on public.stock_requests
  for delete
  using (requested_by = auth.uid());

-- Only admin can change status: trigger keeps status unchanged when updater is engineer
create or replace function public.stock_requests_engineer_no_status_change()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'engineer') then
    new.status = old.status;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stock_requests_before_update on public.stock_requests;
create trigger stock_requests_before_update
  before update on public.stock_requests
  for each row execute procedure public.stock_requests_engineer_no_status_change();

-- Set updated_at on insert for consistency
create or replace function public.stock_requests_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stock_requests_before_insert on public.stock_requests;
create trigger stock_requests_before_insert
  before insert on public.stock_requests
  for each row execute procedure public.stock_requests_set_updated_at();
