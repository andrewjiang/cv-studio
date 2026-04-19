# Tiny CV X Launch Checklist

Use this after production smoke tests pass and before posting publicly.

## Product

- `/` explains Tiny CV in one screen and links to `/new`, examples, pricing, docs, and account.
- `/new` creates a resume from a template.
- `/account` supports sign up, sign in, workspace claiming, checkout, and plan status.
- `/developers` and `/documentation` load without errors.
- `/api/v1/openapi.json` loads.

## Paid Plans

- Stripe remains in test mode until you intentionally switch to live mode.
- Founder Pass shows the configured remaining count.
- Founder checkout is rejected after `TINYCV_FOUNDER_PASS_LIMIT`.
- Annual Pro checkout creates a subscription checkout session.
- `/account?billing=success` shows a clear confirmation.
- Paid account-owned public pages hide Tiny CV branding.

## Production Smoke

```bash
pnpm check:prod
TINYCV_ACCOUNT_TEST_BASE_URL=https://your-production-domain pnpm test:account
TINYCV_BILLING_TEST_BASE_URL=https://your-production-domain pnpm test:billing
TINYCV_BRANDING_TEST_BASE_URL=https://your-production-domain DATABASE_URL=postgresql://... pnpm test:branding
TINYCV_PDF_TEST_BASE_URL=https://your-production-domain TINYCV_API_KEY=tcv_live_... TINYCV_WORKER_SECRET=... pnpm test:pdf
```

## Post

- Lead with the one-page markdown builder.
- Mention public links and PDFs.
- Mention Founder Pass only once, with the first-100 framing.
- Link directly to the production domain.
- Keep the agent/API story as a secondary note or reply, not the main post.
