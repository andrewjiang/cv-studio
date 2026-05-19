import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildStudioPdfRenderToken,
  isStudioPdfRenderTokenValid,
} from "@/app/_lib/resume-pdf-render-token";

describe("resume-pdf-render-token", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("validates a matching unexpired studio PDF render token", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-19T00:00:00Z"));

    const input = {
      expiresAt: "2026-05-19T00:05:00.000Z",
      resumeId: "resume_123",
      workspaceId: "workspace_123",
    };
    const token = buildStudioPdfRenderToken(input);

    expect(isStudioPdfRenderTokenValid({ ...input, token })).toBe(true);
    expect(isStudioPdfRenderTokenValid({ ...input, resumeId: "resume_other", token })).toBe(false);
  });

  it("rejects expired studio PDF render tokens", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-19T00:10:00Z"));

    const input = {
      expiresAt: "2026-05-19T00:05:00.000Z",
      resumeId: "resume_123",
      workspaceId: "workspace_123",
    };

    expect(isStudioPdfRenderTokenValid({
      ...input,
      token: buildStudioPdfRenderToken(input),
    })).toBe(false);
  });
});
