import {
  AGGRESSIVE_CV_SCALE_LIMITS,
  CV_SCALE_LIMITS,
  estimateResumeScale,
  type CvTypography,
  type MeasuredTextStyle,
} from "@/app/_lib/cv-fit";
import {
  composeCvFrontmatter,
  composeCvMarkdown,
  normalizeCvMarkdown,
  parseCvMarkdown,
  resolveResumeStyle,
  resolveResumeStylePresetDefaults,
  resolveResumeTypography,
  splitCvMarkdown,
  type ResumeContactItem,
  type ResumeStylePrefs,
} from "@/app/_lib/cv-markdown";
import { parseResumeStyle } from "@/app/_lib/resume-style";
import {
  evaluateResumeQuality,
  type ResumeQualityGate,
} from "@/app/_lib/resume-quality";
import type {
  CreateResumeRequest,
  ResumeJsonContactInput,
  ResumeJsonInput,
  ResumeJsonSectionInput,
  ResumeStyleOverrideInput,
  ValidateResumeRequest,
  ValidateResumeResponse,
  ValidationError,
  ValidationWarning,
} from "@/app/_lib/developer-platform-types";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

type CompileResult = {
  errors: ValidationError[];
  fitScale: number;
  inferredTemplateKey: TemplateKey | null;
  inputFormat: "json" | "markdown";
  markdown: string;
  publishErrors: ValidationError[];
  publishReady: boolean;
  qualityWarnings: ValidationWarning[];
  valid: boolean;
  warnings: ValidationWarning[];
};

const TYPESET_LINE_HEIGHTS: Record<keyof CvTypography, number> = {
  body: 1.48,
  contact: 1.4,
  entryDate: 1.2,
  entryMeta: 1.25,
  entryTitle: 1.2,
  headline: 1.18,
  name: 0.94,
  sectionLabel: 1.18,
  skillsTerm: 1.4,
  skillsValue: 1.4,
};

export const RESUME_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  additionalProperties: false,
  properties: {
    contact: {
      items: {
        additionalProperties: false,
        properties: {
          href: { type: "string" },
          kind: {
            enum: ["email", "phone", "location", "url", "linkedin", "github", "x", "text"],
            type: "string",
          },
          label: { type: "string" },
          value: { type: "string" },
        },
        required: ["kind", "value"],
        type: "object",
      },
      type: "array",
    },
    headline: { type: "string" },
    name: { type: "string" },
    sections: {
      items: {
        oneOf: [
          {
            additionalProperties: false,
            properties: {
              paragraphs: { items: { type: "string" }, minItems: 1, type: "array" },
              title: { type: "string" },
              type: { const: "summary", type: "string" },
            },
            required: ["type", "paragraphs"],
            type: "object",
          },
          {
            additionalProperties: false,
            properties: {
              entries: {
                items: {
                  additionalProperties: false,
                  properties: {
                    bullets: { items: { type: "string" }, type: "array" },
                    meta_left: { type: "string" },
                    meta_right: { type: "string" },
                    paragraphs: { items: { type: "string" }, type: "array" },
                    title: { type: "string" },
                    title_extras: { items: { type: "string" }, type: "array" },
                  },
                  required: ["title"],
                  type: "object",
                },
                minItems: 1,
                type: "array",
              },
              title: { type: "string" },
              type: { const: "entries", type: "string" },
            },
            required: ["type", "title", "entries"],
            type: "object",
          },
          {
            additionalProperties: false,
            properties: {
              bullets: { items: { type: "string" }, minItems: 1, type: "array" },
              title: { type: "string" },
              type: { const: "bullets", type: "string" },
            },
            required: ["type", "title", "bullets"],
            type: "object",
          },
          {
            additionalProperties: false,
            properties: {
              groups: {
                items: {
                  additionalProperties: false,
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                  },
                  required: ["label", "value"],
                  type: "object",
                },
                minItems: 1,
                type: "array",
              },
              title: { type: "string" },
              type: { const: "skills", type: "string" },
            },
            required: ["type", "groups"],
            type: "object",
          },
        ],
      },
      minItems: 1,
      type: "array",
    },
  },
  required: ["name", "sections"],
  type: "object",
} as const;

export function compileResumeInput(input: CreateResumeRequest | ValidateResumeRequest): CompileResult {
  const qualityGate = readQualityGate(input);

  if (input.input_format === "markdown") {
    return compileMarkdownInput({
      markdown: input.markdown,
      qualityGate,
      styleOverrides: input.style_overrides,
      templateKey: input.template_key,
    });
  }

  return compileJsonInput({
    qualityGate,
    resume: input.resume,
    styleOverrides: input.style,
    templateKey: input.template_key,
  });
}

