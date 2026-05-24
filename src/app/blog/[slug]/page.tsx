import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppHeader } from "@/app/_components/app-header";
import { SiteFooter } from "@/app/_components/site-footer";
import {
  getBlogPostBySlug,
  getBlogPosts,
  getRelatedBlogPosts,
} from "@/app/_lib/blog";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const posts = await getBlogPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    authors: [{ name: post.author }],
    description: post.description,
    openGraph: {
      description: post.description,
      images: post.heroImage
        ? [{ alt: post.title, url: post.heroImage }]
        : undefined,
      title: post.title,
      type: "article",
      url: `/blog/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      description: post.description,
      images: post.heroImage ? [post.heroImage] : undefined,
      title: post.title,
    },
    title: post.title,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedBlogPosts(post.slug);

  return (
    <main className="min-h-screen bg-[#fbf7f0] text-slate-900 selection:bg-[#065f46] selection:text-white">
      <AppHeader continueEditingHref={null} />

      <article className="mx-auto max-w-[74rem] px-5 py-12 sm:px-8 lg:px-12 lg:py-18">
        <Link
          className="inline-flex text-sm font-bold text-[#065f46] transition hover:text-[#044e34]"
          href="/blog"
        >
          &lt;- Back to blog
        </Link>

        <header className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(18rem,0.45fr)] lg:items-end">
          <div>
            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.28em] text-[#065f46]">
              {post.category}
            </p>
            <h1
              className="mt-6 max-w-4xl text-[3rem] font-bold leading-[0.95] tracking-[-0.05em] text-slate-950 sm:text-[4.4rem]"
              style={{ fontFamily: "var(--font-display-newsreader)" }}
            >
              {post.title}
            </h1>
            <p className="mt-7 max-w-3xl text-[1.12rem] font-medium leading-8 text-slate-600">
              {post.description}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-black/8 bg-white/55 p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-950">{post.author}</p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {formatPostDate(post.date)}
            </p>
          </div>
        </header>

        {post.heroImage ? (
          <div className="relative mt-12 aspect-[16/9] overflow-hidden rounded-[2.25rem] border border-black/8 bg-slate-200 shadow-sm">
            <Image
              alt=""
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 70rem, 100vw"
              src={post.heroImage}
            />
          </div>
        ) : null}

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,44rem)_16rem] lg:items-start">
          <div className="rounded-[2rem] border border-black/8 bg-white/70 px-6 py-8 shadow-sm sm:px-10 sm:py-12">
            <ReactMarkdown
              components={{
                a: ({ children, href }) => (
                  <a
                    className="font-bold text-[#065f46] underline decoration-[#065f46]/25 underline-offset-4 transition hover:text-[#044e34]"
                    href={href}
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-8 border-l-4 border-[#065f46] bg-[#065f46]/5 px-6 py-4 text-slate-700">
                    {children}
                  </blockquote>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-12 text-[2rem] font-bold leading-tight tracking-[-0.025em] text-slate-950 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-9 text-[1.35rem] font-bold leading-tight text-slate-950">
                    {children}
                  </h3>
                ),
                li: ({ children }) => (
                  <li className="pl-1 text-[1.02rem] leading-8 text-slate-700">
                    {children}
                  </li>
                ),
                ol: ({ children }) => (
                  <ol className="my-6 list-decimal space-y-2 pl-6">
                    {children}
                  </ol>
                ),
                p: ({ children }) => (
                  <p className="mt-5 text-[1.04rem] leading-8 text-slate-700">
                    {children}
                  </p>
                ),
                table: ({ children }) => (
                  <div className="my-8 overflow-x-auto rounded-2xl border border-black/8">
                    <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                      {children}
                    </table>
                  </div>
                ),
                td: ({ children }) => (
                  <td className="border-t border-black/8 px-4 py-3 text-slate-700">
                    {children}
                  </td>
                ),
                th: ({ children }) => (
                  <th className="bg-[#fbf7f0] px-4 py-3 font-bold text-slate-950">
                    {children}
                  </th>
                ),
                ul: ({ children }) => (
                  <ul className="my-6 list-disc space-y-2 pl-6">
                    {children}
                  </ul>
                ),
              }}
              remarkPlugins={[remarkGfm]}
            >
              {post.body}
            </ReactMarkdown>
          </div>

          <aside className="sticky top-24 hidden space-y-4 lg:block">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Next step
            </p>
            <Link
              className="block rounded-[1.5rem] border border-black/8 bg-[#0f241d] p-5 text-white shadow-sm transition hover:-translate-y-0.5"
              href="/new"
            >
              <span className="text-sm font-bold text-emerald-200">
                Start writing
              </span>
              <span className="mt-3 block text-[0.98rem] font-medium leading-7 text-white/72">
                Turn the advice into a one-page resume with a live paper preview.
              </span>
            </Link>
          </aside>
        </div>
      </article>

      {relatedPosts.length > 0 ? (
        <section className="mx-auto max-w-[74rem] px-5 pb-8 sm:px-8 lg:px-12">
          <div className="border-t border-black/8 pt-12">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Keep reading
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <Link
                  className="rounded-[1.5rem] border border-black/8 bg-white/55 p-5 transition hover:-translate-y-0.5 hover:bg-white"
                  href={`/blog/${relatedPost.slug}`}
                  key={relatedPost.slug}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#065f46]">
                    {relatedPost.category}
                  </p>
                  <p className="mt-4 text-lg font-bold leading-tight text-slate-950">
                    {relatedPost.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}

function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
