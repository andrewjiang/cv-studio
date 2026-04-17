import { afterEach, describe, expect, it } from "vitest";
import {
  buildPublishedResumePrintUrl,
  getPdfRenderOrigin,
} from "@/app/_lib/resume-pdf";

describe("resume-pdf", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_TINYCV_APP_URL;
    delete process.env.PORT;
    delete process.env.TINYCV_APP_URL;
    delete process.env.VERCEL_URL;
  });

  it("builds PDF URLs against the public print view", () => {
    expect(buildPublishedResumePrintUrl("https://tiny.cv/", "SteadyBlueHeron")).toBe(
      "https://tiny.cv/SteadyBlueHeron?print=1",
    );
  });

  it("uses explicit app origin first", () => {
    process.env.TINYCV_APP_URL = "https://tiny.cv/";

    expect(getPdfRenderOrigin()).toBe("https://tiny.cv");
  });

  it("falls back to the local Next port", () => {
    process.env.PORT = "3101";

    expect(getPdfRenderOrigin()).toBe("http://localhost:3101");
  });
});
