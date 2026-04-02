/**
 * Inspect installation_sites linked_customer_id (service role, bypasses RLS).
 * Run: node --env-file=.env scripts/inspect-installation-sites-link.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Missing VITE_SUPABASE_URL and a service role key (SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY) in .env'
  );
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await admin
  .from('installation_sites')
  .select('id, site_name, linked_customer_id, created_at')
  .order('created_at', { ascending: false })
  .limit(50);

if (error) {
  console.error('Query error:', error.message);
  process.exit(1);
}

const rows = data ?? [];
const withLink = rows.filter((r) => r.linked_customer_id != null);
const withoutLink = rows.filter((r) => r.linked_customer_id == null);

console.log('--- installation_sites (last 50 by created_at) ---');
console.log('Total rows returned:', rows.length);
console.log('With linked_customer_id set:', withLink.length);
console.log('With linked_customer_id NULL:', withoutLink.length);
console.log('');
for (const r of rows) {
  console.log(
    `- ${(r.site_name ?? '?').slice(0, 40)} | linked=${r.linked_customer_id ?? 'NULL'} | site_id=${r.id}`
  );
}
