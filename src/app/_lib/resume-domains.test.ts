import { describe, expect, it } from "vitest";
import {
  buildTinyCvHostname,
  isAppHost,
  normalizeHostname,
  validateTinyCvSubdomain,
} from "@/app/_lib/resume-domains";

describe("resume domain helpers", () => {
  it("normalizes hostnames for resolver comparisons", () => {
    expect(normalizeHostname("Tiny.CV")).toBe("tiny.cv");
    expect(normalizeHostname("andrew.tiny.cv:443")).toBe("andrew.tiny.cv");
    expect(normalizeHostname("www.tiny.cv.")).toBe("www.tiny.cv");
  });

  it("classifies app hosts separately from resume subdomains", () => {
    expect(isAppHost("tiny.cv")).toBe(true);
    expect(isAppHost("www.tiny.cv")).toBe(true);
    expect(isAppHost("localhost:3101")).toBe(true);
    expect(isAppHost("preview.vercel.app")).toBe(true);
    expect(isAppHost("andrew.tiny.cv")).toBe(false);
  });

  it("accepts clean tiny.cv subdomains", () => {
    expect(validateTinyCvSubdomain("andrew")).toBe("andrew");
    expect(validateTinyCvSubdomain("andrew-cv")).toBe("andrew-cv");
    expect(validateTinyCvSubdomain("andrew2026")).toBe("andrew2026");
    expect(buildTinyCvHostname("andrew")).toBe("andrew.tiny.cv");
  });

  it("rejects reserved or malformed tiny.cv subdomains", () => {
    expect(() => validateTinyCvSubdomain("api")).toThrow("reserved");
    expect(() => validateTinyCvSubdomain("-andrew")).toThrow("3-40");
    expect(() => validateTinyCvSubdomain("andrew-")).toThrow("3-40");
    expect(() => validateTinyCvSubdomain("an")).toThrow("3-40");
    expect(() => validateTinyCvSubdomain("andrew_cv")).toThrow("3-40");
  });
});
