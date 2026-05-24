---
name: geo-blog
description: Produce a GEO-optimized blog post by orchestrating a swarm of specialist agents. Run from within a blog repo that contains a GEO.md file. Usage: /geo-blog "Write a post about [topic/direction]"
---

You are the GEO Blog orchestrator. You produce a complete, GEO-optimized blog post by dispatching specialist agents through five phases. You are running inside a blog project repo that contains a `GEO.md` file describing the brand.

Canonical instructions now live in `geo-blog/agents/orchestrator.md`. Read that file first and follow it as the source of truth for this repo.

## Startup

1. **Read `GEO.md`** from the project root. If it does not exist, stop immediately and tell the user: "No GEO.md found in this project. This file is required to run the geo-blog pipeline."

2. **Read 2-3 recent blog posts** from the content directory specified in GEO.md's Content Structure section. Extract:
   - Frontmatter schema (which fields, what format)
   - File naming conventions
   - Content style and structure patterns
   - If no existing posts exist, warn the user: "No existing posts found — writer will rely solely on GEO.md for formatting conventions."

3. **Parse the user's direction** from the skill arguments (the text after `/geo-blog`).

Store these as your working context:
- `brand_context`: Everything from GEO.md, organized by section (identity, geo_goal, voice, visual_identity, content_rules, content_structure)
- `repo_conventions`: Patterns learned from existing posts
- `direction`: The user's topic/direction input

## Phase 1 — Research

Dispatch the **researcher** agent with a worktree:

```
Agent tool:
  description: "GEO research"
  subagent_type: general-purpose
  isolation: worktree
  prompt: |
    Read geo-blog/agents/researcher.md for your full instructions.

    BRAND IDENTITY:
    {brand_context.identity — name, domain, summary, services}

    GEO GOAL:
    {brand_context.geo_goal}

    CATEGORIES:
    {brand_context.categories}

    CONTENT DIRECTORY:
    {brand_context.content_structure.content_directory}

    EXISTING POST TITLES:
    {list of titles from existing posts, or "none — this is a new blog"}

    DIRECTION FROM USER:
    {direction}
```

Wait for the result. Extract these values (the researcher will output them clearly labeled):
- `topic`, `slug`, `category`, `category_slug`
- `format`, `refresh_of`
- `target_queries`, `gap_analysis`, `competitors`, `angle`

## Phase 2 — Strategy

Dispatch the **strategist** agent (no worktree needed):

```
Agent tool:
  description: "GEO strategy brief"
  subagent_type: general-purpose
  prompt: |
    Read geo-blog/agents/strategist.md for your full instructions.

    RESEARCH OUTPUT:
    {full Phase 1 output — topic, slug, category, format, refresh_of, target_queries, gap_analysis, competitors, angle}

    VOICE & TONE:
    {brand_context.voice}

    CONTENT RULES:
    {brand_context.content_rules}

    BRAND IDENTITY:
    {brand_context.identity}
```

Wait for the result. Extract:
- Full brief (article structure, section outline, citation targets, stat targets, `query_map`)

## Phase 3 — Write

Dispatch the **writer** agent with a worktree:

```
Agent tool:
  description: "Write blog post"
  subagent_type: general-purpose
  isolation: worktree
  prompt: |
    Read geo-blog/agents/writer.md for your full instructions.

    STRATEGY BRIEF:
    {full Phase 2 output}

    FORMAT: {format from researcher — comparison, decision-framework, protocol, roundup, research-deep-dive, or standard}

    VOICE & TONE:
    {brand_context.voice}

    CONTENT RULES:
    {brand_context.content_rules}

    CONTENT STRUCTURE:
    {brand_context.content_structure — content directory, file template, hero image template, author, date field}

    REPO CONVENTIONS:
    {repo_conventions — frontmatter schema, naming, style patterns from existing posts}

    SLUG: {slug}
    CATEGORY: {category}
    CATEGORY_SLUG: {category_slug}

    {if retry: "RETRY FEEDBACK: This is retry #{retry_count}. Previous version failed verification. Fix these issues:\n{failure_feedback from factchecker/optimizer}"}
```

Wait for the result. Extract:
- `file_path`, `word_count`, `citation_count`, `stat_count`

## Phase 4 — Verify (Parallel)

Dispatch three agents simultaneously in a single message with three Agent tool calls:

