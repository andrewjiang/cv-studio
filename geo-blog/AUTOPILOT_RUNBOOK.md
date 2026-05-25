# Tiny CV GEO Blog Autopilot Runbook

## Goal

Run the Tiny CV GEO blog pipeline once per day in Multica, producing one complete, fact-checked, GEO-optimized blog post with a generated hero image, passing build, and a GitHub PR ready for auto-merge.

The daily job should use `auto` topic selection unless a human overrides the direction. The researcher should pick the highest-ROI topic from `GEO.md`, `geo-blog/TOPICS.md`, and existing `content/blog` coverage.

The content strategy is intentionally sharper than a generic resume blog:
Tiny CV should become the cited authority for truthful, AI-aware, one-page
job-search documents for modern builders. Every run should reinforce that a
resume is a compressed evidence page, markdown is the source of truth, AI is an
editor rather than a witness, PDFs are for systems, public links are for humans,
and tailoring changes emphasis rather than facts.

## Scope

This autopilot owns daily blog production for the `cv-studio` repo:

- Research a non-duplicate topic.
- Write a practical job-seeker-first blog post.
- Open with a direct answer, include a reusable framework/table/checklist/
  markdown recipe/before-after example, and end with a practical Tiny CV
  workflow.
- Verify citations, statistics, expert/institution attributions, brand mentions, and GEO score.
- Generate mandatory PNG and WebP hero assets.
- Run `pnpm build`.
- Commit, push, open a PR, and enable squash auto-merge.
- Report success or blockers in the Multica issue/run output.

The autopilot must not publish if any quality gate fails.

## Source Of Truth

Use these repo files:

- `GEO.md`
- `geo-blog/TOPICS.md`
- `geo-blog/ANALYTICS_REPORTING.md`
- `geo-blog/AUTOPILOT_PROMPT.md`
- `geo-blog/agents/orchestrator.md`
- `geo-blog/agents/researcher.md`
- `geo-blog/agents/strategist.md`
- `geo-blog/agents/writer.md`
- `geo-blog/agents/factchecker.md`
- `geo-blog/agents/optimizer.md`
- `geo-blog/agents/designer.md`
- `geo-blog/agents/publisher.md`
- `content/blog`

The canonical orchestration contract is `geo-blog/agents/orchestrator.md`. If Multica agent instructions drift from the repo files, sync the Multica agents before enabling or re-enabling the autopilot.

## Multica Model

Multica autopilots run a chosen agent on a schedule or webhook trigger.

Recommended mode: `create_issue`.

Use `create_issue` instead of `run_only` because it leaves a durable audit trail: one issue per daily run, with the final result, PR link, and any failure report visible to humans. Use `run_only` only if an external monitor already captures runs and failures.

Useful CLI commands:

```bash
multica autopilot create --help
multica autopilot trigger-add --help
multica autopilot trigger --help
multica autopilot runs --help
multica autopilot update --help
```

When inspecting agents, avoid dumping full agent JSON into logs because agent environment variables may be present. Prefer projecting only names and IDs:

```bash
multica agent list --output json | jq -r '.[] | [.name, .id] | @tsv'
```

## Required Runtime Setup

The orchestrator agent needs:

- Access to the Multica workspace.
- Access to check out `https://github.com/andrewjiang/cv-studio`.
- GitHub auth that can push branches and create PRs with `gh`.
- `pnpm`.
- Network access for web research, citation verification, OpenAI image generation, GitHub, and package installs when needed.

For analytics-driven topic selection, the orchestrator or researcher also needs
one of:

- A GA4/GSC MCP connector with authenticated reporting tools.
- Google Analytics Data API credentials plus the numeric GA4 property ID.
- Search Console API credentials with access to `https://tiny.cv/` or
  `sc-domain:tiny.cv`.
- Human-provided GA4 and GSC exports that follow
  `geo-blog/ANALYTICS_REPORTING.md`.

The repo currently documents the GA4 web stream measurement ID
`G-743RD6GYBD`, not the numeric GA4 Data API property ID. If a runtime tool asks
for the numeric property ID and it is not configured, record that as the GA4
blocker and continue from GSC or sparse-data fallback. Do not derive a property
ID from the measurement ID.

The designer runtime, or whichever runtime executes `pnpm generate:blog-hero`, needs:

- `OPENAI_API_KEY` in the process environment.
- Optional: `OPENAI_IMAGE_MODEL`, defaulting to `gpt-image-2`.
- `cwebp` or macOS `sips` for PNG to WebP conversion.
- OpenAI organization/model access for GPT Image models.

Do not put secrets in `.env.local` for this pipeline. Do not read `.env.local`. Use Multica agent environment configuration.

For real secrets, prefer stdin or file-based updates instead of command-line flags that may enter shell history:

```bash
multica agent update <designer-agent-id> --custom-env-stdin
```

Then paste a JSON object such as:

```json
{"OPENAI_API_KEY":"...","OPENAI_IMAGE_MODEL":"gpt-image-2"}
```

