-- TR19 certificate clean type: partial vs full clean (site survey scoping)
alter table public.site_surveys
  add column if not exists tr19_certificate_clean_type text null;

comment on column public.site_surveys.tr19_certificate_clean_type is 'TR19 certificate scope: partial | full';
