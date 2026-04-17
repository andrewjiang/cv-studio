import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

export type LandingExample = {
  chromeClassName: string;
  description: string;
  facets: [string, string, string];
  key: TemplateKey;
  label: string;
  person: string;
  previewTitle: string;
  role: string;
};

export const LANDING_EXAMPLES: LandingExample[] = [
  {
    chromeClassName: "bg-[linear-gradient(180deg,#fffdf9_0%,#eef7f3_100%)]",
    description: "A builder-first layout for software, product, and technical leadership roles.",
    facets: ["Direct", "technical", "compact"],
    key: "engineer",
    label: "Engineer",
    person: "Alex Morgan",
    previewTitle: "Senior full stack engineer",
    role: "Technical roles",
  },
  {
    chromeClassName: "bg-[linear-gradient(180deg,#fffdfd_0%,#f3efff_100%)]",
    description: "A sharper presentation for portfolio-driven product and brand work.",
    facets: ["Editorial", "polished", "portfolio-aware"],
    key: "designer",
    label: "Designer",
    person: "Maya Chen",
    previewTitle: "Product designer",
    role: "Design roles",
  },
  {
    chromeClassName: "bg-[linear-gradient(180deg,#fffdf9_0%,#fbf1e5_100%)]",
    description: "A concise structure for revenue stories, numbers, and momentum.",
    facets: ["Numbers-first", "fast", "commercial"],
    key: "sales",
    label: "Sales",
    person: "Jordan Reyes",
    previewTitle: "Founding account executive",
    role: "Revenue roles",
  },
  {
    chromeClassName: "bg-[linear-gradient(180deg,#fffdf9_0%,#f2ebe1_100%)]",
    description: "A steadier format for operators, founders, and generalists.",
    facets: ["Narrative", "operator-shaped", "steady"],
    key: "founder",
    label: "Founder",
    person: "Avery Brooks",
    previewTitle: "Founder and product operator",
    role: "Founder roles",
  },
];

export const LANDING_EXAMPLE_MAP = new Map(
  LANDING_EXAMPLES.map((example) => [example.key, example]),
);

export function getLandingExample(templateKey: TemplateKey) {
  return LANDING_EXAMPLE_MAP.get(templateKey) ?? LANDING_EXAMPLES[0]!;
}
