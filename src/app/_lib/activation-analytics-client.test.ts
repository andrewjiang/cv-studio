import { afterEach, describe, expect, it, vi } from "vitest";
import { trackActivationEvent } from "@/app/_lib/activation-analytics-client";

describe("activation analytics client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dispatches launch aliases to GA4 and the analytics endpoint", () => {
    const { fetch, gtag } = installBrowserAnalyticsGlobals();

    trackActivationEvent("template_selected", {
      surface: "templates_page",
      template_key: "engineer",
    });

    expect(gtag).toHaveBeenCalledWith("event", "template_selected", expect.objectContaining({
      anonymous_id: expect.any(String),
      session_id: expect.any(String),
      source: "landing",
      surface: "templates_page",
      template_key: "engineer",
    }));
    expect(gtag).toHaveBeenCalledWith("event", "template_select", expect.objectContaining({
      surface: "templates_page",
      template_key: "engineer",
    }));
    expect(readFetchEventNames(fetch)).toEqual(["template_selected", "template_select"]);
  });

  it("keeps server dispatch disabled for launch aliases when requested", () => {
    const { fetch, gtag } = installBrowserAnalyticsGlobals();

    trackActivationEvent("resume_published", {
      surface: "studio",
      template_key: "founder",
      workspace_id: "workspace-123",
    }, {
      sendToServer: false,
    });

    expect(gtag).toHaveBeenCalledWith("event", "resume_published", expect.any(Object));
    expect(gtag).toHaveBeenCalledWith("event", "cv_publish", expect.any(Object));
    expect(fetch).not.toHaveBeenCalled();
  });
});

function installBrowserAnalyticsGlobals() {
  const fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  const gtag = vi.fn();

  vi.stubGlobal("window", {
    crypto: globalThis.crypto,
    gtag,
    localStorage: createMemoryStorage(),
    location: {
      host: "tiny.cv",
      href: "https://tiny.cv/",
    },
    sessionStorage: createMemoryStorage(),
  });
  vi.stubGlobal("document", {
    referrer: "",
  });
  vi.stubGlobal("fetch", fetch);

  return { fetch, gtag };
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function readFetchEventNames(fetch: ReturnType<typeof vi.fn>) {
  return fetch.mock.calls.map(([, init]) => {
    const body = init && typeof init === "object" && "body" in init ? init.body : null;
    return JSON.parse(String(body)).eventName;
  });
}
