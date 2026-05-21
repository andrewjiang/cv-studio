# Contributing

Thanks for contributing to Tiny CV.

## Before You Start

- Read the [README](README.md) for the supported local-development modes.
- Use the smallest setup that matches your task. Most UI and editor work does not require a database, Stripe, OAuth, or browser-backed PDF workers.
- Do not commit secrets, `.env.local`, `.data/`, or generated artifacts.

## Setup

Core local mode:

```bash
pnpm install
pnpm dev
```

Full-stack local mode:

```bash
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Use full-stack mode only when you need database-backed drafts, accounts, or the durable API.

## Workflow

- Prefer focused pull requests with one clear purpose.
- Add or update tests when behavior changes.
- Keep user-facing copy and docs aligned with the shipped behavior.
- If you touch auth, billing, machine payments, or worker flows, call out the risk area clearly in the PR description.

## Checks

Run the core checks before opening a PR:

```bash
pnpm test
pnpm lint
pnpm build
```

If your change touches browser-backed PDF jobs, account flows, billing, or publish-fit measurement, run the relevant integration checks as well:

```bash
pnpm test:account
pnpm test:api-fit
pnpm test:pdf
```

## Known Caveats

- In local file-backed mode, Turbopack may warn about NFT tracing because the development store reads and writes `.data/hosted-resumes.json`. The production build should still complete successfully.
- Local development includes a few secret fallbacks for convenience. Treat them as development-only and never rely on them for shared or production environments.

## Pull Request Notes

Please include:

- what changed
- how you tested it
- any env, migration, or rollout implications

If the change affects public APIs or docs, update the README or relevant docs in the same pull request.
