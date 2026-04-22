# Tiny CV Production Launch Checklist

This is the operational checklist for the next launch wave: get Tiny CV running safely on Vercel with the API, jobs, and PDF export enabled.

## What Andrew Should Set Up

### 1. Vercel

- Production project: `lockinbot/cvstudio`.
- Current production URL: `https://cvstudio-brown.vercel.app`.
- Add the production domain when ready.
- Use Pro if you want cron recovery more than once per day. Hobby supports cron, but only once daily.
- Enable Fluid Compute if available for the project.

### 2. Postgres

Use Neon, Supabase, or another managed Postgres.

You need:

- pooled production connection string for `DATABASE_URL`
- direct connection string locally when running migrations, if your provider recommends that split
- backups enabled

Before deploy:

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

### 3. Browserless Or CDP-Compatible Chrome

PDF jobs should use a remote browser in production.

Set one of:

- `TINYCV_BROWSER_WS_ENDPOINT`
- `BROWSERLESS_WS_ENDPOINT`

Local Chrome paths are fine for local testing, but not the preferred Vercel production path.

### 4. Production Secrets

Generate secrets with:

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

Set:

- `TINYCV_APP_URL=https://your-production-domain`
- `BETTER_AUTH_URL=https://your-production-domain`
- `TINYCV_RUNTIME_SCHEMA_SYNC=false`
- `TINYCV_RATE_LIMIT_DISABLED=false`

Optional, but recommended before public self-serve API keys:

- `NEXT_PUBLIC_TINYCV_TURNSTILE_SITE_KEY`
- `TINYCV_TURNSTILE_SECRET_KEY`

### 5. Future Wave Accounts

For the account/claiming wave, decide the auth provider.

Recommended default:

- Better Auth or Auth.js for low-cost control

Fastest managed path:

- Clerk

If using OAuth login, create apps for:

- Google
- GitHub

Better Auth callback URLs:

- `https://your-production-domain/api/auth/callback/google`
- `https://your-production-domain/api/auth/callback/github`

Set provider credentials only when ready:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### 6. Stripe Payments

Stripe checkout is wired for signed-in users.

Create test-mode products/prices first:

- Founder Pass product, one-time `$100`, for permanent premium Tiny CV identity
- Annual Pro product, `$40/year`, for active premium publishing and higher limits

Set:

- `STRIPE_SECRET_KEY`
- `STRIPE_FOUNDER_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

Optional:

- `TINYCV_FOUNDER_PASS_LIMIT=100`

Webhook endpoint:

```text
https://your-production-domain/api/billing/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Configure Stripe Customer Portal if subscription management should be available from `/account`:

- Settings -> Billing -> Customer portal
- enable payment method updates, invoice history, and subscription cancellation/change behavior

### 7. Future Wave Subdomains

For `name.tiny.cv`, prepare:

- production domain on Vercel
- wildcard DNS record for `*.tiny.cv`
- reserved names list before user claiming ships

## Repo Commands

Check local quality:

```bash
pnpm test
pnpm lint
pnpm build
```

Check production env readiness:

```bash
pnpm check:prod
```

Smoke-test API PDF rendering against a running deployment:

```bash
TINYCV_ACCOUNT_TEST_BASE_URL=https://your-production-domain \
pnpm test:account

TINYCV_BILLING_TEST_BASE_URL=https://your-production-domain \
pnpm test:billing

TINYCV_BRANDING_TEST_BASE_URL=https://your-production-domain \
DATABASE_URL=postgresql://... \
pnpm test:branding

TINYCV_PDF_TEST_BASE_URL=https://your-production-domain \
TINYCV_API_KEY=tcv_live_... \
TINYCV_WORKER_SECRET=... \
pnpm test:pdf
```

Optional visual PDF parity check:

```bash
TINYCV_PDF_TEST_BASE_URL=https://your-production-domain \
TINYCV_API_KEY=tcv_live_... \
TINYCV_WORKER_SECRET=... \
pnpm test:pdf:visual
```

## Vercel Cron

The repo ships a conservative daily cron in `vercel.json`:

```json
{
  "path": "/api/v1/jobs/process",
  "schedule": "0 8 * * *"
}
```

This avoids failing Hobby deployments. On Vercel Pro, change it to a more responsive cadence:

```json
{
  "path": "/api/v1/jobs/process",
  "schedule": "*/5 * * * *"
}
```

The worker route also supports manual calls:

```bash
curl -X POST https://your-production-domain/api/v1/jobs/process \
  -H "Authorization: Bearer $TINYCV_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pdf_job_limit":1,"webhook_limit":10}'
```

## Launch Gate

Before sharing publicly:

- `/` loads the landing page.
- `/new` creates a resume.
- `/account` allows account creation and sign in.
- `/account?billing=success` shows a clear checkout confirmation.
- `POST /api/account/claim-workspace` attaches anonymous drafts to the signed-in user.
- `POST /api/billing/checkout` creates Founder Pass and Annual Pro checkout sessions.
- Founder Pass availability renders on `/` and `/account`, and checkout rejects new Founder purchases after the configured limit.
- Paid account-owned public resumes hide Tiny CV branding.
- `usage_events` records signup/sign-in, account claim, checkout start/complete, workspace publish, API publish, and PDF job events.
- Subscription accounts can open Stripe Customer Portal from `/account`.
- `/cvs/:resumeId/open` reattaches an account-owned draft to the current browser and opens Studio.
- `/studio/[resumeId]` saves and publishes.
- `/:slug` renders the public page.
- `/developers` loads.
- `/agents` loads and shows the agent instruction plus template/interview guidance.
- `/openapi.json` loads and includes `/api/v1/paid/agent-finish`.
- `/api/v1/openapi.json` loads.
- `pnpm test:pdf` passes against production.
- Vercel logs show no repeated function failures.
- X launch checklist is reviewed: `docs/x-launch-checklist.md`.
