-- Installation sites - simple site directory (non-TR19)
-- Site name, address, postcode, contact, notes for "all our installation sites"
create table if not exists public.installation_sites (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  address text not null,
  postcode text not null,
  contact_name text not null,
  contact_phone text not null,
  contact_email text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists installation_sites_postcode_idx on public.installation_sites(postcode);
create index if not exists installation_sites_site_name_idx on public.installation_sites(site_name);
create index if not exists installation_sites_created_at_idx on public.installation_sites(created_at desc);

create or replace function public.set_installation_sites_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_installation_sites_updated_at on public.installation_sites;
create trigger set_installation_sites_updated_at
before update on public.installation_sites
for each row execute procedure public.set_installation_sites_updated_at();

alter table public.installation_sites enable row level security;

create policy "installation_sites_select"
on public.installation_sites for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

create policy "installation_sites_insert"
on public.installation_sites for insert
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

create policy "installation_sites_update"
on public.installation_sites for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

create policy "installation_sites_delete"
on public.installation_sites for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);
