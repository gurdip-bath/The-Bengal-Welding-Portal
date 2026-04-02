-- Site-scoped jobs use jobs.customer_id = installation_sites.id. Remove those rows when the site is deleted
-- (covers API/raw deletes). Application code also calls deleteJobsForInstallationSiteId before deleting the site.

create or replace function public.delete_jobs_for_deleted_installation_site()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.jobs
  where customer_id = old.id::text;
  return old;
end;
$$;

drop trigger if exists trg_jobs_delete_when_installation_site_deleted on public.installation_sites;
create trigger trg_jobs_delete_when_installation_site_deleted
after delete on public.installation_sites
for each row execute procedure public.delete_jobs_for_deleted_installation_site();

-- One-time cleanup: jobs whose customer_id matches neither an existing site nor a portal profile (e.g. deleted test site).
delete from public.jobs j
where not exists (select 1 from public.installation_sites s where s.id::text = j.customer_id)
  and not exists (select 1 from public.profiles p where p.id::text = j.customer_id);
