# Tiny CV Monetization Roadmap

## Position

Tiny CV is a markdown-first resume builder and hoster for people who want one clean page, a shareable link, and role-specific versions without fighting a document editor.

The agent/API surface is a distribution layer, not the primary business. The strongest wedge is:

> Agents can create the final artifact, not just give the user text to copy somewhere else.

## Current Thesis

Tiny CV should optimize first for individual users coming from X:

- people updating their resume during a job hunt
- people who want a polished public CV link
- people who need several versions for different roles
- people who want AI editing, but still want control over the final document

The developer and agent story should be visible and real, but it should not drive the initial business model.

## Monetization Shape

### First paid offer

Use a simple launch offer before optimizing pricing:

- Founder Pass: first 100 users get lifetime hosting for `$100`
- Annual Pro: `$40/year`

This is intentionally simple. The goal is to learn whether people will pay for polished resume hosting and editing, not to maximize ARPU on day one.

### Paid value

Pro should include:

- remove Tiny CV branding
- claim one `*.tiny.cv` subdomain, for example `andrew.tiny.cv`
- host multiple role-specific versions
- higher PDF/export limits
- AI editing credits once AI ships
- priority access to new publishing features

Free should keep:

- markdown editing
- public links
- PDF export
- Tiny CV branding
- enough value that people can share the product honestly

## Product Hierarchy

1. Writer product
   - create
   - preview
   - publish
   - host
   - export
   - version per role

2. Paid publishing identity
   - remove branding
   - subdomain
   - multiple hosted versions
   - later custom domains

3. AI editing
   - tighten bullets
   - tailor to a role
   - fit one page
   - improve summary
   - convert notes into Tiny CV markdown

4. Agent compatibility
   - copy-paste agent instruction
   - MCP endpoint
   - x402/MPP pay-per-call endpoints
   - API for create, publish, and PDF

5. Developer platform
   - only if real third-party demand appears
   - API projects, usage dashboards, webhooks, and billing come later

## Architecture Principles

### Separate identity layers

Do not collapse every identity into the current anonymous workspace model.

| Layer | Purpose |
| --- | --- |
| Workspace | Anonymous browser editing |
| User | Paid human account |
| Project | API keys, MCP, webhooks, agent usage |
| Resume | Content object attached through memberships |

A resume can be attached to a workspace, user, project, or all three.

### Entitlements before billing

Billing providers collect money. Tiny CV needs to decide what a user can do.

Add a local entitlement system before Stripe:

```ts
type Entitlements = {
  removeBranding: boolean;
  customSubdomainLimit: number;
  customDomainLimit: number;
  monthlyAiCredits: number;
  monthlyPdfExports: number;
  apiProjectsLimit: number;
  monthlyApiCreates: number;
  monthlyPdfJobs: number;
};
```

Stripe, admin grants, lifetime passes, coupons, and later x402/MPP receipts can all resolve into entitlements.

### Stripe for humans, x402 and MPP for agents

Stripe should power:

- subscriptions
- founder pass checkout
- invoices
- refunds
- Customer Portal
- subscription webhooks

x402 and MPP should power:

- no-account agent calls
- pay-per-resume creation
- pay-per-PDF generation
- paid MCP tools later

Do not make machine-payment protocols the main human billing path.

## Staged Plan

### Phase 0: Production hardening

Before monetization:

- replace request-time schema creation with explicit migrations
- make PDF jobs durable instead of poll-triggered
- move webhook delivery into a durable outbox
- require idempotency keys for mutating developer endpoints
- make one-time claim consumption atomic
- require strong platform secrets in production
- add rate limits by workspace, user, project, and IP
- complete the OpenAPI spec for shipped endpoints

Exit criteria:

- API creates, publishes, PDF jobs, and webhooks can run safely on Vercel without hidden background assumptions.

Migration rule:

- run `pnpm db:migrate` before deploying schema-dependent API changes
- keep `TINYCV_RUNTIME_SCHEMA_SYNC=false` in production
- only enable runtime schema sync in local development or short-lived preview environments

### Phase 1: Accounts and workspace claiming

