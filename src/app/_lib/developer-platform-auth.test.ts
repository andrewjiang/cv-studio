import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPdfDownloadToken,
  createOneTimeClaimToken,
  createProjectApiKey,
  DeveloperPlatformConfigurationError,
  isPdfDownloadTokenValid,
} from "@/app/_lib/developer-platform-auth";

describe("developer-platform-auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates project API keys with the Tiny CV live prefix", () => {
    const apiKey = createProjectApiKey();

    expect(apiKey.key.startsWith("tcv_live_")).toBe(true);
    expect(apiKey.keyPrefix).toBe(apiKey.key.slice(0, 18));
    expect(apiKey.keyHash).toHaveLength(64);
  });

  it("creates one-time claim tokens with the claim prefix", () => {
    const token = createOneTimeClaimToken();

    expect(token.token.startsWith("tcv_claim_")).toBe(true);
    expect(token.tokenHash).toHaveLength(64);
  });

  it("validates signed PDF download tokens until they expire", () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const token = buildPdfDownloadToken("job-123", expiresAt);

    expect(isPdfDownloadTokenValid({
      expiresAt,
      jobId: "job-123",
      token,
    })).toBe(true);

    expect(isPdfDownloadTokenValid({
      expiresAt,
      jobId: "job-456",
      token,
    })).toBe(false);
  });

  it("requires an explicit platform secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TINYCV_PLATFORM_SECRET", "");
    vi.stubEnv("TINYCV_EDITOR_SECRET", "");
    vi.stubEnv("DATABASE_URL", "");

    expect(() => buildPdfDownloadToken("job-123", new Date().toISOString()))
      .toThrow(DeveloperPlatformConfigurationError);
  });
});
