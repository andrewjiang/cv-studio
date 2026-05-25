"use client";

import {
  type ActivationEventMetadata,
  type ActivationEventName,
  sanitizeActivationMetadata,
} from "@/app/_lib/activation-events";

const ANONYMOUS_ID_STORAGE_KEY = "tinycv:analytics-anonymous-id";
const SESSION_ID_STORAGE_KEY = "tinycv:analytics-session-id";
const SENT_EVENT_STORAGE_PREFIX = "tinycv:analytics-sent:";

type TrackActivationEventOptions = {
  onceKey?: string;
  sendToServer?: boolean;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackActivationEvent(
  eventName: ActivationEventName,
  metadata: ActivationEventMetadata = {},
  options: TrackActivationEventOptions = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  if (options.onceKey && hasSentEvent(options.onceKey)) {
    return;
  }

  const eventMetadata = sanitizeActivationMetadata({
    ...readSourceContext(),
    ...metadata,
    anonymous_id: getStoredId(window.localStorage, ANONYMOUS_ID_STORAGE_KEY),
    session_id: getStoredId(window.sessionStorage, SESSION_ID_STORAGE_KEY),
  });

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, eventMetadata);
  }

  if (options.sendToServer !== false) {
    void fetch("/api/analytics/events", {
      body: JSON.stringify({
        eventName,
        metadata: eventMetadata,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    }).catch(() => null);
  }

  if (options.onceKey) {
    markSentEvent(options.onceKey);
  }
}

function readSourceContext(): ActivationEventMetadata {
  const url = new URL(window.location.href);
  const referrer = readReferrerContext();

  return {
    ...referrer,
    source: classifySource(url.pathname),
    utm_campaign: readSafeQueryParam(url, "utm_campaign"),
    utm_medium: readSafeQueryParam(url, "utm_medium"),
    utm_source: readSafeQueryParam(url, "utm_source"),
  };
}

function readReferrerContext(): ActivationEventMetadata {
  if (!document.referrer) {
    return {
      referrer_source: "direct",
    };
  }

  try {
    const referrer = new URL(document.referrer);

    if (referrer.host === window.location.host) {
      return {
        referrer_source: "same_site",
      };
    }

    return {
      referrer_host: referrer.host,
      referrer_source: "external",
    };
  } catch {
    return {
      referrer_source: "unknown",
    };
  }
}

function classifySource(pathname: string) {
  if (pathname === "/") return "landing";
  if (pathname === "/new") return "new_resume";
  if (pathname === "/templates") return "templates";
  if (pathname.startsWith("/examples/")) return "template_example";
  if (pathname.startsWith("/studio/")) return "studio";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/docs") || pathname.startsWith("/documentation")) return "docs";
  return "public_or_other";
}

function readSafeQueryParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value && value.length <= 96 ? value : undefined;
}

function getStoredId(storage: Storage, key: string) {
  try {
    const existing = storage.getItem(key);

    if (existing) {
      return existing;
    }

    const nextId = createId();
    storage.setItem(key, nextId);
    return nextId;
  } catch {
    return createId();
  }
}

function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `anon_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function hasSentEvent(key: string) {
  try {
    return window.sessionStorage.getItem(`${SENT_EVENT_STORAGE_PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

function markSentEvent(key: string) {
  try {
    window.sessionStorage.setItem(`${SENT_EVENT_STORAGE_PREFIX}${key}`, "1");
  } catch {
    // Ignore storage failures; the event has already been sent.
  }
}
