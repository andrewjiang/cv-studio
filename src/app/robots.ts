import type { MetadataRoute } from "next";
import { getTinyCvAppUrl } from "@/app/_lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getTinyCvAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/internal/",
      ],
    },
    sitemap: new URL("/sitemap.xml", appUrl).toString(),
  };
}
