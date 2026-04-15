import type {
  ResumeAccentTone,
  ResumeContactStyle,
  ResumeDensity,
  ResumeFontToken,
  ResumeHeaderAlignment,
  ResumePageSize,
  ResumeResolvedStyle,
  ResumeStylePrefs,
  ResumeStylePreset,
} from "@/app/_lib/cv-markdown";

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

const RESUME_ACCENT_TOKENS: Record<
  ResumeAccentTone,
  Omit<ResumeResolvedStyle, "bodyFontFamily" | "densityMultiplier" | "displayFontFamily" | "headerAlignment">
> = {
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

const LEGACY_DEFAULT_PAGE_MARGIN = 0.62;

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

export function parseResumeStyle(frontmatter: string): ResumeStylePrefs {
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
