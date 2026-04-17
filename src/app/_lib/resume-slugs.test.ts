import { describe, expect, it } from "vitest";
import {
  createFriendlyResumeSlug,
  createFriendlyResumeSlugFallback,
  FRIENDLY_RESUME_SLUG_PATTERN,
  normalizeSlugForComparison,
} from "@/app/_lib/resume-slugs";

describe("resume-slugs", () => {
  it("creates readable PascalCase resume slugs", () => {
    const indices = [20, 2, 9];

    const slug = createFriendlyResumeSlug(() => indices.shift() ?? 0);

    expect(slug).toBe("SteadyBlueHeron");
    expect(slug).toMatch(FRIENDLY_RESUME_SLUG_PATTERN);
    expect(slug).not.toContain("-");
  });

  it("keeps fallback slugs URL-safe without separators", () => {
    const slug = createFriendlyResumeSlugFallback("SteadyBlueHeron");

    expect(slug).toMatch(FRIENDLY_RESUME_SLUG_PATTERN);
    expect(slug).not.toContain("-");
  });

  it("normalizes slugs for case-insensitive comparison", () => {
    expect(normalizeSlugForComparison(" SteadyBlueHeron ")).toBe("steadyblueheron");
  });
});
