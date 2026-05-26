"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

interface GoogleAnalyticsProps {
  measurementId: string;
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!measurementId || typeof window.gtag !== "function") {
      return;
    }

    const pagePath = sanitizeAnalyticsPath(pathname);

    if (previousPath.current === pagePath) {
      return;
    }

    window.gtag("event", "page_view", buildPageViewParams(pagePath));

    previousPath.current = pagePath;
  }, [measurementId, pathname]);

  return null;
}

function buildPageViewParams(pagePath: string) {
  return {
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: `Tiny CV ${pagePath}`,
  };
}

function sanitizeAnalyticsPath(pathname: string) {
  if (pathname === "/") return "/";
  if (STATIC_PAGE_PATHS.has(pathname)) return pathname;
  if (pathname.startsWith("/account/resumes/") && pathname.endsWith("/open")) return "/account/resumes/[resumeId]/open";
  if (pathname.startsWith("/blog/")) return "/blog/[slug]";
  if (pathname.startsWith("/claim/")) return "/claim/[claimId]";
  if (pathname.startsWith("/cvs/") && pathname.endsWith("/open")) return "/cvs/[resumeId]/open";
  if (pathname.startsWith("/examples/")) return "/examples/[templateKey]";
  if (pathname.startsWith("/internal/resume-fit/")) return "/internal/resume-fit/[resumeId]";
  if (pathname.startsWith("/studio/") && pathname.endsWith("/pdf-render")) return "/studio/[resumeId]/pdf-render";
  if (pathname.startsWith("/studio/") && pathname.endsWith("/pdf")) return "/studio/[resumeId]/pdf";
  if (pathname.startsWith("/studio/")) return "/studio/[resumeId]";
  if (/^\/[^/]+\/pdf$/.test(pathname)) return "/[public_resume_slug]/pdf";
  if (/^\/[^/]+$/.test(pathname)) return "/[public_resume_slug]";
  return "/other";
}

const STATIC_PAGE_PATHS = new Set([
  "/account",
  "/account/cvs",
  "/account/resumes",
  "/agents",
  "/blog",
  "/cvs",
  "/developers",
  "/docs",
  "/documentation",
  "/new",
  "/pdf",
  "/templates",
]);
