# Tiny CV Deployment Guide

This guide is the public production checklist for self-hosting Tiny CV with durable storage, background jobs, and optional premium integrations.

## Deployment Targets

Tiny CV works best when you treat the deployment as two layers:

- core app: Next.js server that handles the editor, API, auth, and public resumes
- background/browser layer: a worker or scheduled caller plus Chromium access for publish-fit measurement and PDF jobs

You can run both on one machine for small deployments or split them across services later.

## Minimum Production Setup

### 1. Database

Use managed Postgres or another production-grade Postgres deployment.

Before deploy:

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

Recommended:

- a pooled `DATABASE_URL` for the app
- backups enabled
- a direct migration connection if your provider recommends that split

### 2. Required Secrets

Generate strong secrets, for example:

```bash
openssl rand -base64 32
```

Set:

- `TINYCV_EDITOR_SECRET`
- `TINYCV_PLATFORM_SECRET`
- `TINYCV_PLATFORM_BOOTSTRAP_SECRET`
- `TINYCV_WORKER_SECRET`
- `CRON_SECRET`
- `BETTER_AUTH_SECRET`

Set these URLs as well:

- `TINYCV_APP_URL=https://your-production-domain`
- `BETTER_AUTH_URL=https://your-production-domain`

Production expectations:

- `TINYCV_RUNTIME_SCHEMA_SYNC=false`
- `TINYCV_RATE_LIMIT_DISABLED=false`

Before going live, run:

```bash
pnpm check:prod
```

### 3. Browser-Backed Jobs

API publish-fit measurement and async PDF jobs need Chromium access.

Set one of:

- `TINYCV_BROWSER_WS_ENDPOINT`
- `BROWSERLESS_WS_ENDPOINT`
- `TINYCV_CHROME_EXECUTABLE_PATH`

Remote CDP or Browserless is the preferred production path. Local Chrome paths are fine for local testing and simpler self-hosted environments.

The browser must be able to load `TINYCV_APP_URL` and protected `/internal/resume-fit/:resumeId` routes.

### 4. Background Job Processing

Protect `/api/v1/jobs/process` with `TINYCV_WORKER_SECRET` or `CRON_SECRET`.

Example invocation:

```bash
curl -X POST https://your-domain.com/api/v1/jobs/process \
  -H "Authorization: Bearer $TINYCV_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pdf_job_limit":1,"webhook_limit":10}'
```

Use a scheduled runner, cron, or worker queue to call this endpoint regularly. The app also schedules best-effort background processing after create, update, publish, and PDF requests, but the worker endpoint is the recovery path.

## Optional Integrations

### OAuth

Only configure these when you want social login:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Callback URLs:

- `https://your-production-domain/api/auth/callback/google`
- `https://your-production-domain/api/auth/callback/github`

### Analytics

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to the GA4 web stream measurement ID for the production site. Leave it unset in local development unless you intentionally want local page views in GA4.

The admin traffic dashboard reads cached GA4 snapshots from Postgres. Vercel Cron refreshes those snapshots through `/api/admin/analytics/refresh` every 6 hours.

Set:

- `TINYCV_GA4_PROPERTY_ID`
- `TINYCV_GA4_SERVICE_ACCOUNT_JSON_BASE64`
- `TINYCV_ANALYTICS_REFRESH_HOURS=6`

Grant the Google service account Viewer access to the GA4 property, then store its JSON key as base64:

```bash
base64 -i service-account.json | tr -d '\n'
```

The cron route is protected by `CRON_SECRET` / `TINYCV_WORKER_SECRET`. Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to configured cron routes when `CRON_SECRET` is set.

Manual refresh:

```bash
curl -X POST https://your-domain.com/api/admin/analytics/refresh \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"force":true}'
```

### Billing

Stripe is optional and only required for premium plan flows.

Set:

- `STRIPE_SECRET_KEY`
- `STRIPE_FOUNDER_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

Optional:

- `TINYCV_FOUNDER_PASS_LIMIT=100`

### Machine Payments

Machine payments are disabled by default.

To enable them, set `TINYCV_MACHINE_PAYMENTS_ENABLED=true` and then configure the required x402 and MPP environment variables from `.env.example`.

Production readiness fails if machine payments are enabled with:

- missing secrets
- placeholder wallet values
- testnet defaults
- deployment-host MPP realms

## Production Smoke Checks

Core:

```bash
pnpm check:prod
pnpm test
pnpm lint
pnpm build
```

With full infrastructure configured:

```bash
TINYCV_ACCOUNT_TEST_BASE_URL=https://your-production-domain pnpm test:account
TINYCV_BILLING_TEST_BASE_URL=https://your-production-domain pnpm test:billing
TINYCV_BRANDING_TEST_BASE_URL=https://your-production-domain DATABASE_URL=postgresql://... pnpm test:branding
TINYCV_PDF_TEST_BASE_URL=https://your-production-domain TINYCV_API_KEY=tcv_live_... TINYCV_WORKER_SECRET=... pnpm test:pdf
```

## Notes

- File-backed local mode is for development and lightweight evaluation, not durable production storage.
- Premium branding, subdomain ownership, and billing flows are optional layers on top of the core app.
- If you expose the public developer API, make sure rate limits and Turnstile settings match your threat model.
