import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserRendererUnavailableError } from "@/app/_lib/browser-renderer";

const browserRendererMock = vi.hoisted(() => ({
  assertBrowserRendererConfigured: vi.fn(),
  getBrowserRenderOrigin: vi.fn(() => "https://tiny.test"),
  withBrowserPage: vi.fn(),
}));

vi.mock("@/app/_lib/browser-renderer", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/_lib/browser-renderer")>();

  return {
    ...original,
    assertBrowserRendererConfigured: browserRendererMock.assertBrowserRendererConfigured,
    getBrowserRenderOrigin: browserRendererMock.getBrowserRenderOrigin,
    withBrowserPage: browserRendererMock.withBrowserPage,
  };
});

import { measureResumeFitInBrowser } from "@/app/_lib/resume-browser-fit";

describe("resume-browser-fit", () => {
  beforeEach(() => {
    browserRendererMock.assertBrowserRendererConfigured.mockImplementation(() => undefined);
    browserRendererMock.getBrowserRenderOrigin.mockImplementation(() => "https://tiny.test");
  });

  afterEach(() => {
    delete process.env.TINYCV_WORKER_SECRET;
    vi.clearAllMocks();
  });

  it("returns the scale measured in the browser", async () => {
    process.env.TINYCV_WORKER_SECRET = "worker-secret";
    const { page } = mockBrowserPage({
      overflowAboveScale: 0.91,
    });
    browserRendererMock.withBrowserPage.mockImplementation(async (callback) => callback(page));

    const result = await measureResumeFitInBrowser({ resumeId: "res_123" });

    expect(result).toEqual({
      aggressive: false,
      fitScale: 0.91,
      overflow: false,
    });
    expect(page.goto).toHaveBeenCalledWith("https://tiny.test/internal/resume-fit/res_123", {
      timeout: 30_000,
      waitUntil: "networkidle0",
    });
  });

  it("retries aggressive limits when normal limits still overflow", async () => {
    process.env.TINYCV_WORKER_SECRET = "worker-secret";
    const { page } = mockBrowserPage({
      overflowAboveScale: 0.25,
    });
    browserRendererMock.withBrowserPage.mockImplementation(async (callback) => callback(page));

    const result = await measureResumeFitInBrowser({ resumeId: "res_dense" });

    expect(result).toEqual({
      aggressive: true,
      fitScale: 0.25,
      overflow: false,
    });
  });

  it("throws a typed error when browser rendering is unavailable", async () => {
    process.env.TINYCV_WORKER_SECRET = "worker-secret";
    browserRendererMock.assertBrowserRendererConfigured.mockImplementation(() => {
      throw new BrowserRendererUnavailableError("No browser configured.");
    });

    await expect(measureResumeFitInBrowser({ resumeId: "res_123" })).rejects.toMatchObject({
      code: "browser_fit_unavailable",
      message: "No browser configured.",
    });
  });

  it("sends the worker secret header", async () => {
    process.env.TINYCV_WORKER_SECRET = "worker-secret";
    const { headers, page } = mockBrowserPage({
      overflowAboveScale: 0.91,
    });
    browserRendererMock.withBrowserPage.mockImplementation(async (callback) => callback(page));

    await measureResumeFitInBrowser({ resumeId: "res_123" });

    expect(headers).toEqual({
      "X-TinyCV-Worker-Secret": "worker-secret",
    });
  });
});

function mockBrowserPage(input: {
  overflowAboveScale: number;
}) {
  const headers: Record<string, string> = {};
  const originalDocument = globalThis.document;
  let currentScale = 1.18;
  const pageNode = {
    clientHeight: 1000,
  };
  const contentNode = {
    get scrollHeight() {
      return currentScale > input.overflowAboveScale ? 1102 : 940;
    },
    style: {
      setProperty(name: string, value: string) {
        if (name === "--cv-scale") {
          currentScale = Number(value);
        }
      },
    },
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      fonts: {
        ready: Promise.resolve(),
      },
      querySelector(selector: string) {
        if (selector === "[data-fit-page]") {
          return pageNode;
        }

        if (selector === "[data-fit-content]") {
          return contentNode;
        }

        return null;
      },
    },
  });

  const page = {
    goto: vi.fn(),
    evaluate: vi.fn(async (callback: () => unknown) => callback()),
    setExtraHTTPHeaders: vi.fn(async (nextHeaders: Record<string, string>) => {
      Object.assign(headers, nextHeaders);
    }),
    setViewport: vi.fn(),
  };

  const restore = () => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  };

  page.evaluate.mockImplementation(async (callback: () => unknown) => {
    try {
      return await callback();
    } finally {
      if (page.evaluate.mock.calls.length >= 2) {
        restore();
      }
    }
  });

  return {
    headers,
    page,
  };
}
