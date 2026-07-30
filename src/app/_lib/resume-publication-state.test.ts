import { describe, expect, it } from "vitest";
import { hasUnpublishedResumeChanges } from "@/app/_lib/resume-publication-state";

const baseResume = {
  isPublished: true,
  markdown: "# Alex Morgan\nFounder",
  publishedAt: "2026-05-25T21:00:00.000Z",
  updatedAt: "2026-05-25T21:00:00.000Z",
};

describe("hasUnpublishedResumeChanges", () => {
  it("treats never-published resumes as needing publication", () => {
    expect(hasUnpublishedResumeChanges({
      ...baseResume,
      isPublished: false,
      publishedAt: null,
    }, baseResume.markdown)).toBe(true);
  });

  it("detects unsaved editor markdown that has not reached the draft record yet", () => {
    expect(hasUnpublishedResumeChanges(
      baseResume,
      "# Alex Morgan\nFounder\n\n## Summary\nBuilder.",
    )).toBe(true);
  });

  it("detects saved draft changes newer than the published snapshot", () => {
    expect(hasUnpublishedResumeChanges({
      ...baseResume,
      updatedAt: "2026-05-25T21:10:00.000Z",
    }, baseResume.markdown)).toBe(true);
  });

  it("does not mark a current published snapshot as stale", () => {
    expect(hasUnpublishedResumeChanges(baseResume, baseResume.markdown)).toBe(false);
  });
});
