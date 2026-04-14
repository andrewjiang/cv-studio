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
  platform?: "email" | "github" | "linkedin" | "phone" | "x";
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

export const RESUME_PRESET_LABELS: Record<ResumeStylePreset, string> = {
  classic: "Classic ATS",
  creative: "Creative Edge",
  editorial: "Editorial Serif",
  executive: "Executive Accent",
  minimal: "Modern Minimal",
  technical: "Technical Clean",
};
export const RESUME_STYLE_PRESETS = Object.keys(RESUME_PRESET_LABELS) as ResumeStylePreset[];

export const RESUME_ACCENT_LABELS: Record<ResumeAccentTone, string> = {
  claret: "Claret",
  forest: "Forest",
  navy: "Navy",
  plum: "Plum",
  slate: "Slate",
};
export const RESUME_ACCENT_TONES = Object.keys(RESUME_ACCENT_LABELS) as ResumeAccentTone[];

export const RESUME_DENSITY_LABELS: Record<ResumeDensity, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
  standard: "Standard",
};
export const RESUME_DENSITIES = Object.keys(RESUME_DENSITY_LABELS) as ResumeDensity[];

export const RESUME_HEADER_ALIGNMENT_LABELS: Record<ResumeHeaderAlignment, string> = {
  center: "Centered",
  left: "Left",
};
export const RESUME_HEADER_ALIGNMENTS = Object.keys(
  RESUME_HEADER_ALIGNMENT_LABELS,
) as ResumeHeaderAlignment[];

const RESUME_PRESET_DEFAULTS: Record<ResumeStylePreset, ResumeStylePrefs> = {
  classic: {
    accentTone: "slate",
    bodyFont: "source-sans",
    contactStyle: "classic",
    density: "standard",
    displayFont: "source-sans",
    headerAlignment: "left",
    pageMargin: 1,
    stylePreset: "classic",
    showHeaderDivider: false,
    showSectionDivider: false,
    pageSize: "letter",
  },
  minimal: {
    accentTone: "slate",
    bodyFont: "manrope",
    contactStyle: "compact",
    density: "compact",
    displayFont: "manrope",
    headerAlignment: "left",
    pageMargin: 0.95,
    stylePreset: "minimal",
    showHeaderDivider: false,
    showSectionDivider: true,
    pageSize: "letter",
  },
  editorial: {
    accentTone: "forest",
    bodyFont: "source-sans",
    contactStyle: "compact",
    density: "standard",
    displayFont: "newsreader",
    headerAlignment: "left",
    pageMargin: 1,
    stylePreset: "editorial",
    showHeaderDivider: false,
    showSectionDivider: true,
    pageSize: "letter",
  },
  executive: {
    accentTone: "navy",
    bodyFont: "source-sans",
    contactStyle: "compact",
    density: "comfortable",
    displayFont: "source-serif",
    headerAlignment: "left",
    pageMargin: 1,
    stylePreset: "executive",
    showHeaderDivider: false,
    showSectionDivider: true,
    pageSize: "letter",
  },
  technical: {
    accentTone: "forest",
    bodyFont: "plex-sans",
    contactStyle: "compact",
    density: "compact",
    displayFont: "plex-sans",
    headerAlignment: "left",
    pageMargin: 0.9,
    stylePreset: "technical",
    showHeaderDivider: false,
    showSectionDivider: true,
    pageSize: "letter",
  },
  creative: {
    accentTone: "plum",
    bodyFont: "manrope",
    contactStyle: "compact",
    density: "standard",
    displayFont: "newsreader",
    headerAlignment: "center",
    pageMargin: 0.95,
    stylePreset: "creative",
    showHeaderDivider: false,
    showSectionDivider: true,
    pageSize: "letter",
  },
};

export const DEFAULT_RESUME_STYLE: ResumeStylePrefs = RESUME_PRESET_DEFAULTS.editorial;

