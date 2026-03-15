-- Cleanup test customer: bathgurdip2@gmail.com
-- Run this in Supabase Dashboard → SQL Editor (production project).
-- Only data for this email is removed; admin and other customers are untouched.

-- ========== PREVIEW (run this first to see what will be deleted) ==========
/*
select 'service_requests' as tbl, count(*) from public.service_requests
where user_id = (select id from auth.users where email = 'bathgurdip2@gmail.com')
   or contact_email = 'bathgurdip2@gmail.com'
union all
select 'jobs', count(*) from public.jobs
where customer_id = (select id::text from auth.users where email = 'bathgurdip2@gmail.com')
   or customer_email = 'bathgurdip2@gmail.com'
union all
select 'service_request_payments', count(*) from public.service_request_payments
where user_id = (select id from auth.users where email = 'bathgurdip2@gmail.com');
*/

-- ========== DELETE (run this to perform cleanup) ==========
begin;

-- 1) Jobs for test customer (admin will no longer see these)
delete from public.jobs
where customer_id = (select id::text from auth.users where email = 'bathgurdip2@gmail.com')
   or customer_email = 'bathgurdip2@gmail.com';

-- 2) Service requests for test customer
delete from public.service_requests
where user_id = (select id from auth.users where email = 'bathgurdip2@gmail.com')
   or contact_email = 'bathgurdip2@gmail.com';

-- 3) Service request payment metadata for test customer
delete from public.service_request_payments
where user_id = (select id from auth.users where email = 'bathgurdip2@gmail.com');

commit;
