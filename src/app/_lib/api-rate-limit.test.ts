import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildRateLimitSubjects,
  getRateLimitRetryAfterSeconds,
  resolveApiRateLimitPolicy,
} from "@/app/_lib/api-rate-limit";

describe("api-rate-limit", () => {
  afterEach(() => {
    delete process.env.TINYCV_RATE_LIMIT_API_RESUME_CREATE_MAX;
    delete process.env.TINYCV_RATE_LIMIT_API_RESUME_CREATE_WINDOW_SECONDS;
    delete process.env.TINYCV_RATE_LIMIT_DISABLED;
  });

  it("resolves default limits for a mutating API action", () => {
    expect(resolveApiRateLimitPolicy("api:resume_create")).toEqual({
      max: 30,
      windowSeconds: 60,
    });
  });

  it("resolves the analytics event write limit", () => {
    expect(resolveApiRateLimitPolicy("analytics:event")).toEqual({
      max: 240,
      windowSeconds: 60,
    });
  });

  it("allows environment overrides per action", () => {
    process.env.TINYCV_RATE_LIMIT_API_RESUME_CREATE_MAX = "7";
    process.env.TINYCV_RATE_LIMIT_API_RESUME_CREATE_WINDOW_SECONDS = "300";

    expect(resolveApiRateLimitPolicy("api:resume_create")).toEqual({
      max: 7,
      windowSeconds: 300,
    });
  });

  it("can be disabled for local smoke runs", () => {
    process.env.TINYCV_RATE_LIMIT_DISABLED = "true";

    expect(resolveApiRateLimitPolicy("api:resume_create")).toBeNull();
  });

  it("computes retry-after from the oldest event in the window", () => {
    const oldest = new Date(Date.now() - 15_000);

    expect(getRateLimitRetryAfterSeconds(oldest, 60)).toBeLessThanOrEqual(46);
    expect(getRateLimitRetryAfterSeconds(oldest, 60)).toBeGreaterThanOrEqual(44);
  });

  it("builds analytics rate-limit subjects from workspace, session, and IP", () => {
    const request = new NextRequest("https://tiny.cv/api/analytics/events", {
      headers: {
        "x-forwarded-for": "203.0.113.42, 198.51.100.5",
      },
    });

    expect(buildRateLimitSubjects(request, {
      sessionId: "session-123",
      workspaceId: "workspace-123",
    })).toEqual([
      { id: "workspace-123", type: "workspace" },
      { id: "session-123", type: "session" },
      { id: "203.0.113.42", type: "ip" },
    ]);
  });
});
