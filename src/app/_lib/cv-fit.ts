import {
  layout,
  measureNaturalWidth,
  prepare,
  prepareWithSegments,
} from "@chenglou/pretext";
import type {
  ResumeDocument,
  ResumeEntry,
  ResumePageSize,
  ResumeSection,
  ResumeStylePrefs,
} from "@/app/_lib/cv-markdown";
import { resolveResumeDensityMultiplier } from "@/app/_lib/cv-markdown";

const PX_PER_INCH = 96;
const DOCUMENT_TOP_MARGIN = 0.2 * PX_PER_INCH;
const SECTION_GAP = 0.16 * PX_PER_INCH;
const SECTION_HEADING_MARGIN_BOTTOM = 0.08 * PX_PER_INCH;
const SECTION_PARAGRAPH_GAP = 0.07 * PX_PER_INCH;
const ENTRY_GAP = 0.13 * PX_PER_INCH;
const ENTRY_TITLE_GAP = 0.18 * PX_PER_INCH;
const ENTRY_META_MARGIN_TOP = 0.024 * PX_PER_INCH;
const ENTRY_PARAGRAPH_MARGIN_TOP = 0.045 * PX_PER_INCH;
const ENTRY_BULLET_MARGIN_TOP = 0.05 * PX_PER_INCH;
const BULLET_GAP = 0.045 * PX_PER_INCH;
const BULLET_INDENT = 0.18 * PX_PER_INCH;
const CONTACT_GAP = 0.035 * PX_PER_INCH;
const SKILL_ROW_GAP = 0.04 * PX_PER_INCH;
const SKILL_COLUMN_GAP = 0.16 * PX_PER_INCH;
const HEADER_BORDER_ALLOWANCE = 1;

export const CV_SCALE_LIMITS = {
  min: 0.3,
  max: 1.18,
  step: 0.005,
};

export const AGGRESSIVE_CV_SCALE_LIMITS = {
  min: 0.2,
  max: 1.18,
  step: 0.005,
};

export type CvScaleLimits = typeof CV_SCALE_LIMITS;

export type MeasuredTextStyle = {
  fontFamily: string;
  fontSize: number;
  fontStretch: string;
  fontStyle: string;
  fontVariant: string;
  fontWeight: string;
  lineHeight: number;
};

export type CvTypography = {
  body: MeasuredTextStyle;
  contact: MeasuredTextStyle;
  entryDate: MeasuredTextStyle;
  entryMeta: MeasuredTextStyle;
  entryTitle: MeasuredTextStyle;
  headline: MeasuredTextStyle;
  name: MeasuredTextStyle;
  sectionLabel: MeasuredTextStyle;
  skillsTerm: MeasuredTextStyle;
  skillsValue: MeasuredTextStyle;
};

type MeasurementCaches = {
  naturalWidth: Map<string, number>;
  prepared: Map<string, ReturnType<typeof prepare>>;
  preparedSegments: Map<string, ReturnType<typeof prepareWithSegments>>;
};

type PageMetrics = {
  contentHeight: number;
  contentWidth: number;
  pageHeight: number;
  pageWidth: number;
  paddingBottom: number;
  paddingTop: number;
  paddingX: number;
};

export function readMeasuredTextStyle(node: HTMLElement | null): MeasuredTextStyle | null {
  if (!node) {
    return null;
  }

  const styles = window.getComputedStyle(node);
  const fontSize = Number.parseFloat(styles.fontSize);
  const lineHeight = Number.parseFloat(styles.lineHeight);

  if (!Number.isFinite(fontSize) || !Number.isFinite(lineHeight)) {
    return null;
  }

  return {
    fontFamily: styles.fontFamily,
    fontSize,
    fontStretch: styles.fontStretch,
    fontStyle: styles.fontStyle,
    fontVariant: styles.fontVariant,
    fontWeight: styles.fontWeight,
    lineHeight,
  };
}

