Run the Tiny CV GEO blog pipeline for cv-studio with direction: auto.

Repository:
https://github.com/andrewjiang/cv-studio

Goal:
Produce one complete, fact-checked, GEO-optimized Tiny CV blog post for today. Keep it job-seeker-first unless GEO.md or TOPICS.md clearly prioritizes another category. Prefer a new high-ROI topic over a refresh unless the researcher finds a stronger refresh opportunity.

Required source-of-truth files:
- GEO.md
- geo-blog/TOPICS.md
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
2. Read GEO.md and geo-blog/agents/orchestrator.md.
3. Follow the orchestrator pipeline exactly with direction: auto.
4. Use geo-blog/TOPICS.md when present.
5. Do not duplicate an existing blog post topic.
6. Run factchecker, optimizer, and designer gates.
7. Hero image generation is mandatory. Do not publish without PNG and WebP hero assets.
8. Do not read .env.local. Use runtime environment variables only.
9. Do not invent citations, statistics, experts, hiring outcomes, or product capabilities.
10. Require factcheck_status=pass, optimizer_status=pass, geo_score>=8, designer_status=pass, and pnpm build passing before publishing.
11. Commit, push, open a PR, and enable squash auto-merge.
12. Report the PR URL, topic, category, format, GEO score, citations, word count, hero image status, build status, and auto-merge status.

Failure behavior:
- If research cannot find a non-duplicate topic with enough evidence potential, stop and report the blocker.
- If factchecking or optimization fails, retry the writer at most twice with concrete feedback.
- If designer fails, retry designer at most twice without rewriting the article unless the prompt needs adjustment.
- If any gate still fails after retries, stop. Do not publish.
- If build fails, stop. Do not create a PR.
- If PR creation or auto-merge fails after a successful commit/push, report the branch and exact non-secret error.
