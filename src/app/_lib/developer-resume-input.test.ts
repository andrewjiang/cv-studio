import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/_lib/cv-fit", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/_lib/cv-fit")>();

  return {
    ...original,
    estimateResumeScale: () => 0.92,
  };
});

import { compileResumeInput, validateResumeInput } from "@/app/_lib/developer-resume-input";

describe("developer-resume-input", () => {
  it("validates markdown input and returns normalized markdown", () => {
    const result = validateResumeInput({
      input_format: "markdown",
      markdown: "# Alex Morgan\nFounder & Product Engineer\nSan Francisco, CA",
      template_key: "founder",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.normalized_markdown).toContain("# Alex Morgan");
    expect(result.inferred_template_key).toBe("founder");
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
});
