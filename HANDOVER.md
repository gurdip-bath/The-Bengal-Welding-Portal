# Bengal Welding Portal – Handover Document

Handover from developer to business. Use this as the single reference for deployment, configuration, and maintenance.

---

## Current Project IDs

| Service | Identifier |
|---------|------------|
| Supabase project | `bqhtmefzkhfsfyqvuagk` |
| Supabase project URL | `https://bqhtmefzkhfsfyqvuagk.supabase.co` |

---

## Environment Variables

### Vercel (Frontend Build)

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL | `https://YOUR_PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (Project Settings → API) | `eyJhbGci...` |
| `GEMINI_API_KEY` | No | For AI assistant; omit if not used | `AIza...` |

### Supabase Edge Function Secrets

Set in **Supabase Dashboard → Project → Edge Functions → Manage secrets**  
or via CLI: `npx supabase secrets set KEY=value`

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GOCARDLESS_ACCESS_TOKEN` | Yes | GoCardless live API token (Developers → API access tokens) | `live_xxx...` |
| `GOCARDLESS_ENV` | Yes | `live` for production | `live` |
| `GOCARDLESS_WEBHOOK_SECRET` | Yes | GoCardless webhook signing secret (Developers → Webhooks) | From webhook config |
| `SITE_URL` | Yes | Production app URL (must be HTTPS) | `https://your-app.vercel.app` |
| `INITIAL_SERVICE_FEE_PENCE` | No | Service request fee in pence; default 15000 (£150) | `15000` |

Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase; you do not need to set them.

---

## Supabase Edge Functions

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `create-checkout-session` | Grease Plan: create GoCardless Billing Request + flow | `{SUPABASE_URL}/functions/v1/create-checkout-session` |
| `finalize-grease-plan` | Grease Plan: fulfil Billing Request, create subscription | `{SUPABASE_URL}/functions/v1/finalize-grease-plan` |
| `create-service-request-checkout` | Service Request: create Billing Request (mandate + £150 payment) | `{SUPABASE_URL}/functions/v1/create-service-request-checkout` |
| `finalize-service-request-payment` | Service Request: fulfil Billing Request, record payment | `{SUPABASE_URL}/functions/v1/finalize-service-request-payment` |
| `gocardless-webhook` | Receives GoCardless webhooks (payments, mandates) | `{SUPABASE_URL}/functions/v1/gocardless-webhook` |
| `list-users` | Admin: list users | `{SUPABASE_URL}/functions/v1/list-users` |
| `create-employee` | Admin: create employee account | `{SUPABASE_URL}/functions/v1/create-employee` |

---

## GoCardless Webhook

**Webhook URL (production):**
```
https://bqhtmefzkhfsfyqvuagk.supabase.co/functions/v1/gocardless-webhook
```

If you transfer to a new Supabase project, update this URL in GoCardless Dashboard → Developers → Webhooks.

**Events to subscribe to:** Pay the GoCardless docs for your use case (typically mandate and payment events).

---

## App Routes (for SITE_URL and redirects)

Callback URLs built from `SITE_URL`:

| Flow | Redirect URL | Exit URL |
|------|--------------|----------|
| Grease Plan | `{SITE_URL}/#/gocardless/callback?brq=...` | `{SITE_URL}/#/products` |
| Service Request | `{SITE_URL}/#/gocardless/service-request/callback?brq=...` | `{SITE_URL}/#/dashboard` |

Ensure `SITE_URL` has no trailing slash (e.g. `https://your-app.vercel.app`).

---

## Database Migrations

Apply in order (Supabase Dashboard → SQL Editor, or `supabase db push`):

| File | Purpose |
|------|---------|
| `supabase/migrations/20260302120000_service_plan_subscriptions.sql` | Grease Plan subscriptions |
| `supabase/migrations/20260303120000_service_requests.sql` | Service requests table |
| `supabase/migrations/20260303120001_add_postcode_to_service_requests.sql` | Postcode on service requests |
| `supabase/migrations/20260303120002_service_requests_approval.sql` | Approval fields |
| `supabase/migrations/20260303120003_jobs_table.sql` | Jobs table |
| `supabase/migrations/20260303120004_profiles.sql` | Profiles |
| `supabase/migrations/20260307120000_add_engineer_access_fields.sql` | Engineer access fields |
| `supabase/migrations/20260307140000_service_request_payments.sql` | Service request payments |

---

## Local Development

```bash
npm install
cp .env.example .env
# Edit .env with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (and GEMINI_API_KEY if needed)
npm run dev
```

App runs at `http://localhost:3000`.

For GoCardless testing locally, use an HTTPS tunnel (e.g. `npm run tunnel` or ngrok) and set `SITE_URL` in Supabase secrets to that URL.

---

## Deployment

- **Vercel:** Push to the connected branch (usually `main`) triggers a deploy.
- **Supabase Edge Functions:** Deploy with:
  ```bash
  npx supabase functions deploy create-checkout-session
  npx supabase functions deploy finalize-grease-plan
  npx supabase functions deploy create-service-request-checkout
  npx supabase functions deploy finalize-service-request-payment
  npx supabase functions deploy gocardless-webhook
  npx supabase functions deploy list-users
  npx supabase functions deploy create-employee
  ```

---

## Changing the Service Fee (£150)

1. Supabase → Edge Functions → Manage secrets
2. Set `INITIAL_SERVICE_FEE_PENCE=XXXX` (e.g. 15000 = £150)
3. Redeploy: `npx supabase functions deploy create-service-request-checkout`

---

## npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `npm run dev` | Run dev server |
| `build` | `npm run build` | Production build |
| `preview` | `npm run preview` | Preview production build |
| `tunnel` | `npm run tunnel` | Expose localhost via HTTPS (for GoCardless testing) |

---

## Support Cutoff

Developer support ends: _________________ (fill in date)

For urgent issues after cutoff, contact: _________________
