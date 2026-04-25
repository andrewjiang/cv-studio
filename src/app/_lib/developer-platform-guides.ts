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
- The next non-empty line is treated as the headline unless it looks like contact info. Keep it under 80 characters for publish-ready resumes.
- Contact info can be plain text or markdown links and is usually separated with \`|\`.
- Always include \`## Summary\` for publish-ready resumes.
- Top-level sections use \`##\`.
- Resume entries inside sections use \`###\`.
- For experience-like sections, entry metadata goes on the next italic line in the form \`*Location, Remote, or website | Dates*\`.
- Education may use a date-only italic line.
- Project-like sections may omit metadata entirely.
- Bullets should be separate lines beginning with \`-\`. Tiny CV also parses \`*\`, \`•\`, \`–\`, and \`—\` line bullets, but agents should emit \`-\`.
- Do not write inline dot-separated lists like \`Role one • Role two • Role three\`.
- A \`Skills\` section should use \`Label: value\` rows.
- Treat validation errors as blockers before publish or payment.

## Headline vs Summary

The line after the candidate name is a short headline, not a summary.
Keep it under 80 characters.

Good:

\`\`\`md
# Andrew Jiang
Founder & Product Operator

## Summary
Builder and founder with deep business development, product, design, and engineering experience. YC alum.
\`\`\`

Bad:

\`\`\`md
# Andrew Jiang
Builder and founder with deep business development and product management experience, plus generalist design and engineering chops. YC alum.
\`\`\`

## Lists and bullets

Use separate markdown bullet lines. Do not use inline dot separators.

Good:

\`\`\`md
## Additional Experience
- Product Manager, Sprig (2015 - 2016)
- Cofounder and CEO, Bayes Impact (Apr 2014 - Apr 2015)
- Private Equity Associate, American Securities (Aug 2012 - Feb 2014)
- Consultant, Boston Consulting Group (2010 - 2012)
\`\`\`

Bad:

\`\`\`md
## Additional Experience
Product Manager, Sprig (2015 - 2016) • Cofounder and CEO, Bayes Impact ...
\`\`\`

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

## Experience metadata structure

Good:

\`\`\`md
## Experience
### Founder & Investor | Weekend Fund
*Miami, FL | Apr 2017 - Present*
- Founded an early-stage venture fund focused on backing emerging startups.
\`\`\`

Also acceptable:

\`\`\`md
## Experience
### Writer | ryanhoover.me
*[ryanhoover.me](https://ryanhoover.me) | Jun 2012 - Present*
- Publishes essays on tech, products, and curiosity.
\`\`\`

Bad:

\`\`\`md
## Experience
### Founder & Investor | Weekend Fund
*Apr 2017 - Present*
- Founded an early-stage venture fund focused on backing emerging startups.
\`\`\`

For experience-like sections, the italic line should be \`*Location, Remote, or website | Dates*\`.

## Education structure

\`\`\`md
## Education
### University of Oregon Lundquist College of Business
*2005 - 2009*
B.S., Entrepreneurship Concentration; Minor in Computer Information Technology
\`\`\`

Education may use a date-only italic line.

## Projects / selected work structure

\`\`\`md
## Projects
### Tiny CV Agent Finish | Next.js, TypeScript, PostgreSQL
- Designed an idempotent API flow that turns markdown into a hosted resume, claim link, and queued PDF job.
\`\`\`

Project-like sections may omit metadata entirely.

## Full examples

- \`GET /api/v1/templates/engineer\`
- \`GET /api/v1/templates/designer\`
- \`GET /api/v1/templates/sales\`
- \`GET /api/v1/templates/founder\`
- \`https://tiny.cv/examples/engineer\`
- \`https://tiny.cv/examples/designer\`
- \`https://tiny.cv/examples/sales\`
- \`https://tiny.cv/examples/founder\`

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

export const TINYCV_AGENT_INSTRUCTION = `Read the Tiny CV agent guide first: ${TINYCV_AGENT_GUIDE_URL}

