-- Add site name to TR19 PCVR log entries so UI can show it beside report ref.
alter table public.tr19_report_log
  add column if not exists site_name text null;

create index if not exists tr19_report_log_site_name_idx on public.tr19_report_log(site_name);

-- Best-effort backfill from the jobs table (so existing entries gain site names).
update public.tr19_report_log l
set site_name = j.customer_name
from public.jobs j
where l.job_id = j.id
  and (l.site_name is null or l.site_name = '');

