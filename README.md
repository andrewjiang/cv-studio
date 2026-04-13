# CV Studio

Markdown-first resume builder for technical CVs.

CV Studio gives you:
- a left-side markdown editor as the source of truth
- a right-side live preview on fixed paper dimensions
- one-page fit logic using Pretext-assisted measurement plus DOM verification
- local draft persistence, import/export, and print-to-PDF output

## Development

From the repo root:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

If a dev server for this workspace is already running, `pnpm dev` will reuse it.
If you want a clean restart instead:

```bash
pnpm dev:restart
```

## Production Check

```bash
pnpm lint
pnpm build
pnpm start
```

## Authoring Model

Markdown is the source of truth. The app expects a resume-oriented structure:

```md
# Name
Headline
Location | email | links

## Summary
Short summary paragraph.

## Experience
### Role | Company
*Location | Dates*
- Measurable impact bullet
```

Optional styling preferences live in markdown frontmatter and can be toggled in the UI.

## PDF Export

Use `Download PDF` in the app. The browser print dialog opens with the resume sheet as the print surface.
