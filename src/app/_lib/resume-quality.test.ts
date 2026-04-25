import { describe, expect, it } from "vitest";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import { evaluateResumeQuality } from "@/app/_lib/resume-quality";
import { STRONG_AGENT_RESUME_MARKDOWN } from "@/app/_lib/resume-examples";

const ANDREW_MARKDOWN = `# Andrew Jiang
Builder and founder with deep business development and product management experience, plus generalist design and engineering chops. YC alum.
Los Angeles, CA | [(510) 646-3356](tel:+15106463356) | [andrew.h.jiang@gmail.com](mailto:andrew.h.jiang@gmail.com) | [linkedin.com/in/andrewjiang](https://www.linkedin.com/in/andrewjiang) | [github.com/andrewjiang](https://github.com/andrewjiang) | [x.com/andrewjiang](https://x.com/andrewjiang)

## Experience
### Founder and CEO | LockIn
*Los Angeles, CA | Jun 2025 - Present*
- Built LockIn from idea to $50K ARR, owning product design, frontend, LLM inference pipeline, and internal tooling.
- Ran end-to-end GTM across outbound, demos, and customer success; built automation and interactive sales collateral that accelerated prospect education and conversion.
- Designed an LLM identity enrichment engine that maps Telegram contacts to real-world profiles using public and private data sources, bio signals, and membership graphs.
- Implemented an auto-research framework that ran 50+ experiments on prompt design, tool-call queries, and model selection, cutting per-contact inference cost by 75% while matching the accuracy of a model that was 4x more expensive.

### Cofounder and General Partner | Curated
*Los Angeles, CA | Oct 2021 - Present*
- Main fund operator and curator for one of the largest digital art collections in the world, overseeing fundraising, finance, accounting, legal, compliance, security, and custody.
- Built internal software for portfolio management, secondary market analysis and alerts, and accounting workflows.
- Wrote editorials on curation and leading digital artists that became canonical references and directly led to at least $20M in secondary market sales.

### Cofounder and CEO | Soda Labs
*Los Angeles, CA | May 2018 - Jan 2021*
- Built Soda Labs into a hardware-as-a-service company and led the business through acquisition by Foxconn in January 2021.
- Launched Nimble OS, a custom Android OS for large interactive displays, and worked with Foxconn and Sharp to ship it in the Windows Collaboration Display.
- Launched Sparkpoint, an interactive retail signage solution for wine and spirits stores, and signed a nationwide partnership with Southern Glazer's.
- Launched LivMote, an enterprise temperature sensor; sold 5K+ units and secured distribution partnerships with Sharp, Allied Universal, and DaVita Healthcare.

## Additional Experience
Product Manager, Sprig (2015 - 2016) • Cofounder and CEO, Bayes Impact (Apr 2014 - Apr 2015) • Private Equity Associate, American Securities (Aug 2012 - Feb 2014) • Consultant, Boston Consulting Group (2010 - 2012)

## Education
### NYU Stern School of Business
*Dual B.S. in Finance and Economics, Minor in Statistics*
- Magna Cum Laude, Beta Gamma Sigma
- Graduate TA for Nobel Laureate Robert Engle

## Skills
Leadership: Product strategy, business development, fundraising, GTM, customer success
Technical: JavaScript, Python, Solidity, LLM systems, prompt design, inference optimization
Design & Analytics: Figma, Photoshop, SQL, R, Excel / VBA`;

const CORRECTED_ANDREW_MARKDOWN = `# Andrew Jiang
Founder & Product Operator
Los Angeles, CA | [(510) 646-3356](tel:+15106463356) | [andrew.h.jiang@gmail.com](mailto:andrew.h.jiang@gmail.com) | [linkedin.com/in/andrewjiang](https://www.linkedin.com/in/andrewjiang) | [github.com/andrewjiang](https://github.com/andrewjiang) | [x.com/andrewjiang](https://x.com/andrewjiang)

## Summary
Builder and founder with deep business development, product management, design, and engineering experience. YC alum.

## Experience
### Founder and CEO | LockIn
*Los Angeles, CA | Jun 2025 - Present*
- Built LockIn from idea to $50K ARR, owning product design, frontend, LLM inference pipeline, and internal tooling.
- Ran end-to-end GTM across outbound, demos, and customer success; built automation and interactive sales collateral that accelerated prospect education and conversion.

## Additional Experience
- Product Manager, Sprig (2015 - 2016)
- Cofounder and CEO, Bayes Impact (Apr 2014 - Apr 2015)
- Private Equity Associate, American Securities (Aug 2012 - Feb 2014)
- Consultant, Boston Consulting Group (2010 - 2012)

## Education
### NYU Stern School of Business
*Dual B.S. in Finance and Economics, Minor in Statistics*
- Magna Cum Laude, Beta Gamma Sigma
- Graduate TA for Nobel Laureate Robert Engle

## Skills
Leadership: Product strategy, business development, fundraising, GTM, customer success
Technical: JavaScript, Python, Solidity, LLM systems, prompt design, inference optimization
Design & Analytics: Figma, Photoshop, SQL, R, Excel / VBA`;

const VALID_PUBLISH_PREFIX = `# Alex Morgan
Founder & Product Engineer
San Francisco, CA | [alex@example.com](mailto:alex@example.com)

## Summary
Product-minded builder with experience across product, engineering, and go-to-market.
`;

function buildPublishMarkdown(body: string) {
  return `${VALID_PUBLISH_PREFIX}

${body}`.trim();
}

