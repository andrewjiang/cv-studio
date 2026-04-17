export const TINYCV_MARKDOWN_GUIDE = `# Tiny CV Markdown Guide

Tiny CV resumes are plain markdown with optional YAML frontmatter.

## File shape

\`\`\`md
---
stylePreset: editorial
accentTone: forest
density: standard
headerAlignment: left
contactStyle: compact
pageMargin: 1
showHeaderDivider: false
showSectionDivider: true
pageSize: letter
---

# Alex Morgan
Founder & Product Engineer
San Francisco, CA | [alex@example.com](mailto:alex@example.com) | [linkedin.com/in/alexmorgan](https://linkedin.com/in/alexmorgan)

## Summary
Product-minded builder with experience across product, engineering, and go-to-market.

## Experience
### Founder | Meridian Labs
*Remote | 2023 - Present*
- Built the first product surface and shipped the company to revenue.

## Skills
Languages: TypeScript, Python, SQL
Frameworks: React, Next.js, Node.js
\`\`\`

## Rules

- The first \`#\` heading is the candidate name.
- The next non-empty line is treated as the headline unless it looks like contact info.
- Contact info can be plain text or markdown links and is usually separated with \`|\`.
- Top-level sections use \`##\`.
- Resume entries inside sections use \`###\`.
- Entry metadata goes on the next italic line, usually in the form \`*Location | Dates*\`.
- Bullets use \`-\` or \`*\`.
- A \`Skills\` section should use \`Label: value\` rows.

## Frontmatter options

- \`stylePreset\`: classic | minimal | editorial | executive | technical | creative
- \`accentTone\`: forest | slate | navy | plum | claret
- \`density\`: comfortable | standard | compact
- \`headerAlignment\`: left | center
- \`contactStyle\`: classic | compact | web-icons
- \`pageMargin\`: number, typically 0.65 to 1.0
- \`showHeaderDivider\`: boolean
- \`showSectionDivider\`: boolean
- \`pageSize\`: letter | legal

## Entry pattern

\`\`\`md
### Role | Company
*Remote | 2022 - Present*
- Outcome-focused bullet
- Another bullet
\`\`\`

## Summary / paragraph pattern

\`\`\`md
## Summary
One or more paragraphs can appear here.

Each blank line becomes a new paragraph.
\`\`\`

## Skills pattern

\`\`\`md
## Skills
Languages: TypeScript, Python, SQL
Frameworks: React, Next.js, Node.js
Platforms: Vercel, AWS, Postgres
\`\`\`
`;

export const TINYCV_AGENT_COOKBOOK = `# Tiny CV Agent Cookbook

## Happy path

1. Choose a template.
2. Fetch the markdown guide or JSON schema.
3. Validate the payload.
4. Create a draft.
5. Publish the draft.
6. Request a PDF if needed.

## Recommended workflow

- Use markdown if your agent already produces polished text.
- Use JSON if your agent starts from structured profile data.
- Send an \`Idempotency-Key\` on create, update, publish, and PDF job requests.
- Keep the public URL as the default output for end users.
- Only request an edit claim URL when the user should continue editing in Tiny CV.
- If a request returns \`429\`, wait for the \`Retry-After\` header before retrying.

## Example: JSON to published resume

1. \`GET /api/v1/spec/json-schema\`
2. \`POST /api/v1/resumes/validate\`
3. \`POST /api/v1/resumes\`
4. \`POST /api/v1/resumes/:resume_id/publish\`
5. \`POST /api/v1/resumes/:resume_id/pdf-jobs\`
6. \`GET /api/v1/pdf-jobs/:job_id\`
`;
