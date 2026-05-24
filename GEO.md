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

Write like an experienced product builder helping someone get a real job-search task done. Prefer plain language, specific examples, useful constraints, and a sharp editorial spine. Avoid hype, generic career-coach filler, and claims that imply Tiny CV can get someone hired by itself.

Style rules:
- Lead with the practical answer.
- Keep paragraphs short.
- Use concrete examples from job seekers, recruiters, hiring managers, and agents.
- Be opinionated about good resume structure without sounding doctrinaire.
- Make each post sound like Tiny CV has a worldview, not just a checklist.
- Prefer memorable frames: "public link for humans, PDF for systems," "source of truth," "forcing function," "facts before phrasing."
- Treat AI/agents as useful assistants, not magic.
- Never invent career outcomes, hiring statistics, or resume metrics.

## Visual Identity

photography_style: Do not use photography. Use concept-first editorial illustration.
default_art_style: ink_green_editorial
visual_system: Monochrome ink linework with forest-green accents on warm cream paper. Occasional muted amber or clay accents are allowed when they clarify the metaphor.
mood: Calm, sharp, editorial, useful, slightly clever.
color_palette:
- paper: #fbf7f0
- forest: #065f46
- deep_forest: #0f241d
- slate: #0f172a
- warm_white: #ffffff
lighting_preference: Not photographic lighting. Use drawn contrast, negative space, and paper texture.
subject_style: Symbolic diagrams, document metaphors, visual stakes, and simple editorial cartoons. Every image should make the post's core idea visible in one glance.
alternate_art_styles:
- isometric_diagram: Use only when the post needs a clear system, flow, branching structure, or comparison diagram.
- tiny_world: Use sparingly when the metaphor benefits from playful spatial storytelling.
hero_concept_rules:
- Start from the post's editorial spine, not the topic label.
- Build one dominant visual metaphor.
- The image should answer: "What is the tension, decision, or contrast in this post?"
- Prefer visible stakes: safe vs unsafe, one vs many, source vs drift, human review vs AI invention, public link vs PDF.
- The metaphor should be understandable in two seconds.
- Avoid generic resumes, laptops, desks, pens, and document stacks unless they are part of a clear metaphor.
hero_constraints:
- No text, letters, titles, captions, UI labels, logos, watermarks, or readable handwriting baked into generated images.
- No photorealistic stock desk scenes.
- No generic SaaS illustration.
- No decorative document systems without a visible idea.
- Prefer generous negative space.
- Keep the composition calm and editorial, not stock-photo cheerful.
- Must work as a 16:9 hero with headline overlay.

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

For GEO blog pipeline runs, `heroImage` is required. The application can render legacy posts without it, but new generated posts must include a generated WebP hero image and matching copied asset before publication.