export function estimateResumeScale(
  document: ResumeDocument,
  typography: CvTypography,
  limits: CvScaleLimits = CV_SCALE_LIMITS,
) {
  const page = getPageMetrics(document.style);
  let low = limits.min;
  let high = limits.max;
  let best = limits.min;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const scale = (low + high) / 2;
    const height = estimateDocumentHeight(document, typography, scale, page);

    if (height <= page.contentHeight) {
      best = scale;
      low = scale;
    } else {
      high = scale;
    }
  }

  return Number(best.toFixed(3));
}

function estimateDocumentHeight(
  document: ResumeDocument,
  typography: CvTypography,
  scale: number,
  page: PageMetrics,
) {
  const caches: MeasurementCaches = {
    naturalWidth: new Map(),
    prepared: new Map(),
    preparedSegments: new Map(),
  };
  const compression = getFitCompression(scale) * resolveResumeDensityMultiplier(document.style.density);

  let total = 0;
  total += measureParagraph(document.name, typography.name, page.contentWidth, scale, caches);

  if (document.headline) {
    total += compressSpacing(0.1 * PX_PER_INCH, compression);
    total += measureParagraph(
      document.headline,
      typography.headline,
      page.contentWidth,
      scale,
      caches,
    );
  }

  if (document.contactRows.length) {
    total += compressSpacing(0.11 * PX_PER_INCH, compression);

    document.contactRows.forEach((line, index) => {
      total += measureParagraph(line, typography.contact, page.contentWidth, scale, caches);

      if (index < document.contactRows.length - 1) {
        total += compressSpacing(CONTACT_GAP, compression);
      }
    });
  }

  total += compressSpacing(0.2 * PX_PER_INCH, compression);
  total += HEADER_BORDER_ALLOWANCE;

  document.sections.forEach((section, index) => {
    if (index === 0) {
      total += compressSpacing(DOCUMENT_TOP_MARGIN, compression);
    } else {
      total += compressSpacing(SECTION_GAP, compression);
    }

    total += Math.max(typography.sectionLabel.lineHeight * scale, 1);
    total += compressSpacing(SECTION_HEADING_MARGIN_BOTTOM, compression);
    total += estimateSectionHeight(section, typography, scale, caches, page, compression);
  });

  return total;
}

function estimateSectionHeight(
  section: ResumeSection,
  typography: CvTypography,
  scale: number,
  caches: MeasurementCaches,
  page: PageMetrics,
  compression: number,
) {
  if (section.skillGroups.length) {
    return estimateSkillsHeight(section, typography, scale, caches, page, compression);
  }

  let total = 0;

  if (section.paragraphs.length) {
    total += measureParagraphGroup(
      section.paragraphs,
      typography.body,
      page.contentWidth,
      scale,
      caches,
      compressSpacing(SECTION_PARAGRAPH_GAP, compression),
    );
  }

  if (section.bullets.length && !section.entries.length) {
    if (total > 0) {
      total += compressSpacing(ENTRY_BULLET_MARGIN_TOP, compression);
    }

    total += measureBulletGroup(section.bullets, typography.body, scale, caches, page, compression);
  }

  if (section.entries.length) {
    if (total > 0) {
      total += compressSpacing(ENTRY_GAP, compression);
    }

    total += section.entries.reduce((height, entry, index) => {
      const entryHeight = estimateEntryHeight(entry, typography, scale, caches, page, compression);

      if (index === 0) {
        return entryHeight;
      }

      return height + compressSpacing(ENTRY_GAP, compression) + entryHeight;
    }, 0);
  }

  return total;
}

