import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/app/_components/app-header";
import { SiteFooter } from "@/app/_components/site-footer";
import { getBlogPosts } from "@/app/_lib/blog";

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: {
    canonical: "/blog",
  },
  description:
    "Tiny CV essays and guides for writing one-page resumes, publishing clean CV links, and using agents in a job search.",
  openGraph: {
    description:
      "Guides for writing one-page resumes, publishing clean CV links, and using agents in a job search.",
    title: "Tiny CV Blog",
    url: "/blog",
  },
  title: "Blog",
};

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <main className="min-h-screen bg-[#fbf7f0] text-slate-900 selection:bg-[#065f46] selection:text-white">
      <AppHeader continueEditingHref={null} />

      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 lg:py-24">
        <section>
          <h1
            className="text-[2.8rem] font-bold leading-none tracking-[-0.045em] text-slate-950 sm:text-[4rem]"
            style={{ fontFamily: "var(--font-display-newsreader)" }}
          >
            A Tiny Blog
          </h1>
          <p className="mt-5 max-w-xl text-[1.05rem] font-medium leading-8 text-slate-600">
            Practical guides on job searches and putting your best self forward.
          </p>
        </section>

        <section className="mt-12 border-t border-black/8">
          <div className="divide-y divide-black/8">
            {posts.map((post) => (
              <BlogPostRow key={post.slug} post={post} />
            ))}
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

function BlogPostRow({
  post,
}: {
  post: Awaited<ReturnType<typeof getBlogPosts>>[number];
}) {
  return (
    <Link
      className="group grid gap-5 py-8 transition sm:grid-cols-[1fr_11rem] sm:items-center sm:py-10"
      href={`/blog/${post.slug}`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-slate-500">
          <span>{formatPostDate(post.date)}</span>
        </div>
        <h2 className="mt-4 text-[1.75rem] font-bold leading-tight tracking-[-0.025em] text-slate-950 transition group-hover:text-[#065f46]">
          {post.title}
        </h2>
        <p className="mt-3 max-w-2xl text-[1rem] font-medium leading-7 text-slate-600">
          {post.description}
        </p>
      </div>
      {post.heroImage ? (
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-black/8 bg-white/55 shadow-sm">
          <Image
            alt=""
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            fill
            sizes="11rem"
            src={post.heroImage}
          />
        </div>
      ) : null}
    </Link>
  );
}

function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