describe("resume-quality", () => {
  it("blocks the Andrew sample at the publish gate with specific errors", () => {
    const result = evaluateResumeQuality({
      document: parseCvMarkdown(ANDREW_MARKDOWN),
      gate: "publish",
      markdown: ANDREW_MARKDOWN,
    });

    expect(result.publishReady).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "missing_summary",
        "headline_too_long",
        "inline_bullet_separator",
      ]),
    );
    expect(result.warnings).toHaveLength(0);
  });

  it("returns Andrew sample quality issues as draft warnings", () => {
    const result = evaluateResumeQuality({
      document: parseCvMarkdown(ANDREW_MARKDOWN),
      gate: "draft",
      markdown: ANDREW_MARKDOWN,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.publishReady).toBe(false);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "missing_summary",
        "headline_too_long",
        "inline_bullet_separator",
      ]),
    );
  });

  it("passes a corrected Andrew markdown at the publish gate", () => {
    const result = evaluateResumeQuality({
      document: parseCvMarkdown(CORRECTED_ANDREW_MARKDOWN),
      gate: "publish",
      markdown: CORRECTED_ANDREW_MARKDOWN,
    });

    expect(result.publishReady).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("keeps the strong agent fixture publish-ready", () => {
    const result = evaluateResumeQuality({
      document: parseCvMarkdown(STRONG_AGENT_RESUME_MARKDOWN),
      gate: "publish",
      markdown: STRONG_AGENT_RESUME_MARKDOWN,
    });

    expect(result.publishReady).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects date-only experience metadata at the publish gate", () => {
    const markdown = buildPublishMarkdown(`## Experience
### Founder & Investor | Weekend Fund
*Apr 2017 - Present*
- Founded an early-stage venture fund.`);

    const result = evaluateResumeQuality({
      document: parseCvMarkdown(markdown),
      gate: "publish",
      markdown,
    });

    expect(result.publishReady).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("experience_entry_date_in_wrong_slot");
  });

  it("rejects reversed experience metadata at the publish gate", () => {
    const markdown = buildPublishMarkdown(`## Experience
### Founder & Investor | Weekend Fund
*Apr 2017 - Present | Miami, FL*
- Founded an early-stage venture fund.`);

    const result = evaluateResumeQuality({
      document: parseCvMarkdown(markdown),
      gate: "publish",
      markdown,
    });

    expect(result.errors.map((error) => error.code)).toContain("experience_entry_date_in_wrong_slot");
  });

  it("rejects experience metadata with missing left-side context", () => {
    const markdown = buildPublishMarkdown(`## Experience
### Founder & Investor | Weekend Fund
* | Apr 2017 - Present*
- Founded an early-stage venture fund.`);

    const result = evaluateResumeQuality({
      document: parseCvMarkdown(markdown),
      gate: "publish",
      markdown,
    });

    expect(result.errors.map((error) => error.code)).toContain("experience_entry_missing_context");
  });

  it("rejects experience metadata with missing dates", () => {
    const markdown = buildPublishMarkdown(`## Experience
### Founder & Investor | Weekend Fund
*Miami, FL*
- Founded an early-stage venture fund.`);

    const result = evaluateResumeQuality({
      document: parseCvMarkdown(markdown),
      gate: "publish",
      markdown,
    });

    expect(result.errors.map((error) => error.code)).toContain("experience_entry_missing_dates");
  });

  it("rejects experience entries with no metadata line", () => {
    const markdown = buildPublishMarkdown(`## Experience
### Founder & Investor | Weekend Fund
- Founded an early-stage venture fund.`);

    const result = evaluateResumeQuality({
      document: parseCvMarkdown(markdown),
      gate: "publish",
      markdown,
    });

    expect(result.errors.map((error) => error.code)).toContain("experience_entry_missing_meta");
  });

  it("passes proper experience metadata at the publish gate", () => {
    const markdown = buildPublishMarkdown(`## Experience
### Founder & Investor | Weekend Fund
*Miami, FL | Apr 2017 - Present*
- Founded an early-stage venture fund.`);

    const result = evaluateResumeQuality({
      document: parseCvMarkdown(markdown),
      gate: "publish",
      markdown,
    });

    expect(result.publishReady).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("keeps education date-only metadata publish-valid", () => {
    const markdown = buildPublishMarkdown(`## Education
### University of Oregon Lundquist College of Business
*2005 - 2009*
B.S., Entrepreneurship Concentration`);

    const result = evaluateResumeQuality({
      document: parseCvMarkdown(markdown),
      gate: "publish",
      markdown,
    });

    expect(result.publishReady).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("keeps project sections without metadata publish-valid", () => {
    const markdown = buildPublishMarkdown(`## Projects
### Tiny CV Agent Finish | Next.js, TypeScript, PostgreSQL
- Designed an idempotent API flow.`);

    const result = evaluateResumeQuality({
      document: parseCvMarkdown(markdown),
      gate: "publish",
      markdown,
    });

    expect(result.publishReady).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("downgrades bad experience metadata to draft warnings", () => {
    const markdown = buildPublishMarkdown(`## Experience
### Founder & Investor | Weekend Fund
*Apr 2017 - Present*
- Founded an early-stage venture fund.`);

    const result = evaluateResumeQuality({
      document: parseCvMarkdown(markdown),
      gate: "draft",
      markdown,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.publishReady).toBe(false);
    expect(result.warnings.map((warning) => warning.code)).toContain("experience_entry_date_in_wrong_slot");
  });
});
