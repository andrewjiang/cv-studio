import type { ResumeDocument } from "@/app/_lib/cv-markdown";
import type {
  ValidationError,
  ValidationWarning,
} from "@/app/_lib/developer-platform-types";

export type ResumeQualityGate = "draft" | "publish";

export type ResumeQualityIssue = {
  code: string;
  message: string;
  path?: string;
};

export const MAX_PUBLISH_HEADLINE_CHARS = 80;

const SUMMARY_TITLE_PATTERN = /^summary$/i;
const INLINE_BULLET_SEPARATOR_PATTERN = /\s(?:•|·|&bull;)\s/i;
const UNSUPPORTED_BULLET_MARKER_PATTERN = /(^|\n)\s*(?:•\S|·\s+|·\S)/;

export function evaluateResumeQuality(input: {
  document: ResumeDocument;
  markdown: string;
  gate: ResumeQualityGate;
}): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  publishReady: boolean;
} {
  const publishIssues = getPublishQualityIssues(input.document, input.markdown);
  const publishReady = publishIssues.length === 0;

  if (input.gate === "publish") {
    return {
      errors: publishIssues,
      publishReady,
      warnings: [],
    };
  }

  return {
    errors: [],
    publishReady,
    warnings: publishIssues,
  };
}

function getPublishQualityIssues(document: ResumeDocument, markdown: string) {
  const issues: ResumeQualityIssue[] = [];
  const summary = document.sections.find((section) => SUMMARY_TITLE_PATTERN.test(section.title));

  if (!summary) {
    issues.push({
      code: "missing_summary",
      message: "Published resumes must include a ## Summary section. Put narrative positioning there, not in the headline.",
      path: "markdown.sections.summary",
    });
  } else if (!summary.paragraphs.length && !summary.bullets.length) {
    issues.push({
      code: "empty_summary",
      message: "The ## Summary section must include one concise paragraph.",
      path: "markdown.sections.summary",
    });
  }

  if (document.headline.length > MAX_PUBLISH_HEADLINE_CHARS) {
    issues.push({
      code: "headline_too_long",
      message: "The headline should be a short role/title line under 80 characters. Move longer positioning text into ## Summary.",
      path: "markdown.headline",
    });
  }

  if (document.contactItems.length === 0) {
    issues.push({
      code: "missing_contact",
      message: "Published resumes should include contact information under the headline.",
      path: "markdown.contact",
    });
  }

  for (const section of document.sections) {
    if (
      SUMMARY_TITLE_PATTERN.test(section.title) ||
      section.skillGroups.length > 0 ||
      section.entries.length > 0 ||
      section.bullets.length > 0
    ) {
      continue;
    }

    if (section.paragraphs.some((paragraph) => INLINE_BULLET_SEPARATOR_PATTERN.test(paragraph))) {
      issues.push({
        code: "inline_bullet_separator",
        message: "This section looks like a list but is written as one paragraph. Put each item on its own line starting with \"- \".",
        path: `markdown.sections.${section.id}.paragraphs`,
      });
    }
  }

  if (UNSUPPORTED_BULLET_MARKER_PATTERN.test(markdown)) {
    issues.push({
      code: "unsupported_bullet_marker",
      message: "Tiny CV bullets should be separate lines starting with \"- \".",
      path: "markdown",
    });
  }

  return issues;
}
