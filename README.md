<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Bengal Welding Portal

Customer/admin portal with Supabase auth and a GoCardless-powered monthly subscription for the **Grease Cleaning Service Plan**.

## Run locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set environment variables (example in `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (optional, for AI assistant)
3. Run the app:
   `npm run dev`

## GoCardless (monthly plan)

### Supabase Edge Functions

- `supabase/functions/create-checkout-session`: creates a GoCardless Billing Request + Billing Request Flow and returns the `authorisation_url`.
- `supabase/functions/finalize-grease-plan`: fulfils the Billing Request (creating a mandate) and creates a GoCardless subscription.
- `supabase/functions/gocardless-webhook`: webhook receiver to update local subscription status.

### Required Supabase secrets (Edge Function env)

- `GOCARDLESS_ACCESS_TOKEN`: GoCardless API token (sandbox or live).
- `GOCARDLESS_ENV`: `sandbox` (default) or `live`.
- `GOCARDLESS_WEBHOOK_SECRET`: webhook signing secret from GoCardless dashboard.
- `SITE_URL`: public site URL used for redirects (e.g. `http://localhost:3000` in dev).
- `SUPABASE_SERVICE_ROLE_KEY`: used server-side to persist subscription IDs.

### Database

Apply migration `supabase/migrations/20260302120000_service_plan_subscriptions.sql` to create `public.service_plan_subscriptions`.