export function validateResumeInput(input: CreateResumeRequest | ValidateResumeRequest): ValidateResumeResponse {
  const compiled = compileResumeInput(input);

  return {
    errors: compiled.errors,
    inferred_template_key: compiled.inferredTemplateKey,
    normalized_markdown: compiled.valid ? compiled.markdown : undefined,
    publish_errors: compiled.publishErrors,
    publish_ready: compiled.publishReady,
    quality_warnings: compiled.qualityWarnings,
    valid: compiled.valid,
    warnings: compiled.warnings,
  };
}

function compileMarkdownInput({
  markdown,
  qualityGate,
  styleOverrides,
  templateKey,
}: {
  markdown: string;
  qualityGate: ResumeQualityGate;
  styleOverrides?: ResumeStyleOverrideInput;
  templateKey?: TemplateKey;
}) {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!markdown.trim()) {
    errors.push({
      code: "invalid_markdown",
      message: "Markdown input cannot be empty.",
      path: "markdown",
    });

    return {
      errors,
      fitScale: 1,
      inferredTemplateKey: templateKey ?? null,
      inputFormat: "markdown" as const,
      markdown,
      publishErrors: [],
      publishReady: false,
      qualityWarnings: [],
      valid: false,
      warnings,
    };
  }

  const normalizedMarkdown = applyStyleOverridesToMarkdown(normalizeCvMarkdown(markdown), styleOverrides);
  const document = parseCvMarkdown(normalizedMarkdown);

  if (!document.name.trim() || document.name === "Your Name") {
    errors.push({
      code: "invalid_markdown",
      message: "Resume markdown must include a top-level # heading for the candidate name.",
      path: "markdown",
    });
  }

  if (!document.sections.length) {
    warnings.push({
      code: "empty_sections",
      message: "This resume has no sections yet.",
    });
  }

  const publishQuality = evaluateResumeQuality({
    document,
    gate: "publish",
    markdown: normalizedMarkdown,
  });
  const requestedQuality = qualityGate === "publish"
    ? publishQuality
    : evaluateResumeQuality({
      document,
      gate: "draft",
      markdown: normalizedMarkdown,
    });

  errors.push(...requestedQuality.errors);
  warnings.push(...requestedQuality.warnings);

  const fitScale = estimateServerFitScale(normalizedMarkdown);

  if (fitScale <= CV_SCALE_LIMITS.min + 0.002) {
    warnings.push({
      code: "aggressive_fit",
      message: "This resume is dense enough that Tiny CV used aggressive one-page fit estimation.",
    });
  }

  return {
    errors,
    fitScale,
    inferredTemplateKey: templateKey ?? inferTemplateKeyFromDocument(document),
    inputFormat: "markdown" as const,
    markdown: normalizedMarkdown,
    publishErrors: publishQuality.errors,
    publishReady: errors.length === 0 && publishQuality.publishReady,
    qualityWarnings: evaluateResumeQuality({
      document,
      gate: "draft",
      markdown: normalizedMarkdown,
    }).warnings,
    valid: errors.length === 0,
    warnings,
  };
}

function compileJsonInput({
  qualityGate,
  resume,
  styleOverrides,
  templateKey,
}: {
  qualityGate: ResumeQualityGate;
  resume: ResumeJsonInput;
  styleOverrides?: ResumeStyleOverrideInput;
  templateKey?: TemplateKey;
}) {
  const schemaErrors = validateJsonResume(resume);

  if (schemaErrors.length > 0) {
    return {
      errors: schemaErrors,
      fitScale: 1,
      inferredTemplateKey: templateKey ?? null,
      inputFormat: "json" as const,
      markdown: "",
      publishErrors: [],
      publishReady: false,
      qualityWarnings: [],
      valid: false,
      warnings: [] as ValidationWarning[],
    };
  }

  const inferredTemplateKey = templateKey ?? inferTemplateKeyFromJson(resume);
  const markdown = applyStyleOverridesToMarkdown(
    buildJsonResumeMarkdown(resume, inferredTemplateKey),
    styleOverrides,
  );
  const fitScale = estimateServerFitScale(markdown);
  const document = parseCvMarkdown(markdown);
  const publishQuality = evaluateResumeQuality({
    document,
    gate: "publish",
    markdown,
  });
  const draftQuality = evaluateResumeQuality({
    document,
    gate: "draft",
    markdown,
  });
  const warnings: ValidationWarning[] = [];
  const errors: ValidationError[] = [];

  if (qualityGate === "publish") {
    errors.push(...publishQuality.errors);
  } else {
    warnings.push(...draftQuality.warnings);
  }

  if (fitScale <= CV_SCALE_LIMITS.min + 0.002) {
    warnings.push({
      code: "aggressive_fit",
      message: "This resume is dense enough that Tiny CV used aggressive one-page fit estimation.",
    });
  }

  return {
    errors,
    fitScale,
    inferredTemplateKey,
    inputFormat: "json" as const,
    markdown,
    publishErrors: publishQuality.errors,
    publishReady: errors.length === 0 && publishQuality.publishReady,
    qualityWarnings: draftQuality.warnings,
    valid: errors.length === 0,
    warnings,
  };
}

