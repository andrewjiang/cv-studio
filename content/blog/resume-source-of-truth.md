---
title: "Your resume needs a source of truth"
description: "Multiple resume versions are useful only when they come from one trusted record of your roles, dates, proof, links, and claims."
date: "2026-05-24"
author: "Andrew Jiang"
category: "Career Materials"
slug: "resume-source-of-truth"
heroImage: "/blog/resume-source-of-truth-hero.webp"
---

Your resume needs a source of truth before it needs another version.

Most job seekers do not have one resume. They have fragments: a LinkedIn profile, an old PDF, a personal site, a recruiter version, a role-specific version, a notes doc, a folder of files named "final," and a memory of what they meant to update later.

That is how mistakes enter the job search.

A title changes in one place but not another. A date drifts. A metric gets rounded twice. A project disappears from the PDF but stays on LinkedIn. An agent rewrites a bullet and nobody remembers whether the number was real.

The fix is not fewer versions.

The fix is one trusted source.

## Versions are good. Drift is bad.

Role-specific resumes are useful because different readers need different proof.

A product role may need launch judgment and customer work. A platform role may need systems, reliability, and technical depth. A founder/operator role may need hiring, fundraising, sales, and messy cross-functional ownership.

The facts should not change across those versions.

The emphasis should.

This is the central Tiny CV idea: keep the resume close to the document itself. Markdown is not magic, but it is inspectable. You can see the headings, dates, bullets, links, and edits. You can duplicate a version without losing the underlying story.

That matters because the resume is not just a file. It is a claim record.

## What belongs in the source of truth

A resume source of truth is not necessarily the public resume.

It can be a private markdown file, a Tiny CV draft, or a structured notes document. The point is that every public version traces back to it.

Keep these fields stable:

| Record | Why it matters |
| --- | --- |
| Company names | Avoids mismatches across PDF, LinkedIn, and background checks. |
| Titles | Keeps scope and level consistent. |
| Dates | Prevents accidental drift between versions. |
| Locations or remote status | Helps explain context without over-sharing. |
| Metrics | Keeps numbers defensible. |
| Links | Prevents stale portfolios, GitHub URLs, or public CV links. |
| Project claims | Keeps agent edits grounded in real work. |
| Education and credentials | Prevents casual phrasing from becoming inaccurate. |

University career centers consistently frame resumes around clear, accurate, relevant presentation of experience.[^harvard][^mit] That sounds basic until you manage five versions at once.

Accuracy is not only about avoiding lies.

It is about avoiding accidental inconsistency.

## Keep private evidence next to public claims

The public resume should be concise.

The private source can be messy.

That is where you keep the story behind the bullet:

- Where did the number come from?
- Which dashboard or report supports it?
- Which teammate or manager would remember it?
- What was the before state?
- What changed after?
- Which version of the resume used this claim?

This is especially important when metrics are involved. NACE's career-readiness framework names career and self-development, communication, critical thinking, equity and inclusion, leadership, professionalism, teamwork, and technology as competencies.[^nace] Many of those are proven through context, not neat percentages.

If the proof is non-numeric, write down the evidence while you still remember it.

That evidence note is the difference between a true bullet and a polished guess.

Here is what one source-of-truth entry can look like:

```md
### Product Engineer | ExampleCo
*San Francisco, CA | 2022 - 2025*
- Shipped account settings, onboarding, and billing fixes across React and TypeScript.

Private evidence:
- Account settings shipped with design + support review.
- Onboarding fixes came from repeated setup tickets.
- Billing fixes were mostly form validation and retry states.
- Do not claim ownership of pricing or database architecture.
```

The public resume gets the bullet. The private source keeps the boundary.

So will any agent helping with edits.

## Agents need boundaries, not blank pages

An AI agent is much better at editing a trusted source than inventing a career from scratch.

Give the agent your source of truth and constraints:

- Do not invent employers.
- Do not invent dates.
- Do not invent metrics.
- Do not invent degrees, awards, customers, funding, or titles.
- Suggest edits as diffs.
- Ask when evidence is missing.
- Keep claims interview-defensible.

The National Institute of Standards and Technology describes AI risk management in terms of governance, mapping, measuring, and managing risks.[^nist] In resume work, the practical version is simple: define what the agent is allowed to change before it changes anything.

Tiny CV's agent workflow should start from that premise. The agent can tighten bullets, adapt emphasis, and produce a cleaner draft. The human still owns the truth.

For a deeper workflow, read [the safest way to let an AI agent edit your resume](/blog/ai-agent-edit-resume-safely).

## The source-of-truth workflow

Use this workflow before creating role-specific resumes:

1. **Create the canonical draft.** Put the accurate roles, dates, links, education, and stable bullets in one place.
2. **Add private evidence notes.** Keep notes under bullets while drafting. Remove them from the published version.
3. **Create a role-specific copy.** Change ordering and emphasis, not facts.
4. **Name the version clearly.** Use names like `baseline`, `product-engineer`, `founder-operator`, or `sales-lead`.
5. **Export or publish from the version.** PDF for systems, public link for people.
6. **Backport real improvements.** If a role-specific version produces a better truthful bullet, move it into the source.

CareerOneStop recommends tailoring resumes to the job and making it easy for employers to find relevant qualifications.[^careeronestop] That does not require a new identity for every application. It requires a stable base and disciplined edits.

Tiny CV is built for this because the source is readable. The preview shows the page. The public link can stay clean. The PDF can be exported when a system asks for a file.

That is the same reason [a one-page resume works as a forcing function](/blog/one-page-resume-forcing-function): it makes the document choose without changing the underlying facts.

## What to publish

Do not publish the source of truth.

Publish the selected version.

The source may include private notes, old bullets, rough metrics, scratch evidence, and role ideas that do not belong in public. The published resume should be the clean version for a reader.

UC Davis career guidance recommends city and state rather than requiring a full address, excludes sensitive personal details, and keeps references off the resume until needed.[^ucdavis] That is the same privacy principle: public materials should contain what helps the hiring process, not every piece of background context.

Keep the source rich.

Keep the public version focused.

## The real benefit

A source of truth makes the job search calmer.

Not easy. Calmer.

You stop wondering which PDF is current. You stop rewriting from memory. You stop letting an agent improvise facts. You stop discovering three different date ranges for the same role.

You can still make versions.

You just know where they came from.

[^harvard]: Harvard FAS Mignone Center for Career Success, "Create a Resume/CV or Cover Letter," https://careerservices.fas.harvard.edu/channels/create-a-resume-cv-or-cover-letter/
[^mit]: MIT Career Advising & Professional Development, "Resumes," https://capd.mit.edu/resources/resumes/
[^nace]: National Association of Colleges and Employers, "What is Career Readiness?", https://www.naceweb.org/career-readiness/competencies/career-readiness-defined/
[^nist]: National Institute of Standards and Technology, "AI Risk Management Framework," https://www.nist.gov/itl/ai-risk-management-framework
[^careeronestop]: CareerOneStop, U.S. Department of Labor, "Target your resume," https://www.careeronestop.org/HowTo/FindAJobNow/target-your-resume.aspx
[^ucdavis]: UC Davis Career Center, "Resumes," https://careercenter.ucdavis.edu/resumes-and-materials/resumes
