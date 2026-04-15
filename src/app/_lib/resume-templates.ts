import {
  composeCvFrontmatter,
  composeCvMarkdown,
  resolveResumeStylePresetDefaults,
  type ResumeStylePreset,
} from "@/app/_lib/cv-markdown";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

export type ResumeTemplate = {
  badge: string;
  description: string;
  key: TemplateKey;
  label: string;
  markdown: string;
};

function createTemplateMarkdown({
  bodyMarkdown,
  stylePreset,
}: {
  bodyMarkdown: string;
  stylePreset: ResumeStylePreset;
}) {
  return composeCvMarkdown({
    bodyMarkdown,
    frontmatter: composeCvFrontmatter({
      ...resolveResumeStylePresetDefaults(stylePreset),
    }),
  });
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    badge: "Technical",
    description: "Builder-first template for software, product, and technical leadership roles.",
    key: "engineer",
    label: "Engineer",
    markdown: createTemplateMarkdown({
      stylePreset: "technical",
      bodyMarkdown: `# Alex Morgan
Senior Full Stack Engineer
San Francisco, CA | [alex@example.com](mailto:alex@example.com) | [linkedin.com/in/alexmorgan](https://linkedin.com) | [github.com/alexmorgan](https://github.com)

## Summary
Product-minded engineer with a track record of shipping customer-facing software quickly, building internal leverage, and turning ambiguous ideas into reliable systems. Strong in frontend architecture, developer experience, and cross-functional execution.

## Experience
### Senior Full Stack Engineer | Helio
*Remote | 2022 - Present*
- Built the company&apos;s first end-to-end product surface in React and Next.js, taking it from prototype to production for enterprise customers.
- Designed a durable frontend platform that reduced regressions, improved iteration speed, and made new features easier to ship.
- Partnered directly with design, GTM, and leadership to launch capabilities that supported larger deals and expansion revenue.

### Software Engineer | Growth Systems
*New York, NY | 2019 - 2022*
- Replaced spreadsheet-heavy operations workflows with internal tools used across sales, support, and ops.
- Improved performance on high-traffic product surfaces, reducing bundle size and improving conversion on core funnels.
- Introduced typed UI patterns and shared primitives that made product teams faster without adding framework overhead.

## Selected Projects
### Tiny CV | React, Next.js, TypeScript
- Built a markdown-first resume editor with a live one-page preview and print-ready output.

## Education
### University of Michigan | B.S. in Computer Science
*2015 - 2019*

## Skills
Languages: TypeScript, JavaScript, Python, SQL
Frameworks: React, Next.js, Node.js, Tailwind CSS
Platforms: Vercel, AWS, Postgres, GitHub Actions`,
    }),
  },
  {
    badge: "Creative",
    description: "A stronger portfolio-forward structure for product and brand designers.",
    key: "designer",
    label: "Designer",
    markdown: createTemplateMarkdown({
      stylePreset: "creative",
      bodyMarkdown: `# Maya Chen
Product Designer
Brooklyn, NY | [maya@example.com](mailto:maya@example.com) | [portfolio.com](https://portfolio.com) | [linkedin.com/in/mayachen](https://linkedin.com)

## Summary
Product designer with experience shaping interfaces, systems, and narratives from rough concept through polished launch. Strong in product thinking, prototyping, design systems, and close cross-functional collaboration.

## Experience
### Senior Product Designer | Northstar
*Remote | 2021 - Present*
- Led design for a new workflow product from early concepts through launch, partnering closely with engineering and product.
- Built reusable patterns and documentation that reduced design debt and made the product easier to extend.
- Ran lightweight customer research and iterative prototyping to validate key product decisions before implementation.

### Product Designer | Orbit
*San Francisco, CA | 2018 - 2021*
- Designed onboarding, activation, and collaboration surfaces for a B2B workflow product.
- Established a consistent visual language across marketing and product touchpoints.

## Selected Work
### Multi-team Design System
- Created core components, states, and guidance that improved consistency across product teams.

### Narrative Portfolio Site
- Designed and shipped a portfolio experience that balanced craft, storytelling, and fast performance.

## Education
### Rhode Island School of Design | B.F.A. Graphic Design
*2014 - 2018*

## Skills
Design: Product Design, UX, Visual Design, Design Systems
Tools: Figma, Framer, Adobe Creative Suite
Methods: Prototyping, User Research, Information Architecture`,
    }),
  },
  {
    badge: "Revenue",
    description: "A concise, numbers-forward template for GTM, account, and revenue roles.",
    key: "sales",
    label: "Sales",
    markdown: createTemplateMarkdown({
      stylePreset: "executive",
      bodyMarkdown: `# Jordan Reyes
Founding Account Executive
Austin, TX | [jordan@example.com](mailto:jordan@example.com) | [linkedin.com/in/jordanreyes](https://linkedin.com)

## Summary
Revenue-focused operator with experience building pipeline, closing new business, and tightening the systems around outbound and expansion. Comfortable wearing both AE and GTM builder hats in early-stage environments.

## Experience
### Founding Account Executive | Meridian
*Remote | 2022 - Present*
- Built the outbound motion from scratch and generated the first $1.2M in pipeline for a new enterprise product.
- Closed lighthouse customers while building repeatable discovery, demo, and follow-up processes.
- Partnered with product and marketing to improve messaging, qualification, and conversion.

### Account Executive | Signal
*Chicago, IL | 2019 - 2022*
- Managed full-cycle sales across mid-market accounts and consistently exceeded quota.
- Developed sales collateral and ROI narratives that shortened time-to-close.

## Highlights
- Exceeded annual quota by 132% in 2024.
- Closed 18 new logos across fintech, healthcare, and logistics.
- Built outbound sequencing and CRM workflows that increased team productivity.

## Education
### University of Texas at Austin | B.B.A. Marketing
*2015 - 2019*

## Skills
Sales: Discovery, Demo, Negotiation, Forecasting
Systems: HubSpot, Salesforce, Apollo, Clay
Ops: Pipeline Management, Outreach Automation, Territory Planning`,
    }),
  },
  {
    badge: "Operator",
    description: "A founder/operator resume with room for fundraising, product, and company building.",
    key: "founder",
    label: "Founder",
    markdown: createTemplateMarkdown({
      stylePreset: "editorial",
      bodyMarkdown: `# Avery Brooks
Founder & Product Operator
Los Angeles, CA | [avery@example.com](mailto:avery@example.com) | [linkedin.com/in/averybrooks](https://linkedin.com) | [github.com/averybrooks](https://github.com)

## Summary
Founder and product operator who moves comfortably across product, engineering, go-to-market, and fundraising. Strong track record of turning ambiguous market insight into shipped software, early revenue, and repeatable internal systems.

## Experience
### Founder & CEO | Meridian Labs
*Remote | 2023 - Present*
- Took the company from idea to revenue, owning product direction, customer conversations, and the first product surfaces.
- Raised capital from operator angels and institutional investors to fund early execution.
- Built internal workflows for sales, onboarding, and product feedback that improved speed with a lean team.

### Head of Product | Atlas
*New York, NY | 2020 - 2023*
- Led product and cross-functional execution across the company&apos;s core platform.
- Shipped new collaboration and reporting features that supported larger customers and improved retention.

## Selected Wins
- Recruited the first engineering and GTM hires.
- Closed early design partners and converted them into paying accounts.
- Built the reporting stack used for board updates, forecasting, and product review.

## Education
### Northwestern University | B.A. Economics
*2012 - 2016*

## Skills
Operator: Product Strategy, Hiring, Fundraising, GTM
Technical: TypeScript, React, SQL, Analytics
Leadership: Cross-functional Execution, Narrative, Decision Making`,
    }),
  },
];

export const RESUME_TEMPLATE_MAP = new Map(
  RESUME_TEMPLATES.map((template) => [template.key, template]),
);

export function getResumeTemplate(templateKey: TemplateKey) {
  return RESUME_TEMPLATE_MAP.get(templateKey) ?? RESUME_TEMPLATE_MAP.get("engineer")!;
}
