import { describe, expect, it } from "vitest";
import {
  composeCvMarkdown,
  DEFAULT_CV_MARKDOWN,
  DEFAULT_RESUME_STYLE,
  normalizeCvMarkdown,
  parseCvMarkdown,
  resolveResumeStyle,
  splitCvMarkdown,
} from "@/app/_lib/cv-markdown";
import { getResumeTemplate } from "@/app/_lib/resume-templates";

describe("cv-markdown", () => {
  it("parses the starter resume into a structured document", () => {
    const document = parseCvMarkdown(DEFAULT_CV_MARKDOWN);

    expect(document.name).toBe("Alex Morgan");
    expect(document.headline).toBe("Founder & Product Engineer");
    expect(document.contactRows).toHaveLength(1);
    expect(document.contactItems.map((item) => item.label)).toEqual([
      "San Francisco, CA",
      "alex@example.com",
      "LinkedIn",
      "GitHub",
    ]);
    expect(document.sections.map((section) => section.title)).toEqual([
      "Summary",
      "Experience",
      "Selected Projects",
      "Education",
      "Skills",
    ]);
  });

  it("assigns unique ids to repeated section headings", () => {
    const document = parseCvMarkdown(`# Name
Role

## Projects
- One

## Projects
- Two`);

    expect(document.sections.map((section) => section.id)).toEqual([
      "projects",
      "projects-2",
    ]);
  });

  it("preserves an empty left-side entry meta segment", () => {
    const document = parseCvMarkdown(`# Name
Role

## Experience
### Founder | Example
* | June 2025 - Present*`);

    expect(document.sections[0]?.entries[0]).toMatchObject({
      metaLeft: "",
      metaRight: "June 2025 - Present",
      titleParts: ["Founder", "Example"],
    });
  });

  it("normalizes duplicated frontmatter and migrates the legacy page margin", () => {
    const normalized = normalizeCvMarkdown(`---
pageMargin: 0.62
showHeaderDivider: false
---
---
pageMargin: 0.62
showHeaderDivider: false
---

# Name
Role`);

    const parts = splitCvMarkdown(normalized);
    const document = parseCvMarkdown(normalized);

    expect(parts.frontmatter.match(/^pageMargin:/gm)).toHaveLength(1);
    expect(parts.bodyMarkdown.trimStart().startsWith("# Name")).toBe(true);
    expect(document.style.pageMargin).toBe(DEFAULT_RESUME_STYLE.pageMargin);
  });

  it("applies preset defaults before explicit style overrides", () => {
    const markdown = composeCvMarkdown({
      bodyMarkdown: "# Name\nRole",
      frontmatter: `stylePreset: creative
accentTone: claret`,
    });

    const document = parseCvMarkdown(markdown);
    const resolvedStyle = resolveResumeStyle(document.style);

    expect(document.style.stylePreset).toBe("creative");
    expect(document.style.headerAlignment).toBe("center");
    expect(document.style.displayFont).toBe("newsreader");
    expect(document.style.bodyFont).toBe("manrope");
    expect(document.style.accentTone).toBe("claret");
    expect(resolvedStyle.accent).toBe("#be123c");
  });

  it("builds template markdown from the selected preset defaults", () => {
    const document = parseCvMarkdown(getResumeTemplate("designer").markdown);

    expect(document.style).toMatchObject({
      accentTone: "plum",
      bodyFont: "manrope",
      displayFont: "newsreader",
      headerAlignment: "center",
      pageMargin: 0.95,
      stylePreset: "creative",
    });
  });
});
