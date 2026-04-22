import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/_lib/cv-fit", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/_lib/cv-fit")>();

  return {
    ...original,
    estimateResumeScale: () => 0.92,
  };
});

import { compileResumeInput, validateResumeInput } from "@/app/_lib/developer-resume-input";
import { STRONG_AGENT_RESUME_MARKDOWN } from "@/app/_lib/resume-examples";

const BAD_PUBLISH_MARKDOWN = `# Andrew Jiang
Builder and founder with deep business development and product management experience, plus generalist design and engineering chops. YC alum.
Los Angeles, CA | [andrew@example.com](mailto:andrew@example.com)

## Experience
### Founder | LockIn
*Los Angeles, CA | Jun 2025 - Present*
- Built LockIn from idea to revenue.

## Additional Experience
Product Manager, Sprig (2015 - 2016) • Cofounder and CEO, Bayes Impact (Apr 2014 - Apr 2015)`;

describe("developer-resume-input", () => {
  it("validates markdown input and returns normalized markdown", () => {
    const result = validateResumeInput({
      input_format: "markdown",
      markdown: STRONG_AGENT_RESUME_MARKDOWN,
      template_key: "founder",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.normalized_markdown).toContain("# Jordan Lee");
    expect(result.normalized_markdown).toContain("Northstar Labs");
    expect(result.normalized_markdown).toContain("time-to-first-publish");
    expect(result.inferred_template_key).toBe("founder");
    expect(result.publish_ready).toBe(true);
    expect(result.publish_errors).toHaveLength(0);
    expect(result.quality_warnings).toHaveLength(0);
  });

  it("compiles structured JSON input into canonical markdown", () => {
    const result = compileResumeInput({
      input_format: "json",
      resume: {
        contact: [
          {
            kind: "email",
            value: "maya@example.com",
          },
          {
            href: "https://portfolio.com",
            kind: "url",
            label: "Portfolio",
            value: "portfolio.com",
          },
        ],
        headline: "Product Designer",
        name: "Maya Chen",
        sections: [
          {
            paragraphs: [
              "Designer with experience across product, systems, and prototyping.",
            ],
            type: "summary",
          },
          {
            entries: [
              {
                bullets: [
                  "Led product design for a new workflow experience.",
                ],
                meta_left: "Remote",
                meta_right: "2022 - Present",
                title: "Senior Product Designer",
                title_extras: ["Northstar"],
              },
            ],
            title: "Experience",
            type: "entries",
          },
        ],
      },
      style: {
        accentTone: "plum",
        stylePreset: "creative",
      },
    });

    expect(result.valid).toBe(true);
    expect(result.markdown).toContain("# Maya Chen");
    expect(result.markdown).toContain("stylePreset: creative");
    expect(result.markdown).toContain("accentTone: plum");
    expect(result.markdown).toContain("## Experience");
    expect(result.markdown).toContain("### Senior Product Designer | Northstar");
  });

  it("returns validation errors for invalid JSON input", () => {
    const result = validateResumeInput({
      input_format: "json",
      resume: {
        name: "",
        sections: [],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("invalid_json_schema");
  });

  it("returns publish quality errors when validation requests the publish gate", () => {
    const result = validateResumeInput({
      input_format: "markdown",
      markdown: BAD_PUBLISH_MARKDOWN,
      quality_gate: "publish",
    });

    expect(result.valid).toBe(false);
    expect(result.publish_ready).toBe(false);
    expect(result.publish_errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "missing_summary",
        "headline_too_long",
        "inline_bullet_separator",
      ]),
    );
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "missing_summary",
        "headline_too_long",
        "inline_bullet_separator",
      ]),
    );
  });

  it("keeps draft validation syntactically valid while surfacing quality warnings", () => {
    const result = validateResumeInput({
      input_format: "markdown",
      markdown: BAD_PUBLISH_MARKDOWN,
      quality_gate: "draft",
    });

    expect(result.valid).toBe(true);
    expect(result.publish_ready).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(result.quality_warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "missing_summary",
        "headline_too_long",
        "inline_bullet_separator",
      ]),
    );
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "missing_summary",
        "headline_too_long",
        "inline_bullet_separator",
      ]),
    );
  });

  it("compiles JSON input with a summary section through the publish gate", () => {
    const result = validateResumeInput({
      input_format: "json",
      quality_gate: "publish",
      resume: {
        contact: [
          {
            kind: "email",
            value: "maya@example.com",
          },
        ],
        headline: "Product Designer",
        name: "Maya Chen",
        sections: [
          {
            paragraphs: [
              "Designer with experience across product, systems, and prototyping.",
            ],
            type: "summary",
          },
          {
            entries: [
              {
                bullets: [
                  "Led product design for a new workflow experience.",
                ],
                meta_left: "Remote",
                meta_right: "2022 - Present",
                title: "Senior Product Designer",
                title_extras: ["Northstar"],
              },
            ],
            title: "Experience",
            type: "entries",
          },
        ],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.publish_ready).toBe(true);
    expect(result.publish_errors).toHaveLength(0);
  });
});