function readQualityGate(input: CreateResumeRequest | ValidateResumeRequest): ResumeQualityGate {
  return "quality_gate" in input && input.quality_gate === "publish" ? "publish" : "draft";
}

function buildJsonResumeMarkdown(resume: ResumeJsonInput, templateKey: TemplateKey) {
  const lines: string[] = [];

  lines.push(`# ${resume.name.trim()}`);

  if (resume.headline?.trim()) {
    lines.push(resume.headline.trim());
  }

  const contactLine = compileContactLine(resume.contact ?? []);

  if (contactLine) {
    lines.push(contactLine);
  }

  lines.push("");

  for (const section of resume.sections) {
    appendSection(lines, section);
  }

  return composeCvMarkdown({
    bodyMarkdown: lines.join("\n").trim(),
    frontmatter: composeCvFrontmatter(resolveResumeStylePresetDefaults(defaultPresetForTemplate(templateKey))),
  });
}

function appendSection(lines: string[], section: ResumeJsonSectionInput) {
  if (section.type === "summary") {
    lines.push(`## ${(section.title?.trim() || "Summary")}`);
    for (const paragraph of section.paragraphs) {
      if (paragraph.trim()) {
        lines.push(paragraph.trim());
        lines.push("");
      }
    }
    return;
  }

  if (section.type === "entries") {
    lines.push(`## ${section.title.trim()}`);

    for (const entry of section.entries) {
      const extras = entry.title_extras?.filter(Boolean).map((value) => value.trim()) ?? [];
      lines.push(`### ${[entry.title.trim(), ...extras].join(" | ")}`);

      if (entry.meta_left?.trim() || entry.meta_right?.trim()) {
        const left = entry.meta_left?.trim() ?? "";
        const right = entry.meta_right?.trim() ?? "";
        lines.push(`*${[left, right].filter(Boolean).join(" | ")}*`);
      }

      for (const paragraph of entry.paragraphs ?? []) {
        if (paragraph.trim()) {
          lines.push(paragraph.trim());
        }
      }

      for (const bullet of entry.bullets ?? []) {
        if (bullet.trim()) {
          lines.push(`- ${bullet.trim()}`);
        }
      }

      lines.push("");
    }

    return;
  }

  if (section.type === "bullets") {
    lines.push(`## ${section.title.trim()}`);
    for (const bullet of section.bullets) {
      if (bullet.trim()) {
        lines.push(`- ${bullet.trim()}`);
      }
    }
    lines.push("");
    return;
  }

  lines.push(`## ${(section.title?.trim() || "Skills")}`);
  for (const group of section.groups) {
    lines.push(`${group.label.trim()}: ${group.value.trim()}`);
  }
  lines.push("");
}

function compileContactLine(contact: ResumeJsonContactInput[]) {
  const parts = contact
    .map((item) => compileContactItem(item))
    .filter(Boolean);

  return parts.join(" | ");
}

function compileContactItem(item: ResumeJsonContactInput) {
  const value = item.value.trim();
  const label = item.label?.trim();

  if (!value) {
    return "";
  }

  if (item.kind === "location" || item.kind === "text" || item.kind === "phone") {
    return label ?? value;
  }

  if (item.kind === "email") {
    const display = label ?? value;
    const href = item.href?.trim() || (value.startsWith("mailto:") ? value : `mailto:${value}`);
    return `[${display}](${href})`;
  }

  const href = item.href?.trim() || value;
  const display = label ?? defaultLinkLabel(item.kind, href);
  return `[${display}](${href})`;
}

function defaultLinkLabel(kind: ResumeJsonContactInput["kind"], href: string) {
  if (kind === "linkedin") {
    return "LinkedIn";
  }

  if (kind === "github") {
    return "GitHub";
  }

  if (kind === "x") {
    return "X";
  }

  return href;
}

