import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/app/_lib/blog";
import { RESUME_TEMPLATES } from "@/app/_lib/resume-templates";
import { getTinyCvAppUrl } from "@/app/_lib/site-metadata";

function absoluteUrl(pathname: string) {
  return new URL(pathname, getTinyCvAppUrl()).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getBlogPosts();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/templates"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/agents"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/developers"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const examplePages: MetadataRoute.Sitemap = RESUME_TEMPLATES.map((template) => ({
    url: absoluteUrl(`/examples/${template.key}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...examplePages, ...blogPages];
}
