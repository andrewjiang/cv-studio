---
title: "The safest way to let an AI agent edit your resume"
description: "Agents can improve a resume, but only if they work from real evidence, propose reviewable edits, and never get permission to invent facts."
date: "2026-05-23"
author: "Andrew Jiang"
category: "Agents"
slug: "ai-agent-edit-resume-safely"
heroImage: "/blog/ai-agent-edit-resume-safely-hero.webp"
---

The safest way to let an AI agent edit your resume is to make it edit evidence, not invent a candidate.

That sounds obvious until you watch what happens when an agent starts with a blank prompt:

> Make my resume better.

Better how? For which role? Based on what facts? With what limits?

Without boundaries, the agent will often do the thing resumes least need: make plausible language out of incomplete evidence.

The right workflow is different. Give the agent a source of truth, a target role, and a hard rule: every claim must be traceable to something the human recognizes as true.

## The agent is not the source of truth

Your resume's source of truth should exist before the agent touches it.

That source can be a Tiny CV markdown draft, an old resume, a LinkedIn export, a portfolio, project notes, a deal sheet, a GitHub profile, or a private work-history document. The key is that the agent is editing from evidence, not guessing from vibes.

Harvard and MIT both frame resumes around clear, relevant, fact-based presentation of experience.[^harvard][^mit] An agent can help with clarity and relevance. It cannot supply the experience.

Use this rule:

> The agent can change phrasing. The human must confirm facts.

That line prevents most of the damage.

## Give the agent the job, the draft, and the constraints

Do not ask for a better resume in general.

Ask for a better resume for a specific reader.

The minimum prompt should include:

- The target role or job description.
- The current resume or Tiny CV markdown.
- Any source notes, project notes, links, or metrics.
- What facts are unverified.
- What the agent is allowed to change.
- What the agent must ask before changing.

CareerOneStop recommends targeting a resume to the job so employers can find the relevant qualifications quickly.[^careeronestop] That is a good use for an agent. It can compare the target role against the draft and suggest what to move up, cut, or clarify.

But the agent should not silently create new achievements.

Use a prompt like this:

```text
You may improve clarity, order, and phrasing.
Do not invent employers, dates, titles, metrics, tools, customers, credentials, or outcomes.
Show me proposed edits as before/after bullets.
Mark any claim that needs confirmation.
Ask before publishing, exporting, or paying for anything.
```

## Use diffs, not rewrites

The safest agent output is a proposed edit, not a replacement document.

Ask for:

- Keep / cut / rewrite recommendations.
- Before-and-after bullets.
- A list of missing facts.
- A list of claims that need confirmation.
- A final markdown draft only after review.

This mirrors how a good human editor works. They do not take your career and hand back a stranger's story. They show you where the story is unclear.

Tiny CV works well here because the resume is markdown. An agent can propose changes in text, and you can review them before publishing a public link or exporting a PDF.

If you do not already have one trusted base, start with [your resume needs a source of truth](/blog/resume-source-of-truth).

## Never let the agent invent these

Some resume details are too important to autocomplete.

Do not let an agent invent:

| Never invent | Why |
| --- | --- |
| Employers | Background checks and references can expose mismatches. |
| Titles | Level inflation creates interview and verification risk. |
| Dates | Small drift across versions looks careless. |
| Degrees or credentials | These are binary facts. |
| Metrics | A fake number is worse than no number. |
| Customers or logos | Confidentiality and truth both matter. |
| Awards, patents, publications, funding | These are easy to verify and hard to excuse. |
| Tools you cannot use | Keyword matching is not worth interview failure. |

NIST's AI Risk Management Framework emphasizes governing, mapping, measuring, and managing AI risks.[^nist] For resume work, the risk is not abstract. It is a false claim attached to your name.

The agent needs a narrower job.

It should help you say true things more clearly.

## The review checklist before publishing

Before you publish or send an agent-edited resume, run this checklist:

