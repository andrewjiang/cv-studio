# CV Studio

CV Studio is a markdown-first resume builder for technical CVs.

It gives you a split editor and live preview, keeps the resume on a fixed paper surface, and fits the content to a single printable page before export. The source of truth is always markdown.

Live app: https://cvstudio-chi.vercel.app

![CV Studio desktop editor](docs/cv-studio-desktop.png)

## Why it exists

Most resume tools either lock you into rigid forms or give you a generic rich text editor that is hard to control. CV Studio takes a different approach:

- write the resume as markdown
- preview it on real paper dimensions
- keep the document to one page
- export a clean PDF from the browser

The goal is a resume tool that feels closer to working in code than fighting a template marketplace.

## Screenshots

### Editor and live preview

![Desktop editor and live preview](docs/cv-studio-desktop.png)

### Print-ready output

![Print-ready resume output](docs/cv-studio-print.png)

## Core features

- Markdown is the source of truth. The editor works from resume-oriented markdown instead of forms.
- Live preview renders on fixed `letter` or `legal` paper dimensions.
- One-page fit uses Pretext-assisted measurement plus DOM verification.
- PDF export uses the browser print flow and targets the resume sheet directly.
- Local-first draft management includes multiple drafts, rename, import, export, and autosave.
- Hosted resumes can be saved online, published, and shared with a clean public URL.
- Secret edit links let a resume owner reopen the hosted editor without a full auth system.
- Optional styling preferences live in markdown frontmatter and stay hidden unless you want them.
- Edit and publish modes let you switch between the writing surface and the clean resume view.

## How it works

CV Studio separates three things that most resume builders blend together:

1. Content
   The resume body is plain markdown.
2. Presentation
   Paper size, page margin, divider rules, fonts, and baseline sizing live in frontmatter.
3. Fit
   The app estimates layout with Pretext, then verifies the result against the actual DOM before export.

That split is what makes the preview, print output, and markdown source line up consistently.

## Hosted resumes

CV Studio now supports a simple hosted workflow:

- `Create link` creates a hosted resume and gives the draft a stable edit URL.
- `Publish` snapshots the current draft to a public slug route.
- `/:slug` renders a clean public resume page.
- `/studio/:id?token=...` reopens the hosted editor.

For local development without a database, CV Studio falls back to a file-backed store in `.data/hosted-resumes.json`.

## Resume markdown format

The default structure is intentionally simple:

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
### CV Studio | React, Next.js, TypeScript
- Built a markdown-first resume editor with one-page preview and PDF export.
```

Optional style preferences live in frontmatter:

```md
---
displayFont: serif
bodyFont: sans
baseSize: 0.985
pageMargin: 1
pageSize: letter
showHeaderDivider: false
showSectionDivider: true
---
```

## Local development

Install dependencies and start the app:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

If a dev server for this workspace is already running, `pnpm dev` will reuse it. If you want a clean restart:

```bash
pnpm dev:restart
```

## Verification

```bash
pnpm lint
pnpm build
pnpm start
```

## Production database

To enable hosted save and publish in production, set:

```bash
DATABASE_URL=...
```

The app is written to use Postgres in production and a local file-backed store in development when `DATABASE_URL` is not set.

## PDF export

Use `Download PDF` in the app. CV Studio prints only the resume sheet, not the surrounding editor UI, and preserves the fitted content scale for export.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- `@chenglou/pretext` for layout estimation
- `react-markdown` and `remark-gfm` for markdown rendering

## Status

CV Studio is local-first by default, with hosted resume save/publish available when storage is configured. The next major step is adding full user accounts on top of the current secret-link editor model.
