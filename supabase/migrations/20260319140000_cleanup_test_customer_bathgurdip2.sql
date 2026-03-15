-- One-time data cleanup: remove all data for test customer bathgurdip2@gmail.com
-- so the business can test the full flow from fresh. No schema or app changes.
-- Admin will no longer see these jobs/requests (data removed from DB).

-- 1) Jobs for this customer (admin view reads from public.jobs)
delete from public.jobs
where customer_id = (select id::text from auth.users where email = 'bathgurdip2@gmail.com')
   or customer_email = 'bathgurdip2@gmail.com';

-- 2) Service requests for this customer
delete from public.service_requests
where user_id = (select id from auth.users where email = 'bathgurdip2@gmail.com')
   or contact_email = 'bathgurdip2@gmail.com';

-- 3) Service request payment metadata for this customer
delete from public.service_request_payments
where user_id = (select id from auth.users where email = 'bathgurdip2@gmail.com');
