import { buildContactRows, parseContactItems } from "@/app/_lib/resume-contact";
import {
  composeCvFrontmatter,
  DEFAULT_RESUME_STYLE,
  fontFamilyForToken,
  parseResumeStyle,
  RESUME_ACCENT_LABELS,
  RESUME_ACCENT_TONES,
  RESUME_DENSITIES,
  RESUME_DENSITY_LABELS,
  RESUME_HEADER_ALIGNMENT_LABELS,
  RESUME_HEADER_ALIGNMENTS,
  RESUME_PRESET_LABELS,
  RESUME_STYLE_PRESETS,
  resolveResumeDensityMultiplier,
  resolveResumeStyle,
  resolveResumeStylePresetDefaults,
} from "@/app/_lib/resume-style";

export {
  composeCvFrontmatter,
  DEFAULT_RESUME_STYLE,
  fontFamilyForToken,
  RESUME_ACCENT_LABELS,
  RESUME_ACCENT_TONES,
  RESUME_DENSITIES,
  RESUME_DENSITY_LABELS,
  RESUME_HEADER_ALIGNMENT_LABELS,
  RESUME_HEADER_ALIGNMENTS,
  RESUME_PRESET_LABELS,
  RESUME_STYLE_PRESETS,
  resolveResumeDensityMultiplier,
  resolveResumeStyle,
  resolveResumeStylePresetDefaults,
};

export type ResumeSkillGroup = {
  label: string;
  value: string;
};

export type ResumeEntry = {
  titleParts: string[];
  metaLeft?: string;
  metaRight?: string;
  paragraphs: string[];
  bullets: string[];
};

export type ResumeSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets: string[];
  entries: ResumeEntry[];
  skillGroups: ResumeSkillGroup[];
};

export type ResumeDocument = {
  name: string;
  headline: string;
  contactLines: string[];
  contactItems: ResumeContactItem[];
  contactRows: string[];
  sections: ResumeSection[];
  style: ResumeStylePrefs;
};

export type CvMarkdownParts = {
  bodyMarkdown: string;
  frontmatter: string;
};

export type ResumeFontToken =
  | "source-sans"
  | "source-serif"
  | "manrope"
  | "newsreader"
  | "plex-sans"
  | "plex-mono";
export type ResumePageSize = "letter" | "legal";
export type ResumeContactStyle = "classic" | "compact" | "web-icons";
export type ResumeStylePreset =
  | "classic"
  | "minimal"
  | "editorial"
  | "executive"
  | "technical"
  | "creative";
export type ResumeAccentTone = "forest" | "slate" | "navy" | "plum" | "claret";
export type ResumeDensity = "comfortable" | "standard" | "compact";
export type ResumeHeaderAlignment = "left" | "center";

export type ResumeContactItem = {
  href?: string;
  kind: "email" | "location" | "phone" | "social" | "text";
  label: string;
  platform?: "email" | "github" | "linkedin" | "phone" | "website" | "x";
};

export type ResumeStylePrefs = {
  accentTone: ResumeAccentTone;
  bodyFont: ResumeFontToken;
  contactStyle: ResumeContactStyle;
  density: ResumeDensity;
  displayFont: ResumeFontToken;
  headerAlignment: ResumeHeaderAlignment;
  pageMargin: number;
  stylePreset: ResumeStylePreset;
  showHeaderDivider: boolean;
  showSectionDivider: boolean;
  pageSize: ResumePageSize;
};

export type ResumeTypographyScale = {
  body: number;
  contact: number;
  date: number;
  entryMeta: number;
  entryTitle: number;
  headline: number;
  name: number;
  sectionLabel: number;
  skills: number;
};

export type ResumeResolvedStyle = {
  accent: string;
  accentStrong: string;
  bodyFontFamily: string;
  densityMultiplier: number;
  displayFontFamily: string;
  headerAlignment: ResumeHeaderAlignment;
  iconSurface: string;
  iconSurfaceHover: string;
  ink: string;
  subtle: string;
};

const TYPE_SCALE_RATIOS = {
  body: 1,
  contact: 0.954,
  date: 0.853,
  entryMeta: 0.873,
  entryTitle: 1.056,
  headline: 1.005,
  name: 2.589,
  sectionLabel: 0.833,
  skills: 0.965,
} satisfies Record<keyof ResumeTypographyScale, number>;