## Sync Agent Instructions

Before enabling the schedule, update the Multica specialist agents so their stored instructions match the repo files.

If using the CLI, the pattern is:

```bash
multica agent update "<agent-id-or-name>" --instructions "$(cat geo-blog/agents/orchestrator.md)"
multica agent update "<agent-id-or-name>" --instructions "$(cat geo-blog/agents/researcher.md)"
multica agent update "<agent-id-or-name>" --instructions "$(cat geo-blog/agents/strategist.md)"
multica agent update "<agent-id-or-name>" --instructions "$(cat geo-blog/agents/writer.md)"
multica agent update "<agent-id-or-name>" --instructions "$(cat geo-blog/agents/factchecker.md)"
multica agent update "<agent-id-or-name>" --instructions "$(cat geo-blog/agents/optimizer.md)"
multica agent update "<agent-id-or-name>" --instructions "$(cat geo-blog/agents/designer.md)"
multica agent update "<agent-id-or-name>" --instructions "$(cat geo-blog/agents/publisher.md)"
```

If the CLI argument length becomes inconvenient, update the instructions through the Multica UI instead.

## Analytics Reporting Path

Before topic selection, follow `geo-blog/ANALYTICS_REPORTING.md`.

Minimum weekly reporting path:

- GA4 landing-page report for `/blog/*`: last complete 7 days versus previous 7
  days for trend, and last complete 28 days versus previous 28 days for topic
  selection. Required fields are `date`, `landingPagePlusQueryString`,
  `sessions`, `activeUsers`, `screenPageViews`, `engagementRate`,
  `averageSessionDuration`, and `keyEvents` when configured.
- GSC query/page performance for `https://tiny.cv/` or `sc-domain:tiny.cv`:
  last complete 28 days for opportunities and 90 days for gaps/decay when
  enough history exists. Required fields are `date`, `query`, `page`, `clicks`,
  `impressions`, `ctr`, and `position`.
- GSC indexing review for published `/blog/*` URLs: record the URL inspection
  verdict, coverage state, robots/indexing state, last crawl time, canonical
  fields, sitemap status, and inspection link when available.

If GA4 or GSC tools are unavailable, auth is missing, the numeric GA4 property
ID is not configured, or the data is too sparse to draw a conclusion, the run is
not blocked. The agent must state the blocker or sparse-data condition and fall
back to `GEO.md`, `geo-blog/TOPICS.md`, existing post coverage, and
source-backed search-intent research.

## Autopilot Task Prompt

Use `geo-blog/AUTOPILOT_PROMPT.md` as the autopilot description/task prompt. Its current contents are:

```text
Run the Tiny CV GEO blog pipeline for cv-studio with direction: auto.

Repository:
https://github.com/andrewjiang/cv-studio

Goal:
Produce one complete, fact-checked, GEO-optimized Tiny CV blog post for today. Keep it job-seeker-first unless GEO.md or TOPICS.md clearly prioritizes another category. Prefer a new high-ROI topic over a refresh unless the researcher finds a stronger refresh opportunity.

Required source-of-truth files:
- GEO.md
- geo-blog/TOPICS.md
- geo-blog/ANALYTICS_REPORTING.md
- geo-blog/agents/orchestrator.md
- geo-blog/agents/researcher.md
- geo-blog/agents/strategist.md
- geo-blog/agents/writer.md
- geo-blog/agents/factchecker.md
- geo-blog/agents/optimizer.md
- geo-blog/agents/designer.md
- geo-blog/agents/publisher.md
- content/blog

Execution:
1. Check out cv-studio using multica repo checkout.
2. Read GEO.md, geo-blog/ANALYTICS_REPORTING.md, and geo-blog/agents/orchestrator.md.
3. Follow the orchestrator pipeline exactly with direction: auto.
4. Use geo-blog/TOPICS.md when present.
5. Pull GA4/GSC reporting from available tools before topic selection using geo-blog/ANALYTICS_REPORTING.md. If unavailable or sparse, report the concrete blocker and fall back to GEO.md, TOPICS.md, and existing coverage.
6. Do not duplicate an existing blog post topic.
7. Open with a direct answer, include a reusable framework/table/checklist/markdown recipe/before-after example, and end with a practical Tiny CV workflow.
8. Run factchecker, optimizer, and designer gates.
9. Hero image generation is mandatory. Do not publish without PNG and WebP hero assets.
10. Do not read .env.local. Use runtime environment variables only.
11. Do not invent citations, statistics, experts, hiring outcomes, product capabilities, or analytics.
12. Require factcheck_status=pass, optimizer_status=pass, geo_score>=8, designer_status=pass, and pnpm build passing before publishing.
13. Commit, push, open a PR, and enable squash auto-merge.
14. Report the PR URL, topic, category, format, GEO score, citations, word count, hero image status, build status, analytics signal or blocker, and auto-merge status.

Failure behavior:
- If research cannot find a non-duplicate topic with enough evidence potential, stop and report the blocker.
- If factchecking or optimization fails, retry the writer at most twice with concrete feedback.
- If designer fails, retry designer at most twice without rewriting the article unless the prompt needs adjustment.
- If any gate still fails after retries, stop. Do not publish.
- If build fails, stop. Do not create a PR.
- If PR creation or auto-merge fails after a successful commit/push, report the branch and exact non-secret error.
```

