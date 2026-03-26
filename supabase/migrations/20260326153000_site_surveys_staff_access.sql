-- Ensure staff (admin/engineer) can fully work with site_surveys, including drafts.
-- Also repairs profile rows/roles so existing engineers are recognized by RLS.

-- 1) Backfill missing profile rows from auth.users (idempotent).
insert into public.profiles (id, role, name, email, phone, address)
select
  u.id,
  coalesce(nullif(lower(u.raw_user_meta_data->>'role'), ''), 'customer') as role,
  nullif(u.raw_user_meta_data->>'name', '') as name,
  u.email,
  nullif(u.raw_user_meta_data->>'phone', '') as phone,
  nullif(u.raw_user_meta_data->>'address', '') as address
from auth.users u
on conflict (id) do nothing;

-- 2) Keep profile role in sync with auth metadata when metadata provides a valid role.
update public.profiles p
set role = lower(u.raw_user_meta_data->>'role')
from auth.users u
where u.id = p.id
  and lower(coalesce(u.raw_user_meta_data->>'role', '')) in ('admin', 'engineer', 'customer')
  and coalesce(lower(p.role), '') <> lower(u.raw_user_meta_data->>'role');

-- 3) Replace site_surveys policies with explicit staff/admin split.
drop policy if exists "site_surveys_select" on public.site_surveys;
drop policy if exists "site_surveys_insert" on public.site_surveys;
drop policy if exists "site_surveys_update" on public.site_surveys;
drop policy if exists "site_surveys_delete" on public.site_surveys;
drop policy if exists "site_surveys_admin_all" on public.site_surveys;
drop policy if exists "site_surveys_select_staff" on public.site_surveys;
drop policy if exists "site_surveys_insert_staff" on public.site_surveys;
drop policy if exists "site_surveys_update_staff" on public.site_surveys;
drop policy if exists "site_surveys_delete_admin" on public.site_surveys;

create policy "site_surveys_select_staff"
on public.site_surveys
for select
using (public.is_admin_or_engineer());

create policy "site_surveys_insert_staff"
on public.site_surveys
for insert
with check (public.is_admin_or_engineer());

create policy "site_surveys_update_staff"
on public.site_surveys
for update
using (public.is_admin_or_engineer())
with check (public.is_admin_or_engineer());

create policy "site_surveys_delete_admin"
on public.site_surveys
for delete
using (public.is_admin());