const DEFAULT_TYPE_BASE = 0.985;
const MOBILE_TYPE_BASE = 1.02;

export const DEFAULT_CV_MARKDOWN = composeCvMarkdown({
  bodyMarkdown: `# Alex Morgan
Founder & Product Engineer
San Francisco, CA | [alex@example.com](mailto:alex@example.com) | [linkedin.com/in/alexmorgan](https://linkedin.com) | [github.com/alexmorgan](https://github.com)

## Summary
Product-minded engineer with a track record of shipping customer-facing software quickly, building internal leverage, and turning ambiguous ideas into reliable systems. Strong in frontend architecture, developer experience, and cross-functional execution.

## Experience
### Founding Engineer | Helio
*Remote | 2022 - Present*
- Built the company&apos;s first end-to-end product surface in React and Next.js, taking it from prototype to production for enterprise customers.
- Designed a small but durable frontend platform that reduced regressions, improved iteration speed, and made new features easier to ship.
- Partnered directly with design, GTM, and leadership to launch capabilities that supported larger deals and expansion revenue.

### Senior Software Engineer | Growth Systems
*New York, NY | 2019 - 2022*
- Replaced spreadsheet-heavy operations workflows with internal tools used across sales, support, and ops.
- Improved performance on high-traffic product surfaces, reducing bundle size and improving conversion on core funnels.
- Introduced typed UI patterns and shared primitives that made product teams faster without adding framework overhead.

## Selected Projects
### Tiny CV | React, Next.js, TypeScript
- Built a markdown-first resume editor with a live one-page preview, print-ready output, and local draft persistence.

### Contact Graph Enrichment | TypeScript, Postgres
- Designed enrichment workflows that linked fragmented contact and company records into cleaner, more usable internal datasets.

## Education
### University of Michigan | B.S. in Computer Science
*2015 - 2019*

## Skills
Languages: TypeScript, JavaScript, Python, SQL
Frameworks: React, Next.js, Node.js, Tailwind CSS
Platforms: Vercel, AWS, Postgres, GitHub Actions`,
  frontmatter: composeCvFrontmatter(DEFAULT_RESUME_STYLE),
});

export function parseCvMarkdown(markdown: string): ResumeDocument {
  const { bodyMarkdown, frontmatter } = splitCvMarkdown(markdown);
  const lines = bodyMarkdown.replace(/\r\n?/g, "\n").split("\n");
  const firstHeadingIndex = lines.findIndex((line) => line.trim().startsWith("# "));
  const style = parseResumeStyle(frontmatter);

  let name = "Your Name";
  let index = 0;

  if (firstHeadingIndex >= 0) {
    name = stripHeading(lines[firstHeadingIndex], 1);
    index = firstHeadingIndex + 1;
  }

  const introLines: string[] = [];
  const sections: ResumeSection[] = [];
  const sectionSlugCounts = new Map<string, number>();
  let activeSectionTitle = "";
  let activeSectionLines: string[] = [];

  const flushSection = () => {
    if (!activeSectionTitle) {
      return;
    }

    const baseId = slugify(activeSectionTitle);
    const nextCount = (sectionSlugCounts.get(baseId) ?? 0) + 1;
    sectionSlugCounts.set(baseId, nextCount);

    sections.push(
      parseSection(
        activeSectionTitle,
        activeSectionLines,
        nextCount === 1 ? baseId : `${baseId}-${nextCount}`,
      ),
    );
    activeSectionTitle = "";
    activeSectionLines = [];
  };

  for (; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const trimmedLine = rawLine.trim();

    if (trimmedLine.startsWith("## ")) {
      flushSection();
      activeSectionTitle = stripHeading(trimmedLine, 2);
      continue;
    }

    if (activeSectionTitle) {
      activeSectionLines.push(rawLine);
      continue;
    }

    introLines.push(rawLine);
  }

  flushSection();

  const compactIntro = introLines.map((line) => line.trim()).filter(Boolean);
  const firstIntroLine = compactIntro[0] ?? "";
  const headlineLooksLikeContact =
    firstIntroLine.includes("@") ||
    firstIntroLine.includes("|") ||
    firstIntroLine.includes("http") ||
    firstIntroLine.includes("[");
  const contactLines = headlineLooksLikeContact
    ? compactIntro
    : compactIntro.slice(1);
  const contactItems = parseContactItems(contactLines);

  return {
    name,
    headline: headlineLooksLikeContact ? "" : firstIntroLine,
    contactItems,
    contactLines,
    contactRows: buildContactRows(contactItems, style.contactStyle, contactLines),
    sections,
    style,
  };
}