1. Can I explain every metric?
2. Did every employer, title, and date remain accurate?
3. Did the agent change any scope words, such as "owned," "led," "managed," or "built"?
4. Did the agent add tools or domains I only touched lightly?
5. Did any bullet become too broad to defend?
6. Did the resume still fit the target role?
7. Would a former manager recognize this version as true?

NACE's career-readiness competencies include career and self-development, communication, critical thinking, equity and inclusion, leadership, professionalism, teamwork, and technology.[^nace] Those are useful editing lenses. But they are not permission to add a leadership claim where you only attended a meeting.

If the agent makes the resume sound more senior than the evidence supports, reject the edit.

Here is the difference:

| Raw note | Acceptable edit | Reject |
| --- | --- | --- |
| Helped support team with repeated billing bugs | Grouped repeated billing bug reports into clear reproduction notes for engineering triage | Led billing reliability improvements that reduced churn |
| Updated onboarding docs | Reworked onboarding notes into a manager-reviewed checklist | Improved onboarding efficiency by 40% |
| Joined customer calls with PM | Took notes from customer calls and summarized recurring setup issues for product planning | Owned customer research program |

The acceptable edit makes the work clearer. The rejected edit adds authority the evidence does not support.

## A safe Tiny CV agent workflow

Use this sequence:

1. **Create the baseline.** Put your real resume into Tiny CV markdown.
2. **Add private evidence notes.** Keep notes under bullets while drafting.
3. **Give the agent the target role.** Include the job description or role summary.
4. **Ask for a gap review first.** Do not ask for a full rewrite yet.
5. **Approve the direction.** Decide which sections to emphasize.
6. **Ask for proposed bullet edits.** Require before/after format.
7. **Confirm facts.** Reject anything you cannot defend.
8. **Preview the page.** Make sure the one-page version still works.
9. **Publish or export.** Public link for people, PDF for systems.

The public/private boundary matters. UC Davis career guidance recommends keeping sensitive personal details off the resume and preparing references separately.[^ucdavis] The same idea applies to agent workflows: keep private evidence in the draft, but publish only the clean resume.

Tiny CV's role in this is not to make the agent magical.

It is to make the handoff inspectable.

If the agent edits make the resume too long, use the principle in [a one-page resume is a forcing function](/blog/one-page-resume-forcing-function): cut weaker evidence before shrinking the page.

## What a good agent should ask

A good resume agent should ask annoying questions.

It should ask:

- What role are we targeting?
- Which facts are confirmed?
- Which metrics are exact?
- Which metrics are estimates?
- What should stay private?
- Do you want a public link, PDF, or just markdown?
- Should I stop for approval before publishing?

If the agent never asks anything, it is probably filling gaps itself.

That is the behavior to avoid.

## The standard

Let agents improve structure, emphasis, clarity, and fit.

Do not let them own truth.

A strong resume is not the most impressive version an AI can imagine. It is the strongest version you can defend.

[^harvard]: Harvard FAS Mignone Center for Career Success, "Create a Resume/CV or Cover Letter," https://careerservices.fas.harvard.edu/channels/create-a-resume-cv-or-cover-letter/
[^mit]: MIT Career Advising & Professional Development, "Resumes," https://capd.mit.edu/resources/resumes/
[^careeronestop]: CareerOneStop, U.S. Department of Labor, "Target your resume," https://www.careeronestop.org/HowTo/FindAJobNow/target-your-resume.aspx
[^nist]: National Institute of Standards and Technology, "AI Risk Management Framework," https://www.nist.gov/itl/ai-risk-management-framework
[^nace]: National Association of Colleges and Employers, "What is Career Readiness?", https://www.naceweb.org/career-readiness/competencies/career-readiness-defined/
[^ucdavis]: UC Davis Career Center, "Resumes," https://careercenter.ucdavis.edu/resumes-and-materials/resumes