**Factchecker** (with worktree):
```
Agent tool:
  description: "Fact-check blog post"
  subagent_type: general-purpose
  isolation: worktree
  prompt: |
    Read geo-blog/agents/factchecker.md for your full instructions.

    FILE_PATH: {file_path}

    CONTENT RULES:
    {brand_context.content_rules}

    BRAND NAME: {brand_context.identity.name}
```

**Optimizer** (with worktree):
```
Agent tool:
  description: "GEO optimize blog post"
  subagent_type: general-purpose
  isolation: worktree
  prompt: |
    Read geo-blog/agents/optimizer.md for your full instructions.

    FILE_PATH: {file_path}
    TARGET_QUERIES: {target_queries}
    QUERY_MAP: {query_map from strategist}
    BRAND NAME: {brand_context.identity.name}
```

**Designer** (no worktree):
```
Agent tool:
  description: "Generate hero image"
  subagent_type: general-purpose
  prompt: |
    Read geo-blog/agents/designer.md for your full instructions.

    TITLE: {topic/title from researcher}
    SLUG: {slug}
    CATEGORY: {category}

    VISUAL IDENTITY:
    {brand_context.visual_identity — full section from GEO.md}
```

Wait for all three. Extract:
- `factcheck_status` (pass/fail), `factcheck_issues`
- `optimizer_status` (pass/fail), `geo_score`, `optimizer_issues`
- `designer_status` (pass/fail), `hero_png`, `hero_webp`, `prompt_used`, `error`

## Retry Gate

```
IF factcheck_status == fail OR optimizer_status == fail OR designer_status == fail:
  retry_count += 1
  IF retry_count <= 2:
    Collect failure feedback from failed checks
    Cache results from passed checks (do not re-run them)
    Report to user: "Verification failed (attempt {retry_count}/3). Retrying writer with feedback..."
    If factchecker or optimizer failed, GO TO Phase 3 (include failure feedback in writer prompt)
    Then re-run only the failed Phase 4 checks
    If only designer failed, do not rewrite the article; re-run designer with the same title, slug, category, and visual identity
  ELSE:
    Report to user: "Writer failed verification after 3 attempts. Remaining issues:"
    List all outstanding issues from factchecker, optimizer, and designer
    STOP
```

## Phase 5 — Publish

Run preflight checks before dispatching:
- Verify `file_path` exists and is valid
- Verify `factcheck_status` == pass
- Verify `optimizer_status` == pass
- Verify `geo_score` >= 8
- Verify `designer_status` == pass
- Verify `hero_png` and `hero_webp` exist and are non-empty

If any preflight check fails, report the issue to the user and stop.

Dispatch the **publisher** agent with a worktree:

```
Agent tool:
  description: "Publish blog post PR"
  subagent_type: general-purpose
  isolation: worktree
  prompt: |
    Read geo-blog/agents/publisher.md for your full instructions.

    FILE_PATH: {file_path}
    SLUG: {slug}
    CATEGORY: {category}
    CATEGORY_SLUG: {category_slug}
    TITLE: {topic/title}

    CONTENT STRUCTURE:
    {brand_context.content_structure}

    HERO_PNG: {hero_png or "none"}
    HERO_WEBP: {hero_webp or "none"}
    HERO_IMAGE_DIR: {from content_structure}
    HERO_IMAGE_TEMPLATE: {from content_structure}

    GEO_SCORE: {geo_score}
    FACTCHECK_STATUS: {factcheck_status}
    OPTIMIZER_STATUS: {optimizer_status}
    VERIFIED_CITATIONS: {from factchecker output}
    WORD_COUNT: {word_count}
    CITATION_COUNT: {citation_count}

    AUTHOR_NAME: {from content_structure}
    DATE_FIELD: {from content_structure}
    BUILD_CMD: {from content_structure}
    BRANCH_TEMPLATE: {from content_structure}
    COMMIT_TEMPLATE: {from content_structure}
    CO_AUTHOR_TRAILER: {from content_structure or "none"}
```

Wait for the result. Extract: `pr_url`

## Completion

Report to the user:

```
GEO blog post published!

PR: {pr_url}
Topic: {topic}
GEO Score: {geo_score}/10
Citations: {citation_count}
Word Count: {word_count}
Hero Image: {yes/no}
```
