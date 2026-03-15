-- Customer leads table (enquiries from WhatsApp, social media, email)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('whatsapp', 'social_media', 'email')),
  name text not null,
  phone text null,
  email text null,
  enquiry text null,
  status text not null default 'pending' check (status in ('pending', 'parked', 'converted')),
  admin_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_source_idx on public.leads(source);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_created_at_idx on public.leads(created_at desc);

alter table public.leads enable row level security;

-- Only admins and engineers can access leads
create policy "leads_select_admin" on public.leads for select
  using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "leads_insert_admin" on public.leads for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "leads_update_admin" on public.leads for update
  using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create policy "leads_delete_admin" on public.leads for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin','engineer')));

create or replace function public.set_leads_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row execute procedure public.set_leads_updated_at();