function applyStyleOverridesToMarkdown(markdown: string, overrides?: ResumeStyleOverrideInput) {
  if (!overrides || Object.keys(overrides).length === 0) {
    return markdown;
  }

  const { bodyMarkdown, frontmatter } = splitCvMarkdown(markdown);
  const baseStyle = frontmatter.trim()
    ? parseResumeStyle(frontmatter)
    : { ...resolveResumeStylePresetDefaults("editorial") };
  const nextStyle: ResumeStylePrefs = {
    ...baseStyle,
    ...sanitizeStyleOverrides(overrides),
  };

  return composeCvMarkdown({
    bodyMarkdown,
    frontmatter: composeCvFrontmatter(nextStyle),
  });
}

function sanitizeStyleOverrides(overrides: ResumeStyleOverrideInput): ResumeStyleOverrideInput {
  const next: ResumeStyleOverrideInput = {};

  if (overrides.stylePreset) {
    next.stylePreset = overrides.stylePreset;
  }

  if (overrides.accentTone) {
    next.accentTone = overrides.accentTone;
  }

  if (overrides.contactStyle) {
    next.contactStyle = overrides.contactStyle;
  }

  if (overrides.density) {
    next.density = overrides.density;
  }

  if (overrides.headerAlignment) {
    next.headerAlignment = overrides.headerAlignment;
  }

  if (overrides.pageSize) {
    next.pageSize = overrides.pageSize;
  }

  if (typeof overrides.pageMargin === "number" && Number.isFinite(overrides.pageMargin)) {
    next.pageMargin = Math.max(0.5, Math.min(1.2, Number(overrides.pageMargin.toFixed(2))));
  }

  if (typeof overrides.showHeaderDivider === "boolean") {
    next.showHeaderDivider = overrides.showHeaderDivider;
  }

  if (typeof overrides.showSectionDivider === "boolean") {
    next.showSectionDivider = overrides.showSectionDivider;
  }

  return next;
}

function inferTemplateKeyFromJson(resume: ResumeJsonInput): TemplateKey {
  const haystack = `${resume.headline ?? ""} ${resume.sections.map((section) => "title" in section ? section.title ?? "" : "").join(" ")}`.toLowerCase();

  if (haystack.includes("design")) {
    return "designer";
  }

  if (haystack.includes("sales") || haystack.includes("account executive") || haystack.includes("revenue")) {
    return "sales";
  }

  if (haystack.includes("founder") || haystack.includes("ceo")) {
    return "founder";
  }

  return "engineer";
}

function inferTemplateKeyFromDocument(document: ReturnType<typeof parseCvMarkdown>): TemplateKey {
  const haystack = `${document.headline} ${document.sections.map((section) => section.title).join(" ")}`.toLowerCase();

  if (haystack.includes("design")) {
    return "designer";
  }

  if (haystack.includes("sales") || haystack.includes("account executive") || haystack.includes("revenue")) {
    return "sales";
  }

  if (haystack.includes("founder") || haystack.includes("ceo")) {
    return "founder";
  }

  return "engineer";
}

function defaultPresetForTemplate(templateKey: TemplateKey) {
  if (templateKey === "designer") {
    return "creative";
  }

  if (templateKey === "sales") {
    return "executive";
  }

  if (templateKey === "founder") {
    return "editorial";
  }

  return "technical";
}

