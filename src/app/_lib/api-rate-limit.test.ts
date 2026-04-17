import { afterEach, describe, expect, it } from "vitest";
import {
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
});
