-- Admin full-access RLS + fix policies that query profiles.
-- Purpose:
-- 1) Avoid "query would be affected by row-level security policy for table profiles" during policy evaluation
-- 2) Ensure admins can manage everything across RLS-enabled tables
-- 3) Fix customer_products insert/select/update/delete for admin workflows (assign products)

-- Helper: checks if current user is admin without triggering profiles RLS recursion.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare r text;
begin
  -- Bypass RLS for this lookup only.
  perform set_config('row_security', 'off', true);

  select lower(role) into r
  from public.profiles
  where id = auth.uid();

  return r = 'admin';
end;
$$;

-- PROFILES: allow admins to manage profiles (select/insert/update/delete).
-- Keep existing "profiles_select_own" policy; add admin policies.
drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
  on public.profiles
  for select
  using (public.is_admin());

drop policy if exists "profiles_admin_insert_all" on public.profiles;
create policy "profiles_admin_insert_all"
  on public.profiles
  for insert
  with check (public.is_admin());

drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles_admin_delete_all" on public.profiles;
create policy "profiles_admin_delete_all"
  on public.profiles
  for delete
  using (public.is_admin());

-- CUSTOMER PRODUCTS: replace policies that query profiles directly.
-- This fixes admin "assign product to customer" flows.
drop policy if exists "customer_products_select_own" on public.customer_products;
create policy "customer_products_select_own"
  on public.customer_products
  for select
  using (
    auth.uid() = customer_id
    or public.is_admin_or_engineer()
  );

drop policy if exists "customer_products_insert_own" on public.customer_products;
create policy "customer_products_insert_own"
  on public.customer_products
  for insert
  with check (
    auth.uid() = customer_id
    or public.is_admin_or_engineer()
  );

drop policy if exists "customer_products_update_own" on public.customer_products;
create policy "customer_products_update_own"
  on public.customer_products
  for update
  using (
    auth.uid() = customer_id
    or public.is_admin_or_engineer()
  )
  with check (
    auth.uid() = customer_id
    or public.is_admin_or_engineer()
  );

drop policy if exists "customer_products_delete_own" on public.customer_products;
create policy "customer_products_delete_own"
  on public.customer_products
  for delete
  using (
    auth.uid() = customer_id
    or public.is_admin_or_engineer()
  );

-- ADMIN FULL ACCESS: add admin policies to all RLS-enabled tables used by the app.
-- These policies do not rely on querying profiles inside the policy (they call SECURITY DEFINER helpers).

-- service_requests
drop policy if exists "service_requests_admin_all" on public.service_requests;
create policy "service_requests_admin_all"
  on public.service_requests
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- service_plan_subscriptions
drop policy if exists "service_plan_subscriptions_admin_all" on public.service_plan_subscriptions;
create policy "service_plan_subscriptions_admin_all"
  on public.service_plan_subscriptions
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- service_request_payments
drop policy if exists "service_request_payments_admin_all" on public.service_request_payments;
create policy "service_request_payments_admin_all"
  on public.service_request_payments
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- installation_sites
drop policy if exists "installation_sites_admin_all" on public.installation_sites;
create policy "installation_sites_admin_all"
  on public.installation_sites
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- site_surveys
drop policy if exists "site_surveys_admin_all" on public.site_surveys;
create policy "site_surveys_admin_all"
  on public.site_surveys
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- jobs
drop policy if exists "jobs_admin_all" on public.jobs;
create policy "jobs_admin_all"
  on public.jobs
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- complaints
drop policy if exists "complaints_admin_all" on public.complaints;
create policy "complaints_admin_all"
  on public.complaints
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- warranty_claims
drop policy if exists "warranty_claims_admin_all" on public.warranty_claims;
create policy "warranty_claims_admin_all"
  on public.warranty_claims
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- customer_access_details
drop policy if exists "customer_access_details_admin_all" on public.customer_access_details;
create policy "customer_access_details_admin_all"
  on public.customer_access_details
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- leads
drop policy if exists "leads_admin_all" on public.leads;
create policy "leads_admin_all"
  on public.leads
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- stock_requests
drop policy if exists "stock_requests_admin_all_v2" on public.stock_requests;
create policy "stock_requests_admin_all_v2"
  on public.stock_requests
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- tr19 tables
drop policy if exists "tr19_reports_admin_all" on public.tr19_reports;
create policy "tr19_reports_admin_all"
  on public.tr19_reports
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tr19_report_log_admin_all" on public.tr19_report_log;
create policy "tr19_report_log_admin_all"
  on public.tr19_report_log
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tr19_grease_surveys_admin_all" on public.tr19_grease_surveys;
create policy "tr19_grease_surveys_admin_all"
  on public.tr19_grease_surveys
  for all
  using (public.is_admin())
  with check (public.is_admin());

