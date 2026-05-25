"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import {
  classifyBlogProductIntent,
  trackBlogProductIntent,
  type BlogAttributionInput,
  type BlogProductIntent,
} from "@/app/_lib/blog-product-intent-analytics";

type BlogIntentContext = Pick<
  BlogAttributionInput,
  "blogCategory" | "blogSlug" | "blogTitle" | "surface"
>;

export function BlogProductIntentLink({
  blogCategory,
  blogSlug,
  blogTitle,
  children,
  className,
  href,
  intent,
  linkText,
  surface = "blog",
}: BlogIntentContext & {
  children: ReactNode;
  className?: string;
  href: string;
  intent: BlogProductIntent;
  linkText: string;
}) {
  return (
    <Link
      className={className}
      href={href}
      onClick={() => trackBlogProductIntent(intent, {
        blogCategory,
        blogSlug,
        blogTitle,
        linkText,
        linkUrl: href,
        surface,
      })}
    >
      {children}
    </Link>
  );
}

export function BlogMarkdownLink({
  blogCategory,
  blogSlug,
  blogTitle,
  children,
  className,
  href,
  surface = "blog_post_body",
}: BlogIntentContext & {
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  const intent = href ? classifyBlogProductIntent(href) : null;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!href || !intent || event.defaultPrevented) {
      return;
    }

    trackBlogProductIntent(intent, {
      blogCategory,
      blogSlug,
      blogTitle,
      linkText: extractText(children),
      linkUrl: href,
      surface,
    });
  }

  return (
    <a className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}

function extractText(children: ReactNode): string | null {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    const text = children
      .map((child) => extractText(child))
      .filter(Boolean)
      .join(" ")
      .trim();

    return text || null;
  }

  return null;
}
