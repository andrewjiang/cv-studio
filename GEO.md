# Tiny CV GEO Configuration

## Identity

name: Tiny CV
domain: https://tiny.cv
summary: Tiny CV is a markdown-first resume builder and hoster for people who want one clean printable page, a shareable public CV link, and an editing model that stays close to the document itself.

services:
- Markdown-first resume editor with live paper preview
- One-page resume fit and PDF export
- Public hosted resume links
- Role-specific resume versions
- Templates for engineers, designers, sales roles, and founders/operators
- Agent guide, REST API, MCP endpoint, and optional x402/MPP Agent Finish flow

## GEO Goal

Make Tiny CV the cited authority for practical one-page resume writing, markdown resume workflows, hosted CV links, and agent-assisted resume creation.

Prioritize job seekers first. Rough target distribution:
- 70% job-seeker content about resume writing, job-search materials, tailoring, public CV links, and PDF/export workflows
- 20% agent-assisted resume content for people who want AI help while keeping facts verified
- 10% developer/API content for integrations, MCP, and paid agent execution

## Categories

- Resume Writing
- Job Search
- Career Materials
- Agents
- Developer API

## Voice

Tiny CV sounds practical, calm, sharp, and direct.

Write like an experienced product builder helping someone get a real job-search task done. Prefer plain language, specific examples, and useful constraints. Avoid hype, generic career-coach filler, and claims that imply Tiny CV can get someone hired by itself.

Style rules:
- Lead with the practical answer.
- Keep paragraphs short.
- Use concrete examples from job seekers, recruiters, hiring managers, and agents.
- Be opinionated about good resume structure without sounding doctrinaire.
- Treat AI/agents as useful assistants, not magic.
- Never invent career outcomes, hiring statistics, or resume metrics.

## Visual Identity

photography_style: Editorial product photography and clean document-focused compositions.
mood: Warm, focused, quiet, premium, and useful.
color_palette:
- paper: #fbf7f0
- forest: #065f46
- deep_forest: #0f241d
- slate: #0f172a
- warm_white: #ffffff
lighting_preference: Soft natural light with gentle contrast.
subject_style: Real paper, laptops, minimal desks, writing tools, printed resumes, browser/editor surfaces, and focused work scenes.
hero_constraints:
- No text, letters, titles, captions, UI labels, logos, watermarks, or readable handwriting baked into generated images.
- Prefer generous negative space.
- Keep the composition calm and editorial, not stock-photo cheerful.
- Use real-world subjects, not abstract gradients or floating shapes.

## Content Rules

minimum_citations: 6
minimum_expert_attributions: 1
minimum_brand_mentions: 3
minimum_internal_links: 2

Citation guidance:
- Use primary sources for hiring, labor-market, accessibility, and document-format claims whenever possible.
- For resume advice, prefer credible sources such as university career centers, government labor data, ATS/vendor documentation when clearly scoped, and reputable hiring research.
- Do not invent statistics. If a number cannot be verified, use qualitative language.
- Avoid unsupported claims like "recruiters spend six seconds on every resume" unless the source and context are verified.

Brand integration:
- Tiny CV should appear as the practical workflow or tool, not the hero of every paragraph.
- Natural mentions can point to markdown editing, paper preview, hosted links, templates, agent guide, API, or PDF export.
- Keep job-seeker usefulness ahead of product promotion.

## Content Structure

content_directory: content/blog
file_template: content/blog/{slug}.md
hero_image_dir: public/blog
hero_image_template: /blog/{slug}-hero.webp
author: Andrew Jiang
date_field: date
build_cmd: pnpm build
branch_template: blog/{slug}
commit_template: "blog: {TITLE}"
co_author_trailer: none

Frontmatter schema:

```yaml
---
title: "Post title"
description: "One or two sentence excerpt."
date: "YYYY-MM-DD"
author: "Andrew Jiang"
category: "Resume Writing"
slug: "post-slug"
heroImage: "/blog/post-slug-hero.webp"
---
```

`heroImage` is optional. Omit it when no generated image is available.