function estimateEntryHeight(
  entry: ResumeEntry,
  typography: CvTypography,
  scale: number,
  caches: MeasurementCaches,
  page: PageMetrics,
  compression: number,
) {
  let total = 0;
  const dateText = inlineMarkdownToText(entry.metaRight ?? "");
  const dateWidth = dateText
    ? measureTextNaturalWidth(dateText, typography.entryDate, scale, caches)
    : 0;
  const titleWidth = dateWidth
    ? Math.max(1, page.contentWidth - dateWidth - compressSpacing(ENTRY_TITLE_GAP, compression))
    : page.contentWidth;
  const titleText = entry.titleParts.join(" · ");

  const titleHeight = measureParagraph(
    titleText,
    typography.entryTitle,
    titleWidth,
    scale,
    caches,
  );
  const dateHeight = dateText
    ? measureParagraph(dateText, typography.entryDate, dateWidth, scale, caches)
    : 0;

  total += Math.max(titleHeight, dateHeight);

  if (entry.metaLeft) {
    total += compressSpacing(ENTRY_META_MARGIN_TOP, compression);
    total += measureParagraph(
      entry.metaLeft,
      typography.entryMeta,
      page.contentWidth,
      scale,
      caches,
    );
  }

  if (entry.paragraphs.length) {
    total += compressSpacing(ENTRY_PARAGRAPH_MARGIN_TOP, compression);
    total += measureParagraphGroup(
      entry.paragraphs,
      typography.body,
      page.contentWidth,
      scale,
      caches,
      compressSpacing(SECTION_PARAGRAPH_GAP, compression),
    );
  }

  if (entry.bullets.length) {
    total += compressSpacing(ENTRY_BULLET_MARGIN_TOP, compression);
    total += measureBulletGroup(entry.bullets, typography.body, scale, caches, page, compression);
  }

  return total;
}

function estimateSkillsHeight(
  section: ResumeSection,
  typography: CvTypography,
  scale: number,
  caches: MeasurementCaches,
  page: PageMetrics,
  compression: number,
) {
  const termColumnWidth = section.skillGroups.reduce((maxWidth, group) => {
    const width = measureTextNaturalWidth(group.label, typography.skillsTerm, scale, caches);
    return Math.max(maxWidth, width);
  }, 0);
  const skillColumnGap = compressSpacing(SKILL_COLUMN_GAP, compression);
  const computedValueWidth = Math.max(1, page.contentWidth - termColumnWidth - skillColumnGap);

  return section.skillGroups.reduce((height, group, index) => {
    const rowHeight = Math.max(
      measureParagraph(group.label, typography.skillsTerm, termColumnWidth, scale, caches),
      measureParagraph(group.value, typography.skillsValue, computedValueWidth, scale, caches),
    );

    if (index === 0) {
      return rowHeight;
    }

    return height + compressSpacing(SKILL_ROW_GAP, compression) + rowHeight;
  }, 0);
}

function measureParagraphGroup(
  lines: string[],
  style: MeasuredTextStyle,
  width: number,
  scale: number,
  caches: MeasurementCaches,
  gap: number,
) {
  return lines.reduce((height, line, index) => {
    const lineHeight = measureParagraph(line, style, width, scale, caches);

    if (index === 0) {
      return lineHeight;
    }

    return height + gap + lineHeight;
  }, 0);
}

function measureBulletGroup(
  bullets: string[],
  style: MeasuredTextStyle,
  scale: number,
  caches: MeasurementCaches,
  page: PageMetrics,
  compression: number,
) {
  const width = Math.max(1, page.contentWidth - BULLET_INDENT);

  return bullets.reduce((height, bullet, index) => {
    const bulletHeight = measureParagraph(bullet, style, width, scale, caches);

    if (index === 0) {
      return bulletHeight;
    }

    return height + compressSpacing(BULLET_GAP, compression) + bulletHeight;
  }, 0);
}

function compressSpacing(value: number, compression: number) {
  return value * compression;
}

function getFitCompression(fitScale: number) {
  if (fitScale >= 0.92) {
    return 1;
  }

  if (fitScale <= 0.2) {
    return 0.4;
  }

  const progress = (0.92 - fitScale) / 0.72;
  return 1 - progress * 0.6;
}

