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
    if (!measurementId) return;

    const pagePath = `${pathname}${window.location.search}`;

    if (previousPath.current === null) {
      previousPath.current = pagePath;
      return;
    }

    if (previousPath.current === pagePath || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", "page_view", {
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });

    previousPath.current = pagePath;
  }, [measurementId, pathname]);

  return null;
}
