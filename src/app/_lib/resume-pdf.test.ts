import { afterEach, describe, expect, it, vi } from "vitest";

const browserRendererMock = vi.hoisted(() => ({
  withBrowserPage: vi.fn(),
}));

vi.mock("@/app/_lib/browser-renderer", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/_lib/browser-renderer")>();

  return {
    ...original,
    withBrowserPage: browserRendererMock.withBrowserPage,
  };
});

import {
  buildPublishedResumePrintUrl,
  ensurePublishedResumePrintUrl,
  generateResumePdf,
  getPdfRenderOrigin,
} from "@/app/_lib/resume-pdf";

describe("resume-pdf", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_TINYCV_APP_URL;
    delete process.env.PORT;
    delete process.env.TINYCV_APP_URL;
    delete process.env.VERCEL_URL;
    vi.clearAllMocks();
  });

  it("builds PDF URLs against the public print view", () => {
    expect(buildPublishedResumePrintUrl("https://tiny.cv/", "SteadyBlueHeron")).toBe(
      "https://tiny.cv/SteadyBlueHeron?print=1",
    );
  });

  it("forces public resume URLs into print mode", () => {
    expect(ensurePublishedResumePrintUrl("https://tiny.cv/SteadyBlueHeron")).toBe(
      "https://tiny.cv/SteadyBlueHeron?print=1",
    );
    expect(ensurePublishedResumePrintUrl("https://tiny.cv/SteadyBlueHeron?utm_source=agent")).toBe(
      "https://tiny.cv/SteadyBlueHeron?utm_source=agent&print=1",
    );
    expect(ensurePublishedResumePrintUrl("https://tiny.cv/SteadyBlueHeron?print=false")).toBe(
      "https://tiny.cv/SteadyBlueHeron?print=1",
    );
  });

  it("renders PDFs from the print view even if given the normal public URL", async () => {
    const page = {
      emulateMediaType: vi.fn(),
      goto: vi.fn(),
      pdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
      setViewport: vi.fn(),
    };

    browserRendererMock.withBrowserPage.mockImplementation(async (callback) => callback(page));

    await generateResumePdf({
      markdown: "# Jane Doe\nProduct Engineer",
      publicUrl: "https://tiny.cv/SteadyBlueHeron",
    });

    expect(page.goto).toHaveBeenCalledWith("https://tiny.cv/SteadyBlueHeron?print=1", {
      timeout: 30_000,
      waitUntil: "networkidle0",
    });
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
