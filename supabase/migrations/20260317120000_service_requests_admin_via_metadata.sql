-- Allow admin access via profiles.role OR auth.jwt().user_metadata.role
-- Fix: admin@bengalwelding.co.uk and other admins without profiles row can see service requests

drop policy if exists "service_requests_select_own" on public.service_requests;
create policy "service_requests_select_own"
on public.service_requests for select
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin', 'engineer'))
  or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')) in ('admin', 'engineer')
);

drop policy if exists "service_requests_update_admin" on public.service_requests;
create policy "service_requests_update_admin"
on public.service_requests for update
using (
  exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('admin', 'engineer'))
  or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')) in ('admin', 'engineer')
)
with check (true);
