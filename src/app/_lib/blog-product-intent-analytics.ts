"use client";

import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

export type BlogProductIntent =
  | "start_writing"
  | "template"
  | "agent_guide"
  | "public_link"
  | "pdf";

export type BlogAttributionInput = {
  blogCategory?: string | null;
  blogSlug?: string | null;
  blogTitle?: string | null;
  cta?: BlogProductIntent | null;
  linkText?: string | null;
  linkUrl?: string | null;
  surface?: string | null;
};

export type BlogAttribution = {
  blog_category?: string;
  blog_slug?: string;
  blog_title?: string;
  captured_at: string;
  cta?: BlogProductIntent;
  link_text?: string;
  link_url?: string;
  source: "blog";
  surface?: string;
};

const BLOG_ATTRIBUTION_STORAGE_KEY = "tinycv:blog-attribution";
const BLOG_ATTRIBUTION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const EVENT_NAMES: Record<BlogProductIntent, string> = {
  agent_guide: "blog_agent_guide_click",
  pdf: "blog_pdf_cta_click",
  public_link: "blog_public_link_cta_click",
  start_writing: "blog_start_writing_click",
  template: "blog_template_click",
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function buildBlogIntentHref(
  href: string,
  input: BlogAttributionInput,
) {
  if (!input.blogSlug && !input.cta) {
    return href;
  }

  const [path, hash = ""] = href.split("#", 2);
  const separator = path.includes("?") ? "&" : "?";
  const params = new URLSearchParams();

  if (input.blogSlug) {
    params.set("blog", input.blogSlug);
  }

  if (input.cta) {
    params.set("blog_cta", input.cta);
  }

  params.set("source", "blog");

  return `${path}${separator}${params.toString()}${hash ? `#${hash}` : ""}`;
}

export function classifyBlogProductIntent(href: string) {
  const normalizedHref = href.trim();

  if (!normalizedHref || normalizedHref.startsWith("#")) {
    return null;
  }

  const parsed = parseHref(normalizedHref);
  const pathname = parsed?.pathname ?? normalizedHref.split(/[?#]/, 1)[0];
  const blogCta = parsed?.searchParams.get("blog_cta");

  if (blogCta === "public_link") {
    return "public_link";
  }

  if (blogCta === "pdf") {
    return "pdf";
  }

  if (
    pathname === "/templates" ||
    pathname.startsWith("/examples/") ||
    (pathname === "/new" && parsed?.searchParams.has("template"))
  ) {
    return "template";
  }

  if (
    pathname === "/agents" ||
    pathname === "/api/v1/spec/markdown" ||
    normalizedHref.startsWith("/documentation#paid-agent-finish")
  ) {
    return "agent_guide";
  }

  return null;
}

export function trackBlogProductIntent(
  intent: BlogProductIntent,
  input: BlogAttributionInput,
) {
  const attribution = normalizeAttribution({
    ...input,
    cta: input.cta ?? intent,
  });

  if (attribution) {
    writeBlogAttribution(attribution);
  }

  trackGtagEvent(EVENT_NAMES[intent], {
    ...eventParamsFromAttribution(attribution),
    event_category: "blog_product_intent",
  });
}

export function trackBlogCreateResume(input: {
  resumeId?: string | null;
  templateKey: TemplateKey;
}) {
  const attribution = getStoredBlogAttribution();

  if (!attribution) {
    return;
  }

  trackGtagEvent("blog_create_resume", {
    ...eventParamsFromAttribution(attribution),
    event_category: "blog_product_intent",
    resume_id: input.resumeId ?? undefined,
    template_key: input.templateKey,
  });
}

export function getStoredBlogAttribution() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BLOG_ATTRIBUTION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<BlogAttribution>;

    if (parsed.source !== "blog" || typeof parsed.captured_at !== "string") {
      return null;
    }

    const capturedAt = new Date(parsed.captured_at).getTime();

    if (!Number.isFinite(capturedAt) || Date.now() - capturedAt > BLOG_ATTRIBUTION_MAX_AGE_MS) {
      window.localStorage.removeItem(BLOG_ATTRIBUTION_STORAGE_KEY);
      return null;
    }

    return parsed as BlogAttribution;
  } catch {
    return null;
  }
}

export function captureBlogAttributionFromSearch(input: BlogAttributionInput) {
  const attribution = normalizeAttribution(input);

  if (attribution) {
    writeBlogAttribution(attribution);
  }
}

function normalizeAttribution(input: BlogAttributionInput) {
  if (!input.blogSlug && input.surface !== "blog") {
    return null;
  }

  return removeEmptyValues({
    blog_category: input.blogCategory,
    blog_slug: input.blogSlug,
    blog_title: input.blogTitle,
    captured_at: new Date().toISOString(),
    cta: input.cta,
    link_text: input.linkText,
    link_url: input.linkUrl,
    source: "blog" as const,
    surface: input.surface,
  }) as BlogAttribution;
}

function writeBlogAttribution(attribution: BlogAttribution) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(BLOG_ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution should never block the user's click.
  }
}

function eventParamsFromAttribution(attribution: BlogAttribution | null) {
  return removeEmptyValues({
    blog_category: attribution?.blog_category,
    blog_slug: attribution?.blog_slug,
    blog_title: attribution?.blog_title,
    cta: attribution?.cta,
    link_text: attribution?.link_text,
    link_url: attribution?.link_url,
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
    page_path: typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : undefined,
    source_surface: attribution?.surface,
  });
}

function trackGtagEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

function parseHref(href: string) {
  if (typeof window === "undefined") {
    try {
      return new URL(href, "https://tinycv.app");
    } catch {
      return null;
    }
  }

  try {
    return new URL(href, window.location.origin);
  } catch {
    return null;
  }
}

function removeEmptyValues(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) =>
      value !== null &&
      value !== undefined &&
      value !== ""
    ),
  );
}
