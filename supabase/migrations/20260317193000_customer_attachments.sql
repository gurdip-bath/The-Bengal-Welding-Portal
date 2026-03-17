-- Customer attachments (images / docs / videos) stored on profiles
-- Uses a dedicated public Storage bucket for easy inline viewing.

-- 1) Add attachments column to profiles
alter table public.profiles
  add column if not exists attachments jsonb not null default '[]';

-- 2) Storage bucket for customer attachments
insert into storage.buckets (id, name, public)
values ('customer-attachments', 'customer-attachments', true)
on conflict (id) do nothing;

-- Ensure bucket is public (idempotent)
update storage.buckets
set public = true
where id = 'customer-attachments';

-- 3) Storage policies: admins and engineers can upload/read/update/delete in customer-attachments
do $$
begin
  -- Insert
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'customer_attachments_insert'
  ) then
    create policy "customer_attachments_insert"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'customer-attachments'
      and public.is_admin_or_engineer()
    );
  end if;

  -- Select
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'customer_attachments_select'
  ) then
    create policy "customer_attachments_select"
    on storage.objects for select
    to authenticated
    using (
      bucket_id = 'customer-attachments'
      and public.is_admin_or_engineer()
    );
  end if;

  -- Update
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'customer_attachments_update'
  ) then
    create policy "customer_attachments_update"
    on storage.objects for update
    to authenticated
    using (
      bucket_id = 'customer-attachments'
      and public.is_admin_or_engineer()
    );
  end if;

  -- Delete
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'customer_attachments_delete'
  ) then
    create policy "customer_attachments_delete"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'customer-attachments'
      and public.is_admin_or_engineer()
    );
  end if;
end;
$$;

