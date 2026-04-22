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

export const TINYCV_AGENT_GUIDE_PATH = "/agents";
export const TINYCV_AGENT_GUIDE_URL = "https://tiny.cv/agents";

export const TINYCV_AGENT_INSTRUCTION = `Read the Tiny CV documentation first: ${TINYCV_AGENT_GUIDE_URL}

Help me create a complete one-page resume in Tiny CV. Interview me for missing details, choose the best template, draft the markdown, validate it, publish the public link, and export a PDF if I ask.

Do not invent employers, dates, credentials, metrics, or links. Ask when something is missing.`;

export const TINYCV_AGENT_FINISH_GUIDE = `# Tiny CV Agent Guide

Use this guide when a user asks an agent to create, polish, publish, or export a resume with Tiny CV.

## Prime directive

${TINYCV_AGENT_INSTRUCTION}

## What Tiny CV is good at

- One-page resumes that stay readable.
- Markdown-first editing with a real paper preview.
- Built-in templates for engineer, designer, sales, and founder/operator profiles.
- Validation before publishing.
- Hosted public links and PDF export.
- A no-account Agent Finish endpoint for agents that can pay with x402 or MPP.

## Interview before drafting

Ask for missing facts before writing. Prefer source material over memory.

1. Target role: role title, companies, seniority, industry, and whether this is technical, creative, revenue, or founder/operator.
2. Source material: current resume, LinkedIn, portfolio, GitHub, personal site, job description, or notes.
3. Contact details: name, headline, location, email, phone if desired, and public links.
4. Work history: company, title, location, exact dates, scope, responsibilities, and why each role matters.
5. Impact: numbers the user can verify, such as revenue, users, latency, conversion, quota, hiring, fundraising, or time saved.
6. Projects or selected work: project name, technologies or context, the user's role, and outcomes.
7. Education and credentials: school, degree, dates, certifications, awards, and licenses.
8. Constraints: one-page priority, tone, confidential employers, links to omit, and whether the user wants a public link or PDF.

## Never invent

Do not invent employers, dates, degrees, credentials, metrics, awards, links, titles, locations, publications, patents, funding, customers, or quotas.

If a fact would make the resume stronger but is missing, ask. If the user cannot provide a number, use truthful scale language like "reduced manual review time" instead of making up a percentage.

## Template chooser

- Engineer: software engineers, product engineers, AI engineers, technical founders, developer relations, infrastructure, data, security, and engineering leadership. Best when the resume needs stacks, systems, products, projects, and quantified technical impact.
- Designer: product designers, brand designers, design engineers, researchers, creative directors, and portfolio-forward candidates. Best when selected work, craft, systems, and research process matter.
- Sales: account executives, founders doing GTM, customer success, growth, revenue ops, partnerships, and go-to-market roles. Best when pipeline, quota, ACV, segments, demos, close rates, and customer outcomes matter.
- Founder: founders, operators, chiefs of staff, product leaders, generalists, and people translating company-building work into a resume. Best when the story crosses product, hiring, fundraising, sales, and leadership.

If unsure, choose the template that matches the job the user wants next, not the job they had last. For technical builders default to engineer. For broad founder/operator stories default to founder.

## Drafting rules

- Keep the resume to one page.
- Lead with the target role and strongest proof.
- Use 2 to 4 bullets per recent role.
- Start bullets with concrete verbs.
- Prefer outcomes over task lists.
- Use metrics only when the user supplied or confirmed them.
- Remove weak filler like "responsible for", "helped with", and "worked on".
- Keep links real and public.
- Use markdown headings exactly: candidate name as \`#\`, sections as \`##\`, entries as \`###\`.

## Tiny CV workflow

1. Read the docs: \`${TINYCV_AGENT_GUIDE_URL}\`, \`/api/v1/spec/markdown\`, and \`/openapi.json\`.
2. Choose a template with \`GET /api/v1/templates\`.
3. Draft Tiny CV markdown using the chosen template and the markdown guide.
4. Validate with \`POST /api/v1/resumes/validate\` before publishing.
5. If the user only wants markdown, stop and show the markdown.
6. If the user wants a public link and the agent can pay, use \`POST /api/v1/paid/agent-finish\` with x402 or MPP.
7. If the user has a bearer API key, create a draft, publish it, and request a PDF only when asked.
8. Return the public URL, claim/edit URL if available, and PDF job or PDF URL if requested.

## Agent Finish endpoint

Use \`POST /api/v1/paid/agent-finish\` for a one-call, no-account paid path. It creates and publishes a standard hosted resume, returns a claim link, queues a PDF job, and persists a payment receipt.

Agent Finish does not grant a premium \`*.tiny.cv\` identity. The human needs Founder Pass or Pro for premium URL ownership.

## Final answer checklist

- State what facts were used and what was missing.
- Name the selected template and why.
- Return the public Tiny CV link if published.
- Return the PDF job or PDF link if requested.
- Give the user the edit claim link only when they should continue editing.
- Mention any facts that still need confirmation.
`;

export const TINYCV_AGENT_COOKBOOK = `# Tiny CV Agent Cookbook

## Happy path

1. Read the agent guide: ${TINYCV_AGENT_GUIDE_URL}
2. Interview the user for missing facts.
3. Choose the best template for the target role.
4. Fetch the markdown guide or JSON schema.
5. Draft a one-page resume without inventing facts.
6. Validate the payload.
7. Publish the draft only when the user wants a public link.
8. Request a PDF only when needed.

## Recommended workflow

- Use markdown if your agent already produces polished text.
- Use JSON if your agent starts from structured profile data.
- Do not invent employers, dates, credentials, metrics, or links.
- Send an \`Idempotency-Key\` on create, update, publish, and PDF job requests.
- Keep the public URL as the default output for end users.
- Only request an edit claim URL when the user should continue editing in Tiny CV.
- Use \`POST /api/v1/paid/agent-finish\` for a no-account paid call that returns a hosted resume, claim link, queued PDF job, and receipt.
- If a request returns \`429\`, wait for the \`Retry-After\` header before retrying.

## Example: JSON to published resume

1. \`GET /api/v1/spec/json-schema\`
2. \`POST /api/v1/resumes/validate\`
3. \`POST /api/v1/resumes\`
4. \`POST /api/v1/resumes/:resume_id/publish\`
5. \`POST /api/v1/resumes/:resume_id/pdf-jobs\`
6. \`GET /api/v1/pdf-jobs/:job_id\`
`;