function measureParagraph(
  text: string,
  style: MeasuredTextStyle,
  width: number,
  scale: number,
  caches: MeasurementCaches,
) {
  const normalizedText = inlineMarkdownToText(text);

  if (!normalizedText) {
    return 0;
  }

  if (!canMeasureTextWithCanvas()) {
    return estimateFallbackParagraphHeight(normalizedText, style, width, scale);
  }

  const font = buildCanvasFont(style, scale);
  const cacheKey = `${font}::${normalizedText}`;
  let prepared = caches.prepared.get(cacheKey);

  if (!prepared) {
    prepared = prepare(normalizedText, font);
    caches.prepared.set(cacheKey, prepared);
  }

  return layout(prepared, width, style.lineHeight * scale).height;
}

function measureTextNaturalWidth(
  text: string,
  style: MeasuredTextStyle,
  scale: number,
  caches: MeasurementCaches,
) {
  const normalizedText = inlineMarkdownToText(text);

  if (!normalizedText) {
    return 0;
  }

  if (!canMeasureTextWithCanvas()) {
    return estimateFallbackTextWidth(normalizedText, style, scale);
  }

  const font = buildCanvasFont(style, scale);
  const cacheKey = `${font}::${normalizedText}`;
  const cached = caches.naturalWidth.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  let prepared = caches.preparedSegments.get(cacheKey);

  if (!prepared) {
    prepared = prepareWithSegments(normalizedText, font);
    caches.preparedSegments.set(cacheKey, prepared);
  }

  const width = measureNaturalWidth(prepared);
  caches.naturalWidth.set(cacheKey, width);
  return width;
}

function canMeasureTextWithCanvas() {
  return typeof OffscreenCanvas !== "undefined" ||
    (typeof document !== "undefined" && typeof document.createElement === "function");
}

function estimateFallbackParagraphHeight(
  text: string,
  style: MeasuredTextStyle,
  width: number,
  scale: number,
) {
  const naturalWidth = estimateFallbackTextWidth(text, style, scale);
  const lineCount = Math.max(1, Math.ceil(naturalWidth / Math.max(width, 1)));
  return lineCount * style.lineHeight * scale;
}

function estimateFallbackTextWidth(text: string, style: MeasuredTextStyle, scale: number) {
  const fontSize = style.fontSize * scale;
  const weight = Number.parseInt(style.fontWeight, 10);
  const weightMultiplier = Number.isFinite(weight) && weight >= 600 ? 1.04 : 1;
  const uppercaseMultiplier = text === text.toUpperCase() ? 1.08 : 1;
  return text.length * fontSize * 0.54 * weightMultiplier * uppercaseMultiplier;
}

function buildCanvasFont(style: MeasuredTextStyle, scale: number) {
  const size = `${(style.fontSize * scale).toFixed(3)}px`;
  const stretch = style.fontStretch && style.fontStretch !== "normal"
    ? `${style.fontStretch} `
    : "";
  const variant = style.fontVariant && style.fontVariant !== "normal"
    ? `${style.fontVariant} `
    : "";

  return `${style.fontStyle} ${variant}${style.fontWeight} ${stretch}${size} ${style.fontFamily}`
    .replace(/\s+/g, " ")
    .trim();
}

function inlineMarkdownToText(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPageMetrics(
  page: Pick<ResumeStylePrefs, "pageMargin" | "pageSize"> | ResumePageSize,
): PageMetrics {
  const pageSize = typeof page === "string" ? page : page.pageSize;
  const pageMargin = typeof page === "string" ? 1 : page.pageMargin;
  const pageWidth = 8.5 * PX_PER_INCH;
  const pageHeight = (pageSize === "legal" ? 14 : 11) * PX_PER_INCH;
  const paddingX = pageMargin * PX_PER_INCH;
  const paddingTop = pageMargin * PX_PER_INCH;
  const paddingBottom = pageMargin * PX_PER_INCH;

  return {
    contentHeight: pageHeight - paddingTop - paddingBottom,
    contentWidth: pageWidth - paddingX * 2,
    pageHeight,
    pageWidth,
    paddingBottom,
    paddingTop,
    paddingX,
  };
}
