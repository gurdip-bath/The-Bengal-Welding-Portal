-- Link installation sites to portal customer (auth user) created alongside the site.
alter table public.installation_sites
  add column if not exists linked_customer_id uuid references auth.users (id) on delete set null;

create index if not exists installation_sites_linked_customer_id_idx
  on public.installation_sites (linked_customer_id)
  where linked_customer_id is not null;

comment on column public.installation_sites.linked_customer_id is
  'Portal customer user id (profiles.id / auth.users.id) when the site was created with auto customer creation.';