Build:

- user auth
- account dashboard
- claim current anonymous workspace
- attach existing resumes to a signed-in user
- preserve the no-login first-run flow

Recommended auth:

- use Better Auth/Auth.js if control and low cost matter most
- use Clerk if speed and managed primitives matter most

Recommendation: start with Better Auth/Auth.js unless speed is more important than vendor control.

Exit criteria:

- a user can create anonymously, sign in later, and keep their resumes.

### Phase 2: Entitlements

Build:

- `billing_customers`
- `subscriptions`
- `entitlements`
- `usage_events`
- server-side branding gate
- server-side subdomain gate
- plan-aware PDF/export limits

Exit criteria:

- the app can enforce Free vs Pro without calling Stripe during render.

### Phase 3: Stripe payments

Build:

- Founder Pass checkout
- Annual Pro checkout
- Stripe Customer Portal
- webhook handlers
- local subscription cache
- local lifetime pass grant
- cancel/expire behavior

Recommended first checkout products:

- Founder Pass, `$100`, one-time, first 100 users
- Annual Pro, `$40/year`

Exit criteria:

- a user can pay and immediately receive the correct entitlements.

### Phase 4: Hosted identity

Build:

- wildcard `*.tiny.cv` routing
- `resume_domains`
- reserved names
- selected published resume per subdomain
- subscription grace period

Initial semantics:

- subdomain points to one selected published resume
- normal public URL remains as fallback
- if payment expires, subdomain disables after grace period

Exit criteria:

- Pro users can claim `name.tiny.cv` and point it at a resume.

### Phase 5: AI editing

Build:

- AI credit ledger
- AI usage events
- prompt templates
- diff preview
- apply/reject changes
- provider spend caps
- privacy disclosure

First actions:

- tighten bullets
- tailor to a job description
- fit one page
- improve summary
- convert rough notes to Tiny CV markdown

Rules:

- do not invent metrics
- do not silently mutate the resume
- do not log full raw resumes in app logs

Exit criteria:

- Pro users can spend credits on safe, reviewable edits.

### Phase 6: Agent path

Build:

- copy-paste agent instruction on the landing page and docs
- MCP setup guide
- x402/MPP create-and-publish endpoint
- x402/MPP PDF endpoint
- examples for Claude, Cursor, and OpenAI-style agents
- root `/openapi.json` discovery for AgentCash and MPPScan

Positioning:

> Your agent can finish the resume, not just write text in chat.

Exit criteria:

- an agent can discover `/openapi.json`, create, publish, and return a Tiny CV link through a documented paid flow.
- unpaid requests return protocol-correct `402` challenges and idempotent retries do not double-execute mutations.

### Phase 7: Developer platform, only if pulled

Only build this if real usage appears from products, coaches, bootcamps, or job tools.

Build:

- project dashboard
- API usage limits
- API paid plans
- webhook logs
- team ownership
- key rotation

Exit criteria:

- third-party products are using the API enough that billing and dashboard work has obvious demand.

## Landing Page Implications

The homepage should lead with:

- one-page resume builder
- clean public hosting
- multiple versions for different roles
- launch pricing once checkout exists

It should mention agents as:

- a small early proof point
- a copy-paste instruction
- a path to docs

It should not sound like:

- a generic developer platform
- resume infrastructure for everyone
- a complex API product before there is usage

## Open Questions

1. Should Founder Pass be sold before accounts exist, or wait until account claiming is finished?
2. Should Pro be annual-only at launch, or offer monthly later?
3. Should multiple versions live under one public profile page, or remain separate resume links?
4. Should `name.tiny.cv` route to a selected resume or a profile listing multiple versions?
5. Should AI credits be included in Pro from day one or sold as an add-on?
6. Should x402 be public at launch, or shown as an experimental agent path first?

## Recommended Next Slice

Build in this order:

1. Roadmap and public positioning update.
2. Production hardening for API jobs, webhooks, idempotency, and migrations.
3. Account claiming.
4. Entitlements.
5. Stripe checkout.
6. Subdomains.
7. AI credits.
8. x402 agent payments.