Help me create a complete one-page Tiny CV resume. Follow the guide, ask for missing facts, do not invent anything, and only publish, pay, or export a PDF after I approve the final draft.`;

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
- Claim links that hand an API-created resume back to a human for markdown editing.
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
9. Handoff: whether the user wants to keep editing the markdown themselves in Tiny CV.

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
- Keep the headline under 80 characters and move narrative positioning into \`## Summary\`.
- Always include a \`## Summary\` section before publishing.
- Use separate \`-\` bullet lines. Do not use inline \`•\` lists.

## Entry structure by section

Experience:

\`\`\`md
### Role | Company
*Location, Remote, or website | Dates*
- Bullet
\`\`\`

Education:

\`\`\`md
### School | Degree
*Dates*
\`\`\`

Projects:

\`\`\`md
### Project | Stack
- Bullet
\`\`\`

In experience-like sections, do not use a date-only italic line. Put location, Remote, or website on the left and dates on the right.

## Publish-ready markdown checklist

- \`#\` candidate name.
- Headline under 80 characters.
- Contact line under the headline.
- \`## Summary\` with one concise paragraph.
- \`## Experience\` with \`###\` entries.
- Experience metadata uses \`*Location, Remote, or website | Dates*\`.
- Separate \`-\` bullet lines.
- No inline \`•\` or \`·\` lists.
- Validate with \`quality_gate: "publish"\`.

## Tiny CV workflow

1. Read the docs: \`${TINYCV_AGENT_GUIDE_URL}\`, \`/api/v1/spec/markdown\`, and \`/api/v1/openapi.json\`. Use \`/openapi.json\` for paid x402/MPP discovery.
2. Choose a template with \`GET /api/v1/templates\`.
3. Draft Tiny CV markdown using the chosen template, the markdown guide, and the full examples at \`/examples/engineer\`, \`/examples/designer\`, \`/examples/sales\`, and \`/examples/founder\`.
4. Validate with \`POST /api/v1/resumes/validate\` using \`quality_gate: "publish"\` before publishing or paying.
5. If the user only wants markdown, stop and show the markdown.
6. If the user wants a public link and the agent can pay, use \`POST /api/v1/paid/agent-finish\` with x402 or MPP.
7. If the user has a bearer API key, create a draft, publish it, and request a PDF only when asked.
8. Return the public URL, claim/edit URL if available, and PDF job or PDF URL if requested.

## Review before publish or payment

Before publishing a public resume, queuing a paid Agent Finish call, or spending x402/MPP funds, show the user:

- The selected template and why it fits the target role.
- The final markdown.
- Any missing or unverified facts.
- The next action: publish public link, charge Agent Finish, queue PDF, return edit link, or stop at markdown.

Ask for explicit approval unless the user already clearly authorized autonomous publishing and payment. If the user wants to edit the markdown themselves, request or return the Tiny CV edit claim link instead of treating the agent draft as final.

Resolve validation errors before asking the user to approve publish/payment.

## Human editing handoff

Use an edit claim link when the user wants to keep editing the markdown directly in Tiny CV.

- Bearer API: set \`return_edit_claim_url: true\` on \`POST /api/v1/resumes\` to create a draft with \`editor_claim_url\`, or on \`POST /api/v1/resumes/{resume_id}/publish\` to publish and return \`editor_claim_url\`.
- Paid Agent Finish: \`POST /api/v1/paid/agent-finish\` always returns \`claim.editor_claim_url\` and \`resume.editor_claim_url\`.
- Lower-level paid create: \`POST /api/v1/paid/resumes\` returns \`resume.editor_claim_url\` by default unless \`return_edit_claim_url\` is explicitly false.
- The claim link is one-time and expires after seven days.
- When the human opens the claim link, Tiny CV attaches the resume to their browser workspace and opens the markdown editor. They can then sign up or sign in and claim that browser workspace into their account.

## Agent Finish endpoint

Use \`POST /api/v1/paid/agent-finish\` for a one-call, no-account paid path. It creates and publishes a standard hosted resume, returns a claim link, queues a PDF job, and persists a payment receipt.

Agent Finish does not grant a premium \`*.tiny.cv\` identity. The human needs Founder Pass or Pro for premium URL ownership.

## Final answer checklist

- State what facts were used and what was missing.
- Name the selected template and why.
- Return the public Tiny CV link if published.
- Return the PDF job or PDF link if requested.
- Give the user the edit claim link when they should continue editing the markdown themselves.
- Mention any facts that still need confirmation.
`;

export const TINYCV_AGENT_COOKBOOK = `# Tiny CV Agent Cookbook

## Happy path

1. Read the agent guide: ${TINYCV_AGENT_GUIDE_URL}
2. Interview the user for missing facts.
3. Choose the best template for the target role.
4. Fetch the markdown guide or JSON schema.
5. Draft a one-page resume without inventing facts.
6. Validate the payload with \`quality_gate: "publish"\` before publish or payment.
7. Publish the draft only when the user wants a public link.
8. Request a PDF only when needed.

## Recommended workflow

- Use markdown if your agent already produces polished text.
- Use JSON if your agent starts from structured profile data.
- Do not invent employers, dates, credentials, metrics, or links.
- Send an \`Idempotency-Key\` on create, update, publish, and PDF job requests.
- Experience entries should use \`### Role | Company\` and then \`*Location, Remote, or website | Dates*\`.
- Education entries can use a date-only italic line.
- Projects and selected work can omit metadata.
- If validation returns an experience metadata error, fix the italic line before publish or payment.
- Before publishing or paying, show the selected template, final markdown, unverified facts, and next action. Ask for approval unless the user already authorized autonomous publish/payment.
- Resolve validation errors before asking the user to approve publish/payment.
- Keep the public URL as the default output for end users.
- Request an edit claim URL when the user should continue editing markdown in Tiny CV, then return that link with the public URL.
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
