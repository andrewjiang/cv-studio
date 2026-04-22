import {
  composeCvFrontmatter,
  composeCvMarkdown,
  parseCvMarkdown,
  resolveResumeStylePresetDefaults,
  splitCvMarkdown,
  type ResumeStylePrefs,
} from "@/app/_lib/cv-markdown";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";
import { getResumeTemplate, RESUME_TEMPLATES } from "@/app/_lib/resume-templates";

export const TEMPLATE_KEYS = RESUME_TEMPLATES.map((template) => template.key) as TemplateKey[];

export type TemplateStyleShowcaseItem = {
  description: string;
  facets: [string, string, string];
  id: string;
  markdown: string;
  previewHref: string;
  role: string;
  templateKey: TemplateKey;
  title: string;
  useHref: string;
};

const TEMPLATE_STYLE_DEFINITIONS = [
  {
    description: "A dense, scan-friendly format for engineering and product roles with strong section dividers.",
    facets: ["Compact", "technical", "ATS-aware"],
    id: "technical-clean",
    role: "Software, product, data",
    style: {
      accentTone: "forest",
      contactStyle: "compact",
      density: "compact",
      headerAlignment: "left",
      pageMargin: 0.9,
      showHeaderDivider: false,
      showSectionDivider: true,
      stylePreset: "technical",
    },
    templateKey: "engineer",
    title: "Technical Clean",
  },
  {
    description: "A quieter modern layout for candidates who want the work to feel polished without decoration.",
    facets: ["Minimal", "fast-read", "balanced"],
    id: "modern-minimal",
    role: "Generalist, PM, operations",
    style: {
      accentTone: "slate",
      contactStyle: "compact",
      density: "compact",
      headerAlignment: "left",
      pageMargin: 0.95,
      showHeaderDivider: false,
      showSectionDivider: true,
      stylePreset: "minimal",
    },
    templateKey: "founder",
    title: "Modern Minimal",
  },
  {
    description: "A centered, portfolio-forward page for design work, creative direction, and visible craft.",
    facets: ["Centered", "portfolio", "expressive"],
    id: "creative-edge",
    role: "Design, brand, creative",
    style: {
      accentTone: "plum",
      contactStyle: "compact",
      density: "standard",
      headerAlignment: "center",
      pageMargin: 0.95,
      showHeaderDivider: false,
      showSectionDivider: true,
      stylePreset: "creative",
    },
    templateKey: "designer",
    title: "Creative Edge",
  },
  {
    description: "A steady executive treatment for revenue, leadership, and roles where outcomes need to lead.",
    facets: ["Executive", "numbers", "roomy"],
    id: "executive-accent",
    role: "Sales, GTM, leadership",
    style: {
      accentTone: "navy",
      contactStyle: "compact",
      density: "comfortable",
      headerAlignment: "left",
      pageMargin: 1,
      showHeaderDivider: false,
      showSectionDivider: true,
      stylePreset: "executive",
    },
    templateKey: "sales",
    title: "Executive Accent",
  },
  {
    description: "A serif-led narrative format for founders, operators, and people with a clear career story.",
    facets: ["Narrative", "serif", "operator"],
    id: "editorial-serif",
    role: "Founder, operator, chief of staff",
    style: {
      accentTone: "forest",
      contactStyle: "compact",
      density: "standard",
      headerAlignment: "left",
      pageMargin: 1,
      showHeaderDivider: false,
      showSectionDivider: true,
      stylePreset: "editorial",
    },
    templateKey: "founder",
    title: "Editorial Serif",
  },
  {
    description: "A conventional resume shape for conservative applications and parser-heavy workflows.",
    facets: ["Classic", "simple", "parser-friendly"],
    id: "classic-ats",
    role: "Traditional teams, broad applications",
    style: {
      accentTone: "slate",
      contactStyle: "classic",
      density: "standard",
      headerAlignment: "left",
      pageMargin: 1,
      showHeaderDivider: false,
      showSectionDivider: false,
      stylePreset: "classic",
    },
    templateKey: "engineer",
    title: "Classic ATS",
  },
] satisfies Array<{
  description: string;
  facets: [string, string, string];
  id: string;
  role: string;
  style: Partial<ResumeStylePrefs>;
  templateKey: TemplateKey;
  title: string;
}>;

export const TEMPLATE_STYLE_SHOWCASE: TemplateStyleShowcaseItem[] =
  TEMPLATE_STYLE_DEFINITIONS.map((item) => ({
    ...item,
    markdown: createTemplateMarkdownVariant(item.templateKey, item.style),
    previewHref: `/examples/${item.templateKey}`,
    useHref: `/new?template=${item.templateKey}`,
  }));

export function createTemplateMarkdownVariant(
  templateKey: TemplateKey,
  styleOverrides: Partial<ResumeStylePrefs>,
) {
  const template = getResumeTemplate(templateKey);
  const { bodyMarkdown } = splitCvMarkdown(template.markdown);
  const baseStyle = parseCvMarkdown(template.markdown).style;
  const stylePreset = styleOverrides.stylePreset ?? baseStyle.stylePreset;
  const style: ResumeStylePrefs = {
    ...resolveResumeStylePresetDefaults(stylePreset),
    ...styleOverrides,
    stylePreset,
  };

  return composeCvMarkdown({
    bodyMarkdown,
    frontmatter: composeCvFrontmatter(style),
  });
}
