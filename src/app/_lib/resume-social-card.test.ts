import { describe, expect, it } from "vitest";
import type { HostedResumePublicRecord } from "@/app/_lib/hosted-resume-types";
import {
  buildResumeSocialCardPath,
  buildResumeSocialCardRenderUrl,
} from "@/app/_lib/resume-social-card";

function buildResume(overrides: Partial<HostedResumePublicRecord> = {}): HostedResumePublicRecord {
  return {
    createdAt: "2026-05-01T00:00:00.000Z",
    fitScale: 1,
    id: "resume_123",
    isPublished: true,
    markdown: "# Steady Blue Heron",
    publishedAt: "2026-06-01T00:00:00.000Z",
    slug: "SteadyBlueHeron",
    templateKey: "engineer",
    title: "Steady Blue Heron",
    updatedAt: "2026-06-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("resume-social-card", () => {
  it("versions the card path by publish time so edits are not served from cache", () => {
    const publishedAt = buildResumeSocialCardPath(buildResume());
    const republished = buildResumeSocialCardPath(
      buildResume({ publishedAt: "2026-06-03T00:00:00.000Z" }),
    );

    expect(publishedAt).toBe(
      `/SteadyBlueHeron/social-card?v=${Date.parse("2026-06-01T00:00:00.000Z").toString(36)}`,
    );
    expect(republished).not.toBe(publishedAt);
  });

  it("falls back to the update time when a resume has no publish time", () => {
    expect(buildResumeSocialCardPath(buildResume({ publishedAt: null }))).toBe(
      `/SteadyBlueHeron/social-card?v=${Date.parse("2026-06-02T00:00:00.000Z").toString(36)}`,
    );
  });

  it("escapes slugs in the card path", () => {
    expect(buildResumeSocialCardPath(buildResume({ slug: "steady blue/heron" }))).toContain(
      "/steady%20blue%2Fheron/social-card",
    );
  });

  it("builds render URLs against the requesting origin", () => {
    expect(buildResumeSocialCardRenderUrl("https://tiny.cv", "SteadyBlueHeron")).toBe(
      "https://tiny.cv/internal/social-card/SteadyBlueHeron",
    );
    expect(buildResumeSocialCardRenderUrl("http://localhost:3000/", "SteadyBlueHeron")).toBe(
      "http://localhost:3000/internal/social-card/SteadyBlueHeron",
    );
  });
});
