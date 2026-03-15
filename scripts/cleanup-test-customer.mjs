/**
 * Cleanup test customer: bathgurdip2@gmail.com
 * Removes their service requests, jobs, and payment metadata so the app is clean for re-testing.
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard → Settings → API → service_role)
 *
 * Run: node --env-file=.env scripts/cleanup-test-customer.mjs
 */

import { createClient } from '@supabase/supabase-js';

const TEST_EMAIL = 'bathgurdip2@gmail.com';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function getUserId() {
  const { data: rows } = await admin.from('service_requests').select('user_id').eq('contact_email', TEST_EMAIL).limit(1);
  if (rows?.length) return rows[0].user_id;
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const u = users?.find((x) => x.email?.toLowerCase() === TEST_EMAIL.toLowerCase());
  return u?.id ?? null;
}

async function main() {
  const userId = await getUserId();
  if (userId) {
    console.log('Test user id:', userId);
  } else {
    console.log('No auth user found for', TEST_EMAIL, '- will delete only by email where possible.');
  }

  let jobQuery = admin.from('jobs').delete().eq('customer_email', TEST_EMAIL);
  if (userId) jobQuery = admin.from('jobs').delete().or(`customer_id.eq.${userId},customer_email.eq.${TEST_EMAIL}`);
  const { data: jobRows, error: jobErr } = await jobQuery.select('id');
  if (jobErr) {
    console.error('Jobs delete error:', jobErr.message);
  } else {
    console.log('Deleted jobs:', jobRows?.length ?? 0);
  }

  let srQuery = admin.from('service_requests').delete().eq('contact_email', TEST_EMAIL);
  if (userId) srQuery = admin.from('service_requests').delete().or(`user_id.eq.${userId},contact_email.eq.${TEST_EMAIL}`);
  const { data: srRows, error: srErr } = await srQuery.select('id');
  if (srErr) {
    console.error('Service requests delete error:', srErr.message);
  } else {
    console.log('Deleted service_requests:', srRows?.length ?? 0);
  }

  if (userId) {
    const { error: payErr } = await admin.from('service_request_payments').delete().eq('user_id', userId);
    if (payErr) {
      console.error('Service request payments delete error:', payErr.message);
    } else {
      console.log('Deleted service_request_payments row for user.');
    }
  }

  console.log('Cleanup done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
