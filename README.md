# Tiny CV

Tiny CV is an open-source, markdown-first resume builder that keeps your resume on one printable page.

Write in markdown, tune the styling with a few safe controls, preview the result on a real sheet of paper, and publish a clean public link when it is ready.

Live app: https://cvstudio-chi.vercel.app

![Tiny CV desktop editor](docs/cv-studio-desktop.png)

## Why it feels different

Most resume tools are either:

- rigid form builders
- generic rich text editors
- template marketplaces with too many knobs and not enough structure

Tiny CV is built around a simpler model:

- markdown is the source of truth
- the preview lives on fixed paper dimensions
- fitting to one page is automatic
- the published version stays focused on the resume itself

It is designed for people who would rather edit a document than fight a WYSIWYG.

## What it does

- Markdown-first editing with a live paper preview
- One-page fit using Pretext-assisted estimation plus DOM verification
- Letter and legal page support
- Style presets for different resume moods without breaking printability
- PDF export from the browser print flow
- Server-backed anonymous workspaces, so drafts survive refreshes and browser back
- Public share links and private edit links
- Resume templates for engineers, designers, sales roles, and founders
- Mobile editing and mobile resume viewing that are adapted for smaller screens

## Screenshots

### Editor

![Desktop editor and preview](docs/cv-studio-desktop.png)

### Print output

![Print-ready resume output](docs/cv-studio-print.png)

## How it works

Tiny CV keeps three concerns separate:

1. Content
   The resume body is plain markdown.
2. Presentation
   Fonts, dividers, density, paper size, and margins live in frontmatter and UI controls.
3. Fit
   The app estimates scale, measures the real DOM, and adjusts until the resume fits the printable area.

That separation is what keeps the editor, preview, PDF export, and shared page aligned.

## Hosted model

Tiny CV is now fully server-backed.

- Every browser gets an anonymous workspace via an `httpOnly` cookie
- Drafts live in the database, not `localStorage`
- `/studio/[resumeId]` is the editor route
- `/:slug` is the public published resume
- Private edit links can attach an existing resume back into the current workspace

For local development without a database, the app falls back to a file-backed store in `.data/hosted-resumes.json`.

## Resume format

The core markdown shape is intentionally small:

```md
# Your Name
Headline
City, ST | [email@example.com](mailto:email@example.com) | [linkedin.com/in/you](https://linkedin.com)

## Summary
Short summary paragraph.

## Experience
### Staff Software Engineer | Example Company
*Remote | 2022 - Present*
- Shipped measurable result
- Improved something important

## Projects
### Tiny CV | React, Next.js, TypeScript
- Built a markdown-first resume editor with one-page preview and PDF export.
```

Optional style preferences are stored in frontmatter:

```md
---
stylePreset: technical
accentTone: forest
density: compact
headerAlignment: left
pageMargin: 0.9
pageSize: letter
showHeaderDivider: false
showSectionDivider: true
---
```

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

If you want a clean dev restart:

```bash
pnpm dev:restart
```

## Environment

Create `.env.local` only if you want a real database in development:

```bash
DATABASE_URL=postgresql://...
```

Without `DATABASE_URL`, Tiny CV uses a local file-backed store for development.

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Postgres
- `@chenglou/pretext`
- `react-markdown`
- `remark-gfm`
- Vitest

## Roadmap

- Full account system on top of the current anonymous workspace model
- Better template previews
- More share-page customization
- Cleaner import/export flows for existing resumes

## License

MIT