export function splitCvMarkdown(markdown: string): CvMarkdownParts {
  const normalized = markdown.replace(/\r\n?/g, "\n");

  if (!normalized.startsWith("---\n")) {
    return {
      bodyMarkdown: normalized,
      frontmatter: "",
    };
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);

  if (closingIndex === -1) {
    return {
      bodyMarkdown: normalized,
      frontmatter: "",
    };
  }

  return {
    bodyMarkdown: normalized.slice(closingIndex + 5),
    frontmatter: normalized.slice(4, closingIndex),
  };
}

export function composeCvMarkdown(parts: CvMarkdownParts) {
  const bodyMarkdown = parts.bodyMarkdown.replace(/^\n+/, "");
  const frontmatter = sanitizeCvFrontmatter(parts.frontmatter);

  if (!frontmatter) {
    return bodyMarkdown;
  }

  return `---\n${frontmatter}\n---\n\n${bodyMarkdown}`;
}

export function normalizeCvMarkdown(markdown: string) {
  const { bodyMarkdown, frontmatter } = splitCvMarkdown(markdown);
  let normalizedFrontmatter = sanitizeCvFrontmatter(frontmatter);
  let normalizedBody = bodyMarkdown.replace(/^\n+/, "");

  while (normalizedBody.startsWith("---\n")) {
    const nested = splitCvMarkdown(normalizedBody);
    const nestedFrontmatter = sanitizeCvFrontmatter(nested.frontmatter);

    if (!nestedFrontmatter || !isResumeStyleFrontmatter(nestedFrontmatter)) {
      break;
    }

    if (!normalizedFrontmatter) {
      normalizedFrontmatter = nestedFrontmatter;
    }

    normalizedBody = nested.bodyMarkdown.replace(/^\n+/, "");
  }

  const canonicalFrontmatter = normalizedFrontmatter
    ? composeCvFrontmatter(parseResumeStyle(normalizedFrontmatter))
    : "";

  return composeCvMarkdown({
    bodyMarkdown: normalizedBody,
    frontmatter: canonicalFrontmatter,
  });
}

export function resolveResumeTypography(_style: ResumeStylePrefs): ResumeTypographyScale {
  void _style;

  return {
    body: DEFAULT_TYPE_BASE * TYPE_SCALE_RATIOS.body,
    contact: DEFAULT_TYPE_BASE * TYPE_SCALE_RATIOS.contact,
    date: DEFAULT_TYPE_BASE * TYPE_SCALE_RATIOS.date,
    entryMeta: DEFAULT_TYPE_BASE * TYPE_SCALE_RATIOS.entryMeta,
    entryTitle: DEFAULT_TYPE_BASE * TYPE_SCALE_RATIOS.entryTitle,
    headline: DEFAULT_TYPE_BASE * TYPE_SCALE_RATIOS.headline,
    name: DEFAULT_TYPE_BASE * TYPE_SCALE_RATIOS.name,
    sectionLabel: DEFAULT_TYPE_BASE * TYPE_SCALE_RATIOS.sectionLabel,
    skills: DEFAULT_TYPE_BASE * TYPE_SCALE_RATIOS.skills,
  };
}

export function resolveMobileResumeTypography(_style: ResumeStylePrefs): ResumeTypographyScale {
  void _style;

  return {
    body: MOBILE_TYPE_BASE * TYPE_SCALE_RATIOS.body,
    contact: MOBILE_TYPE_BASE * TYPE_SCALE_RATIOS.contact,
    date: MOBILE_TYPE_BASE * TYPE_SCALE_RATIOS.date,
    entryMeta: MOBILE_TYPE_BASE * TYPE_SCALE_RATIOS.entryMeta,
    entryTitle: MOBILE_TYPE_BASE * TYPE_SCALE_RATIOS.entryTitle,
    headline: MOBILE_TYPE_BASE * TYPE_SCALE_RATIOS.headline,
    name: MOBILE_TYPE_BASE * TYPE_SCALE_RATIOS.name,
    sectionLabel: MOBILE_TYPE_BASE * TYPE_SCALE_RATIOS.sectionLabel,
    skills: MOBILE_TYPE_BASE * TYPE_SCALE_RATIOS.skills,
  };
}

