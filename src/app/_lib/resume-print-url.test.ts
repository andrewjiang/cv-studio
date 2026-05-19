import { describe, expect, it } from "vitest";
import {
  ensureResumeAutoPrintUrl,
  ensureResumePrintUrl,
} from "@/app/_lib/resume-print-url";

describe("resume-print-url", () => {
  it("forces print mode without disturbing other params", () => {
    expect(ensureResumePrintUrl("https://tiny.cv/SteadyBlueHeron?utm_source=agent")).toBe(
      "https://tiny.cv/SteadyBlueHeron?utm_source=agent&print=1",
    );
    expect(ensureResumePrintUrl("https://tiny.cv/SteadyBlueHeron?print=false&autoprint=1")).toBe(
      "https://tiny.cv/SteadyBlueHeron?print=1",
    );
  });

  it("adds autoprint on top of print mode", () => {
    expect(ensureResumeAutoPrintUrl("https://tiny.cv/SteadyBlueHeron?utm_source=agent")).toBe(
      "https://tiny.cv/SteadyBlueHeron?utm_source=agent&print=1&autoprint=1",
    );
  });
});
