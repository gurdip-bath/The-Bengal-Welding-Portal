-- Extend installation_sites with equipment_required and media for photos/videos

alter table public.installation_sites
  add column if not exists equipment_required text null,
  add column if not exists media jsonb not null default '[]';

-- Storage bucket for installation site media (photos + videos)
insert into storage.buckets (id, name, public)
values ('installation-site-media', 'installation-site-media', false)
on conflict (id) do nothing;

-- Storage policies: admins and engineers can upload/read/update/delete in installation-site-media
create policy if not exists "installation_site_media_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'installation-site-media'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

create policy if not exists "installation_site_media_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'installation-site-media'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

create policy if not exists "installation_site_media_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'installation-site-media'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

create policy if not exists "installation_site_media_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'installation-site-media'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

