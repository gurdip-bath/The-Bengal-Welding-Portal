# Cleanup test customer (bathgurdip2@gmail.com)

Use this to remove all data for the test account so the business can re-test the full flow. Admin views will no longer show those jobs/requests (everything stays in sync).

## Steps

1. Open **Supabase Dashboard** → your project → **SQL Editor**.

2. **Preview (optional):** In `cleanup-test-customer.sql`, copy the block inside the `/* ... */` comment, uncomment it (remove `/*` and `*/`), paste into the editor, and run. You’ll see row counts per table for that email.

3. **Run cleanup:** In the same file, copy the section from `begin;` through `commit;`, paste into the SQL Editor, and run.

4. **(Optional)** On any browser where you tested as admin, clear localStorage keys: `bengal_jobs`, `bengal_tr19_reports`, `bengal_tr19_report_log`, `bengal_surveys` (DevTools → Application → Local Storage) so cached test data is gone.

Only data for `bathgurdip2@gmail.com` is removed; admin and other customers are unaffected.