function validateJsonResume(resume: ResumeJsonInput) {
  const errors: ValidationError[] = [];

  if (!resume || typeof resume !== "object") {
    return [{
      code: "invalid_json_schema",
      message: "Resume payload must be an object.",
      path: "resume",
    }];
  }

  if (!resume.name?.trim()) {
    errors.push({
      code: "invalid_json_schema",
      message: "Resume JSON must include a non-empty name.",
      path: "resume.name",
    });
  }

  if (!Array.isArray(resume.sections) || resume.sections.length === 0) {
    errors.push({
      code: "invalid_json_schema",
      message: "Resume JSON must include at least one section.",
      path: "resume.sections",
    });
  }

  resume.sections.forEach((section, index) => {
    if (!section || typeof section !== "object" || typeof section.type !== "string") {
      errors.push({
        code: "invalid_json_schema",
        message: "Each section must include a valid type.",
        path: `resume.sections[${index}]`,
      });
      return;
    }

    if (section.type === "summary" && (!Array.isArray(section.paragraphs) || section.paragraphs.length === 0)) {
      errors.push({
        code: "invalid_json_schema",
        message: "Summary sections must include at least one paragraph.",
        path: `resume.sections[${index}].paragraphs`,
      });
    }

    if (section.type === "entries") {
      if (!section.title?.trim()) {
        errors.push({
          code: "invalid_json_schema",
          message: "Entries sections must include a title.",
          path: `resume.sections[${index}].title`,
        });
      }

      if (!Array.isArray(section.entries) || section.entries.length === 0) {
        errors.push({
          code: "invalid_json_schema",
          message: "Entries sections must include at least one entry.",
          path: `resume.sections[${index}].entries`,
        });
      }
    }

    if (section.type === "bullets" && (!Array.isArray(section.bullets) || section.bullets.length === 0)) {
      errors.push({
        code: "invalid_json_schema",
        message: "Bullet sections must include at least one bullet.",
        path: `resume.sections[${index}].bullets`,
      });
    }

    if (section.type === "skills" && (!Array.isArray(section.groups) || section.groups.length === 0)) {
      errors.push({
        code: "invalid_json_schema",
        message: "Skills sections must include at least one group.",
        path: `resume.sections[${index}].groups`,
      });
    }
  });

  return errors;
}

export function estimateServerFitScale(markdown: string) {
  const document = parseCvMarkdown(markdown);
  const typography = buildServerTypography(document.style);
  const baseScale = estimateResumeScale(document, typography, CV_SCALE_LIMITS);

  if (baseScale > CV_SCALE_LIMITS.min + 0.002) {
    return baseScale;
  }

  return estimateResumeScale(document, typography, AGGRESSIVE_CV_SCALE_LIMITS);
}

function buildServerTypography(style: ResumeStylePrefs): CvTypography {
  const resolvedStyle = resolveResumeStyle(style);
  const scale = resolveResumeTypography(style);

  return {
    body: makeMeasuredStyle(resolvedStyle.bodyFontFamily, scale.body, TYPESET_LINE_HEIGHTS.body),
    contact: makeMeasuredStyle(resolvedStyle.bodyFontFamily, scale.contact, TYPESET_LINE_HEIGHTS.contact),
    entryDate: makeMeasuredStyle(resolvedStyle.bodyFontFamily, scale.date, TYPESET_LINE_HEIGHTS.entryDate, "600"),
    entryMeta: makeMeasuredStyle(resolvedStyle.bodyFontFamily, scale.entryMeta, TYPESET_LINE_HEIGHTS.entryMeta, "400", "italic"),
    entryTitle: makeMeasuredStyle(resolvedStyle.bodyFontFamily, scale.entryTitle, TYPESET_LINE_HEIGHTS.entryTitle, "600"),
    headline: makeMeasuredStyle(resolvedStyle.displayFontFamily, scale.headline, TYPESET_LINE_HEIGHTS.headline, "600"),
    name: makeMeasuredStyle(resolvedStyle.displayFontFamily, scale.name, TYPESET_LINE_HEIGHTS.name, "600"),
    sectionLabel: makeMeasuredStyle(resolvedStyle.displayFontFamily, scale.sectionLabel, TYPESET_LINE_HEIGHTS.sectionLabel, "600"),
    skillsTerm: makeMeasuredStyle(resolvedStyle.bodyFontFamily, scale.skills, TYPESET_LINE_HEIGHTS.skillsTerm, "600"),
    skillsValue: makeMeasuredStyle(resolvedStyle.bodyFontFamily, scale.skills, TYPESET_LINE_HEIGHTS.skillsValue),
  };
}

function makeMeasuredStyle(
  fontFamily: string,
  emSize: number,
  lineHeightMultiplier: number,
  fontWeight = "400",
  fontStyle = "normal",
): MeasuredTextStyle {
  const fontSize = 16 * emSize;

  return {
    fontFamily,
    fontSize,
    fontStretch: "normal",
    fontStyle,
    fontVariant: "normal",
    fontWeight,
    lineHeight: fontSize * lineHeightMultiplier,
  };
}

export function createTitleFromMarkdown(markdown: string, explicitTitle?: string) {
  if (explicitTitle?.trim()) {
    return {
      title: explicitTitle.trim(),
      titleIsCustom: true,
    };
  }

  const document = parseCvMarkdown(markdown);
  const title = document.name.trim() || "Untitled Resume";

  return {
    title,
    titleIsCustom: false,
  };
}

export function summarizeContactItems(contactItems: ResumeContactItem[]) {
  return contactItems.map((item) => item.label).join(" | ");
}