const RESUME_ACCENT_TOKENS: Record<ResumeAccentTone, Omit<ResumeResolvedStyle, "bodyFontFamily" | "displayFontFamily" | "densityMultiplier" | "headerAlignment">> = {
  claret: {
    accent: "#be123c",
    accentStrong: "#881337",
    iconSurface: "#fdf2f8",
    iconSurfaceHover: "#fce7f3",
    ink: "#1f1720",
    subtle: "#5b4755",
  },
  forest: {
    accent: "#0f766e",
    accentStrong: "#134e4a",
    iconSurface: "#f1f7f4",
    iconSurfaceHover: "#e4efe8",
    ink: "#111827",
    subtle: "#475569",
  },
  navy: {
    accent: "#1d4ed8",
    accentStrong: "#1e3a8a",
    iconSurface: "#eff6ff",
    iconSurfaceHover: "#dbeafe",
    ink: "#0f172a",
    subtle: "#475569",
  },
  plum: {
    accent: "#7c3aed",
    accentStrong: "#5b21b6",
    iconSurface: "#f6f0ff",
    iconSurfaceHover: "#ede9fe",
    ink: "#17111f",
    subtle: "#5b4d68",
  },
  slate: {
    accent: "#475569",
    accentStrong: "#334155",
    iconSurface: "#f8fafc",
    iconSurfaceHover: "#f1f5f9",
    ink: "#0f172a",
    subtle: "#475569",
  },
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

const LEGACY_DEFAULT_PAGE_MARGIN = 0.62;
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
### CV Studio | React, Next.js, TypeScript
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

export function composeCvFrontmatter(style: ResumeStylePrefs) {
  return `stylePreset: ${style.stylePreset}
displayFont: ${style.displayFont}
bodyFont: ${style.bodyFont}
accentTone: ${style.accentTone}
density: ${style.density}
headerAlignment: ${style.headerAlignment}
contactStyle: ${style.contactStyle}
pageMargin: ${style.pageMargin}
showHeaderDivider: ${style.showHeaderDivider}
showSectionDivider: ${style.showSectionDivider}
pageSize: ${style.pageSize}`;
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

export function resolveResumeStyle(style: ResumeStylePrefs): ResumeResolvedStyle {
  const colors = RESUME_ACCENT_TOKENS[style.accentTone];

  return {
    ...colors,
    bodyFontFamily: fontFamilyForToken(style.bodyFont),
    densityMultiplier: resolveResumeDensityMultiplier(style.density),
    displayFontFamily: fontFamilyForToken(style.displayFont),
    headerAlignment: style.headerAlignment,
  };
}

export function resolveResumeStylePresetDefaults(preset: ResumeStylePreset) {
  return RESUME_PRESET_DEFAULTS[preset];
}

export function resolveResumeDensityMultiplier(density: ResumeDensity) {
  if (density === "comfortable") {
    return 1.08;
  }

  if (density === "compact") {
    return 0.92;
  }

  return 1;
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

function parseResumeStyle(frontmatter: string): ResumeStylePrefs {
  let preset = DEFAULT_RESUME_STYLE.stylePreset;
  const explicit: Partial<ResumeStylePrefs> = {};
  let pageMarginWasExplicit = false;
  let headerDividerWasExplicit = false;
  let sectionDividerWasExplicit = false;

  if (!frontmatter.trim()) {
    return { ...DEFAULT_RESUME_STYLE };
  }

  for (const rawLine of frontmatter.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const dividerIndex = line.indexOf(":");

    if (dividerIndex < 1) {
      continue;
    }

    const rawKey = line.slice(0, dividerIndex).trim();
    const rawValue = line.slice(dividerIndex + 1).trim();

    if (rawKey === "bodySize" || rawKey === "baseSize") {
      continue;
    }

    if (rawKey === "stylePreset") {
      preset = parseStylePreset(rawValue);
      continue;
    }

    const key = rawKey as keyof ResumeStylePrefs;

    if (!(key in DEFAULT_RESUME_STYLE)) {
      continue;
    }

    if (isBooleanStyleKey(key)) {
      explicit[key] = parseBoolean(rawValue) as ResumeStylePrefs[typeof key];
      if (key === "showHeaderDivider") {
        headerDividerWasExplicit = true;
      }
      if (key === "showSectionDivider") {
        sectionDividerWasExplicit = true;
      }
      continue;
    }

    if (isFontChoiceStyleKey(key)) {
      explicit[key] = parseFontToken(rawValue) as ResumeStylePrefs[typeof key];
      continue;
    }

    if (key === "contactStyle") {
      explicit.contactStyle = parseContactStyle(rawValue);
      continue;
    }

    if (key === "accentTone") {
      explicit.accentTone = parseAccentTone(rawValue);
      continue;
    }

    if (key === "density") {
      explicit.density = parseDensity(rawValue);
      continue;
    }

    if (key === "headerAlignment") {
      explicit.headerAlignment = parseHeaderAlignment(rawValue);
      continue;
    }

    if (key === "pageSize") {
      explicit.pageSize = parsePageSize(rawValue);
      continue;
    }

    const parsedNumber = Number.parseFloat(rawValue);

    if (!Number.isFinite(parsedNumber)) {
      continue;
    }

    if (key === "pageMargin") {
      explicit[key] = parsedNumber as ResumeStylePrefs[typeof key];
      pageMarginWasExplicit = true;
    }
  }

  const style = {
    ...RESUME_PRESET_DEFAULTS[preset],
    ...explicit,
    stylePreset: preset,
  };

  // Migrate the old hidden default margin to the new 1in baseline.
  if (
    pageMarginWasExplicit &&
    Math.abs(style.pageMargin - LEGACY_DEFAULT_PAGE_MARGIN) < 0.0001
  ) {
    style.pageMargin = DEFAULT_RESUME_STYLE.pageMargin;
  }

  if (!headerDividerWasExplicit) {
    style.showHeaderDivider = RESUME_PRESET_DEFAULTS[preset].showHeaderDivider;
  }

  if (!sectionDividerWasExplicit) {
    style.showSectionDivider = RESUME_PRESET_DEFAULTS[preset].showSectionDivider;
  }

  return style;
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

    if (activeEntry && !activeEntry.metaLeft && !activeEntry.metaRight && isMetaLine(line)) {
      flushParagraphBuffer();
      const [left = "", ...rest] = splitPipeRaw(stripOuterAsterisks(line));
      activeEntry.metaLeft = left.trim();
      activeEntry.metaRight = rest.join(" | ").trim();
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

function isBooleanStyleKey(
  key: keyof ResumeStylePrefs,
): key is "showHeaderDivider" | "showSectionDivider" {
  return key === "showHeaderDivider" || key === "showSectionDivider";
}

function isFontChoiceStyleKey(
  key: keyof ResumeStylePrefs,
): key is "bodyFont" | "displayFont" {
  return key === "bodyFont" || key === "displayFont";
}

function parseBoolean(value: string) {
  return /^true$/i.test(value);
}

function parseFontToken(value: string): ResumeFontToken {
  if (value === "sans") {
    return "source-sans";
  }

  if (value === "serif") {
    return "source-serif";
  }

  if (value === "mono") {
    return "plex-mono";
  }

  if (
    value === "manrope" ||
    value === "newsreader" ||
    value === "plex-mono" ||
    value === "plex-sans" ||
    value === "source-sans" ||
    value === "source-serif"
  ) {
    return value;
  }

  return DEFAULT_RESUME_STYLE.bodyFont;
}

function parseContactStyle(value: string): ResumeContactStyle {
  if (value === "classic" || value === "web-icons") {
    return value;
  }

  return "compact";
}

function parsePageSize(value: string): ResumePageSize {
  return value === "legal" ? "legal" : "letter";
}

function parseStylePreset(value: string): ResumeStylePreset {
  if (
    value === "classic" ||
    value === "creative" ||
    value === "minimal" ||
    value === "editorial" ||
    value === "executive" ||
    value === "technical"
  ) {
    return value;
  }

  return DEFAULT_RESUME_STYLE.stylePreset;
}

function parseAccentTone(value: string): ResumeAccentTone {
  if (value === "slate" || value === "navy" || value === "plum" || value === "claret") {
    return value;
  }

  return "forest";
}

function parseDensity(value: string): ResumeDensity {
  if (value === "comfortable" || value === "compact") {
    return value;
  }

  return "standard";
}

function parseHeaderAlignment(value: string): ResumeHeaderAlignment {
  return value === "center" ? "center" : "left";
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

function parseContactItems(lines: string[]) {
  return lines
    .flatMap((line) => splitPipe(line))
    .map(parseContactItem);
}

function parseContactItem(segment: string): ResumeContactItem {
  const markdownLink = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

  if (markdownLink) {
    const [, rawLabel, href] = markdownLink;
    return normalizeContactLink(rawLabel.trim(), href.trim());
  }

  if (segment.includes("@") && !segment.includes(" ")) {
    return {
      href: `mailto:${segment}`,
      kind: "email",
      label: segment,
      platform: "email",
    };
  }

  if (/^\+?[\d()\-. ]{7,}$/.test(segment)) {
    return {
      href: `tel:${segment.replace(/[^\d+]/g, "")}`,
      kind: "phone",
      label: segment,
      platform: "phone",
    };
  }

  return {
    kind: "location",
    label: segment,
  };
}

function normalizeContactLink(label: string, href: string): ResumeContactItem {
  const normalizedHref = href.startsWith("mailto:") || href.startsWith("tel:")
    ? href
    : href.match(/^https?:\/\//i)
      ? href
      : `https://${href}`;

  if (href.startsWith("mailto:") || label.includes("@")) {
    return {
      href: normalizedHref,
      kind: "email",
      label: label.includes("@") ? label : href.replace(/^mailto:/i, ""),
      platform: "email",
    };
  }

  let hostname = "";

  try {
    hostname = new URL(normalizedHref).hostname.toLowerCase();
  } catch {
    hostname = "";
  }

  if (hostname.includes("linkedin.com")) {
    return {
      href: normalizedHref,
      kind: "social",
      label: "LinkedIn",
      platform: "linkedin",
    };
  }

  if (hostname.includes("github.com")) {
    return {
      href: normalizedHref,
      kind: "social",
      label: "GitHub",
      platform: "github",
    };
  }

  if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
    return {
      href: normalizedHref,
      kind: "social",
      label: "X",
      platform: "x",
    };
  }

  return {
    href: normalizedHref,
    kind: "text",
    label,
  };
}

function buildContactRows(
  items: ResumeContactItem[],
  contactStyle: ResumeContactStyle,
  fallbackLines: string[],
) {
  if (contactStyle === "classic") {
    return fallbackLines;
  }

  const rows = [items.map((item) => item.label).join(" · ")].filter(Boolean);

  return rows.length ? rows : fallbackLines;
}

export function fontFamilyForToken(token: ResumeFontToken) {
  switch (token) {
    case "manrope":
      return "var(--font-ui-manrope), var(--font-ui-sans), sans-serif";
    case "newsreader":
      return "var(--font-display-newsreader), var(--font-display-serif), serif";
    case "plex-mono":
      return "var(--font-ui-mono), monospace";
    case "plex-sans":
      return "var(--font-ui-plex-sans), var(--font-ui-sans), sans-serif";
    case "source-serif":
      return "var(--font-display-serif), serif";
    case "source-sans":
    default:
      return "var(--font-ui-sans), sans-serif";
  }
}
