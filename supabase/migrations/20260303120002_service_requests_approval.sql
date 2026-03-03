-- Add approval workflow columns to service_requests
alter table public.service_requests
  add column if not exists status text not null default 'pending',
  add column if not exists admin_notes text null,
  add column if not exists approved_at timestamptz null,
  add column if not exists rejected_at timestamptz null;

-- Admin can select all service requests (profiles.role = 'admin')
drop policy if exists "service_requests_select_own" on public.service_requests;
create policy "service_requests_select_own"
on public.service_requests for select
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin')
);

-- Admin can update (approve/reject) any service request
drop policy if exists "service_requests_update_own" on public.service_requests;
create policy "service_requests_update_admin"
on public.service_requests for update
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'))
with check (true);