function sanitizeCvFrontmatter(frontmatter: string) {
  const lines = frontmatter.replace(/\r\n?/g, "\n").split("\n");

  while (lines[0]?.trim() === "---") {
    lines.shift();
  }

  while (lines.at(-1)?.trim() === "---") {
    lines.pop();
  }

  return lines.join("\n").trim();
}

function isResumeStyleFrontmatter(frontmatter: string) {
  const keys = new Set(Object.keys(DEFAULT_RESUME_STYLE));

  return frontmatter.split("\n").some((rawLine) => {
    const line = rawLine.trim();
    const dividerIndex = line.indexOf(":");

    if (dividerIndex < 1) {
      return false;
    }

    return keys.has(line.slice(0, dividerIndex).trim());
  });
}

function parseSection(title: string, lines: string[], id: string): ResumeSection {
  const isSkillsSection = looksLikeSkillsSection(title);
  const section: ResumeSection = {
    id,
    title,
    paragraphs: [],
    bullets: [],
    entries: [],
    skillGroups: [],
  };

  let activeEntry: ResumeEntry | null = null;
  let paragraphBuffer: string[] = [];

  const flushParagraphBuffer = () => {
    if (!paragraphBuffer.length) {
      return;
    }

    const paragraph = paragraphBuffer.join(" ").trim();
    paragraphBuffer = [];

    if (!paragraph) {
      return;
    }

    if (activeEntry) {
      activeEntry.paragraphs.push(paragraph);
      return;
    }

    section.paragraphs.push(paragraph);
  };

  const flushEntry = () => {
    flushParagraphBuffer();

    if (!activeEntry) {
      return;
    }

    section.entries.push(activeEntry);
    activeEntry = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraphBuffer();
      continue;
    }

    if (line.startsWith("### ")) {
      flushEntry();
      activeEntry = {
        titleParts: splitPipe(stripHeading(line, 3)),
        metaLeft: "",
        metaRight: "",
        paragraphs: [],
        bullets: [],
      };
      continue;
    }

    if (activeEntry && !activeEntry.metaLeft && !activeEntry.metaRight && isMetaLine(line)) {
      flushParagraphBuffer();
      const [left = "", ...rest] = splitPipeRaw(stripOuterAsterisks(line));
      activeEntry.metaLeft = left.trim();
      activeEntry.metaRight = rest.join(" | ").trim();
      continue;
    }

    if (isBulletLine(line)) {
      flushParagraphBuffer();
      const bullet = line.replace(/^[-*]\s+/, "").trim();

      if (activeEntry) {
        activeEntry.bullets.push(bullet);
      } else {
        section.bullets.push(bullet);
      }

      continue;
    }

    if (isSkillsSection && !activeEntry) {
      flushParagraphBuffer();
      section.paragraphs.push(line);
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushEntry();
  flushParagraphBuffer();

  if (isSkillsSection) {
    const bodyLines = [...section.paragraphs, ...section.bullets];
    section.skillGroups = bodyLines
      .map(parseSkillGroup)
      .filter((value): value is ResumeSkillGroup => value !== null);
  }

  return section;
}

function stripHeading(line: string, level: number) {
  return line.replace(new RegExp(`^#{${level}}\\s+`), "").trim();
}

function splitPipe(value: string) {
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitPipeRaw(value: string) {
  return value.split("|").map((part) => part.trim());
}

function stripOuterAsterisks(value: string) {
  return value.replace(/^\*+|\*+$/g, "").trim();
}

function isBulletLine(line: string) {
  return /^[-*]\s+/.test(line);
}

function isMetaLine(line: string) {
  return /^\*.*\*$/.test(line);
}

function looksLikeSkillsSection(title: string) {
  return /skills?/i.test(title);
}

function parseSkillGroup(line: string) {
  const dividerIndex = line.indexOf(":");

  if (dividerIndex < 1) {
    return null;
  }

  return {
    label: line.slice(0, dividerIndex).trim(),
    value: line.slice(dividerIndex + 1).trim(),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
