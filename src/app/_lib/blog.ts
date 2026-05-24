import fs from "node:fs/promises";
import path from "node:path";

export const BLOG_CATEGORIES = [
  "Resume Writing",
  "Job Search",
  "Career Materials",
  "Agents",
  "Developer API",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export type BlogPost = {
  author: string;
  body: string;
  category: BlogCategory;
  date: string;
  description: string;
  heroImage?: string;
  slug: string;
  title: string;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function isBlogCategory(value: string): value is BlogCategory {
  return BLOG_CATEGORIES.includes(value as BlogCategory);
}

function parseFrontmatter(raw: string) {
  if (!raw.startsWith("---\n")) {
    throw new Error("Blog post is missing frontmatter.");
  }

  const closingMarker = raw.indexOf("\n---\n", 4);

  if (closingMarker === -1) {
    throw new Error("Blog post frontmatter is not closed.");
  }

  const frontmatter = raw
    .slice(4, closingMarker)
    .split("\n")
    .reduce<Record<string, string>>((fields, line) => {
      const separator = line.indexOf(":");

      if (separator === -1) {
        return fields;
      }

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

      if (key) {
        fields[key] = value;
      }

      return fields;
    }, {});

  return {
    body: raw.slice(closingMarker + "\n---\n".length).trim(),
    frontmatter,
  };
}

function readRequiredField(
  frontmatter: Record<string, string>,
  field: string,
  filePath: string,
) {
  const value = frontmatter[field]?.trim();

  if (!value) {
    throw new Error(`Blog post ${filePath} is missing "${field}" frontmatter.`);
  }

  return value;
}

async function readBlogPost(fileName: string): Promise<BlogPost> {
  const filePath = path.join(BLOG_DIR, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  const { body, frontmatter } = parseFrontmatter(raw);
  const category = readRequiredField(frontmatter, "category", fileName);

  if (!isBlogCategory(category)) {
    throw new Error(
      `Blog post ${fileName} uses unknown category "${category}".`,
    );
  }

  return {
    author: readRequiredField(frontmatter, "author", fileName),
    body,
    category,
    date: readRequiredField(frontmatter, "date", fileName),
    description: readRequiredField(frontmatter, "description", fileName),
    heroImage: frontmatter.heroImage || undefined,
    slug: readRequiredField(frontmatter, "slug", fileName),
    title: readRequiredField(frontmatter, "title", fileName),
  };
}

export async function getBlogPosts() {
  const fileNames = await fs.readdir(BLOG_DIR);
  const posts = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".md"))
      .map((fileName) => readBlogPost(fileName)),
  );

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getBlogPostBySlug(slug: string) {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getRelatedBlogPosts(currentSlug: string, limit = 3) {
  const posts = await getBlogPosts();
  const currentPost = posts.find((post) => post.slug === currentSlug);

  if (!currentPost) {
    return [];
  }

  return posts
    .filter((post) => post.slug !== currentSlug)
    .sort((a, b) => {
      if (a.category === currentPost.category && b.category !== currentPost.category) {
        return -1;
      }

      if (b.category === currentPost.category && a.category !== currentPost.category) {
        return 1;
      }

      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, limit);
}
