-- Site surveys table for pre-sales scoping surveys
create table if not exists public.site_surveys (
  id uuid primary key default gen_random_uuid(),
  -- Site details
  site_name text not null,
  address_line1 text not null,
  address_line2 text null,
  city text not null,
  postcode text not null,
  -- Contact details
  contact_name text not null,
  contact_phone text not null,
  contact_email text null,
  alt_contact_name text null,
  alt_contact_phone text null,
  -- Survey requirements
  survey_type text not null default 'TR19 Grease',
  work_required text not null,
  linear_metres text null,
  diameter_width_mm text null,
  height_m text null,
  other_measurements text null,
  access_notes text null,
  special_requirements text null,
  estimated_scope text null,
  -- Media: array of { type: 'image'|'video', url: string, name?: string }
  media jsonb not null default '[]',
  -- Internal
  internal_notes text null,
  priority text null default 'normal',
  surveyed_by_id uuid null references auth.users(id) on delete set null,
  surveyed_by_name text null,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_surveys_status_idx on public.site_surveys(status);
create index if not exists site_surveys_created_at_idx on public.site_surveys(created_at desc);
create index if not exists site_surveys_site_name_idx on public.site_surveys(site_name);
create index if not exists site_surveys_postcode_idx on public.site_surveys(postcode);

create or replace function public.set_site_surveys_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_surveys_updated_at on public.site_surveys;
create trigger set_site_surveys_updated_at
before update on public.site_surveys
for each row execute procedure public.set_site_surveys_updated_at();

alter table public.site_surveys enable row level security;

-- Admin and engineer can select all site surveys
create policy "site_surveys_select"
on public.site_surveys for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

-- Admin and engineer can insert
create policy "site_surveys_insert"
on public.site_surveys for insert
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

-- Admin and engineer can update
create policy "site_surveys_update"
on public.site_surveys for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

-- Admin and engineer can delete
create policy "site_surveys_delete"
on public.site_surveys for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

-- Storage bucket for site survey media (photos + videos)
-- Note: Create bucket via SQL. Size/type limits enforced in app.
insert into storage.buckets (id, name, public)
values ('site-survey-media', 'site-survey-media', false)
on conflict (id) do nothing;

-- Storage policies: admins and engineers can upload/read/update/delete in site-survey-media
create policy "site_survey_media_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'site-survey-media'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

create policy "site_survey_media_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'site-survey-media'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

create policy "site_survey_media_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'site-survey-media'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);

create policy "site_survey_media_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'site-survey-media'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'engineer')
  )
);
