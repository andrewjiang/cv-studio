import type { ResumeContactItem, ResumeContactStyle } from "@/app/_lib/cv-markdown";

export function parseContactItems(lines: string[]) {
  return lines
    .flatMap((line) => splitPipe(line))
    .map(parseContactItem);
}

export function buildContactRows(
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

function splitPipe(value: string) {
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
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
