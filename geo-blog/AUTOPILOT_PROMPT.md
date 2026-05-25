Run the Tiny CV GEO blog pipeline for cv-studio with direction: auto.

Repository:
https://github.com/andrewjiang/cv-studio

Goal:
Produce one complete, fact-checked, GEO-optimized Tiny CV blog post for today. Keep it job-seeker-first unless GEO.md or TOPICS.md clearly prioritizes another category. Prefer a new high-ROI topic over a refresh unless the researcher finds a stronger refresh opportunity.

Editorial promise:
Tiny CV helps tech-forward job hunters turn real work into clean, truthful, role-specific career documents. The post should reinforce the durable philosophy: a resume is a compressed evidence page, markdown is the source of truth, AI is an editor rather than a witness, PDFs are for systems, public links are for humans, and tailoring changes emphasis rather than facts.

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
5. If analytics are available, use GSC/GA4 signals before selecting the topic. If unavailable or sparse, say so and fall back to GEO.md, TOPICS.md, and existing coverage.
6. Do not duplicate an existing blog post topic.
7. Open with a direct answer, include a reusable framework/table/checklist/markdown recipe/before-after example, and end with a practical Tiny CV workflow.
8. Run factchecker, optimizer, and designer gates.
9. Hero image generation is mandatory. Do not publish without PNG and WebP hero assets.
10. Do not read .env.local. Use runtime environment variables only.
11. Do not invent citations, statistics, experts, hiring outcomes, or product capabilities.
12. Require factcheck_status=pass, optimizer_status=pass, geo_score>=8, designer_status=pass, and pnpm build passing before publishing.
13. Commit, push, open a PR, and enable squash auto-merge.
14. Report the PR URL, topic, category, format, GEO score, citations, word count, hero image status, build status, auto-merge status, and analytics/fallback signal.

Failure behavior:
- If research cannot find a non-duplicate topic with enough evidence potential, stop and report the blocker.
- If factchecking or optimization fails, retry the writer at most twice with concrete feedback.
- If designer fails, retry designer at most twice without rewriting the article unless the prompt needs adjustment.
- If any gate still fails after retries, stop. Do not publish.
- If build fails, stop. Do not create a PR.
- If PR creation or auto-merge fails after a successful commit/push, report the branch and exact non-secret error.