## Create The Autopilot

Create an issue-backed autopilot:

```bash
multica autopilot create \
  --title "Daily Tiny CV GEO Blog" \
  --agent "GEO Blog Orchestrator Agent" \
  --mode create_issue \
  --issue-title-template "Daily Tiny CV GEO blog {{date}}" \
  --priority medium \
  --description "$(cat geo-blog/AUTOPILOT_PROMPT.md)" \
  --output json
```

The command returns the autopilot ID. Store it somewhere operationally visible.

Keep this runbook as operator documentation; keep `geo-blog/AUTOPILOT_PROMPT.md` as the shorter prompt passed to Multica.

## Add The Daily Schedule

Recommended schedule: 8:00 AM Pacific every day.

```bash
multica autopilot trigger-add <autopilot-id> \
  --kind schedule \
  --label "Daily 8 AM Pacific" \
  --cron "0 8 * * *" \
  --timezone "America/Los_Angeles" \
  --output json
```

## Test Before Enabling Trust

Manually trigger the autopilot once:

```bash
multica autopilot trigger <autopilot-id> --output json
```

Watch the run history:

```bash
multica autopilot runs <autopilot-id> --output json
```

Expected successful result:

- A Multica issue is created for the run.
- The orchestrator checks out `cv-studio`.
- A new blog topic is selected.
- The post is written under `content/blog`.
- A hero image is generated under `public/blog`.
- `pnpm build` passes.
- A PR is opened.
- Squash auto-merge is enabled or the PR merges immediately.
- The run reports a concise completion summary.

## Daily Quality Gates

The autopilot may publish only when all are true:

- `GEO.md` exists.
- New post does not duplicate existing blog coverage.
- Citation count is at least the `GEO.md` minimum.
- Every citation URL/DOI resolves and supports the claim.
- Expert or institution attributions meet the `GEO.md` minimum.
- Brand mentions meet the `GEO.md` minimum and are natural.
- `optimizer_status == pass`.
- `geo_score >= 8`.
- `designer_status == pass`.
- PNG and WebP hero assets exist and are non-empty.
- Post frontmatter includes `heroImage`.
- `pnpm build` passes.
- No force push is used.

## Failure Triage

Research failure:

- Check `geo-blog/TOPICS.md` for stale or exhausted topics.
- Add backlog topics or clarify priority categories.
- Verify existing posts are readable from `content/blog`.

Factcheck failure:

- Inspect the failed citation list.
- Replace weak or invalid citations with primary/official sources.
- Do not publish with even one fabricated or mismatched citation.

Optimizer failure:

- Review the low scoring dimensions.
- Improve extractable section openings, query coverage, entity specificity, or citation proximity.

Designer failure:

- Confirm `OPENAI_API_KEY` is set in the image-generating agent runtime.
- Confirm `OPENAI_IMAGE_MODEL` is valid if set.
- Confirm `cwebp` or `sips` is available.
- Check whether OpenAI organization verification or billing is required.
- Retry with a prompt that keeps "no readable text" and clean top-left negative space.

Build failure:

- Do not create a PR.
- Report the exact error.
- Fix content/frontmatter/assets before retrying.

GitHub failure:

- Confirm `gh auth status`.
- Confirm push permissions to `andrewjiang/cv-studio`.
- If the commit was created and pushed but PR creation failed, report the branch name.

## Pause Or Change The Schedule

Pause:

```bash
multica autopilot update <autopilot-id> --status paused --output json
```

Resume:

```bash
multica autopilot update <autopilot-id> --status active --output json
```

Change schedule:

```bash
multica autopilot trigger-update <autopilot-id> <trigger-id> \
  --cron "0 9 * * *" \
  --timezone "America/Los_Angeles" \
  --output json
```

Delete a trigger:

```bash
multica autopilot trigger-delete <autopilot-id> <trigger-id>
```

## Maintenance

Weekly:

- Run the GA4/GSC weekly review path in `geo-blog/ANALYTICS_REPORTING.md`.
- Review the previous 7 run issues and PRs.
- Check topic diversity across categories and funnel positions.
- Add or prune `geo-blog/TOPICS.md` backlog items.
- Confirm image generation still works.
- Confirm `pnpm build` still passes locally.

After changing agent files:

- Sync Multica agent instructions from the repo files.
- Manually trigger one autopilot run before trusting the next scheduled run.

After changing secrets:

- Update only the relevant agent runtime environment.
- Never paste secrets into issue comments, PRs, prompts, or this runbook.
