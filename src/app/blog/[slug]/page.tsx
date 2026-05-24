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
  const header = post.heroImage ? (
    <HeroPostHeader post={post} />
  ) : (
    <TextPostHeader post={post} />
  );

  return (
    <main className="min-h-screen bg-[#fbf7f0] text-slate-900 selection:bg-[#065f46] selection:text-white">
      <AppHeader continueEditingHref={null} />

      {header}

      <article className="mx-auto max-w-[44rem] px-5 py-14 sm:px-8 lg:py-18">
        <div>
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
                <li className="pl-1 text-[1.06rem] leading-8 text-slate-700">
                  {children}
                </li>
              ),
              ol: ({ children }) => (
                <ol className="my-6 list-decimal space-y-2 pl-6">
                  {children}
                </ol>
              ),
              p: ({ children }) => (
                <p className="mt-5 text-[1.08rem] leading-8 text-slate-700">
                  {children}
                </p>
              ),
              table: ({ children }) => (
                <div className="my-8 overflow-x-auto rounded-2xl border border-black/8 bg-white/45">
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
                <th className="bg-white/55 px-4 py-3 font-bold text-slate-950">
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

        <footer className="mt-16 rounded-[1.75rem] border border-black/8 bg-white/45 p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Next step
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
            Turn this into a one-page resume.
          </h2>
          <p className="mt-3 max-w-2xl text-[1rem] font-medium leading-7 text-slate-600">
            Write in markdown, preview on paper, and publish a clean Tiny CV
            link when you are ready.
          </p>
          <Link
            className="mt-6 inline-flex rounded-full bg-[#065f46] px-5 py-3 text-sm font-bold !text-white shadow-sm transition hover:bg-[#044e34]"
            href="/new"
          >
            Start writing
          </Link>
        </footer>
      </article>

      {relatedPosts.length > 0 ? (
        <section className="mx-auto max-w-[54rem] px-5 pb-8 sm:px-8">
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

function HeroPostHeader({
  post,
}: {
  post: NonNullable<Awaited<ReturnType<typeof getBlogPostBySlug>>>;
}) {
  return (
    <header className="relative isolate min-h-[34rem] overflow-hidden bg-slate-950 text-white">
      <Image
        alt=""
        className="object-cover"
        fill
        priority
        sizes="100vw"
        src={post.heroImage!}
      />
      <div className="absolute inset-0 bg-slate-950/65" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/70 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[34rem] max-w-[62rem] flex-col px-5 py-7 text-center sm:px-8 lg:px-12">
        <Link
          className="self-start text-sm font-bold text-white/80 transition hover:text-white"
          href="/blog"
        >
          &lt;- Back to blog
        </Link>

        <div className="m-auto max-w-4xl py-16">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-bold uppercase tracking-[0.18em] text-white/80">
            <span className="rounded-full bg-white/12 px-3 py-1.5 backdrop-blur">
              {post.category}
            </span>
            <span className="normal-case tracking-normal text-white/60">
              {formatPostDate(post.date)}
            </span>
          </div>

          <h1 className="mt-7 text-[2.7rem] font-bold leading-[0.98] tracking-[-0.045em] text-white sm:text-[4.35rem]">
            {post.title}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-[1.08rem] font-medium leading-8 text-white/82">
            {post.description}
          </p>
          <p className="mt-7 text-sm font-bold text-white">
            {post.author}
          </p>
        </div>
      </div>
    </header>
  );
}

function TextPostHeader({
  post,
}: {
  post: NonNullable<Awaited<ReturnType<typeof getBlogPostBySlug>>>;
}) {
  return (
    <header className="mx-auto max-w-[54rem] px-5 pt-12 sm:px-8 lg:pt-18">
      <Link
        className="inline-flex text-sm font-bold text-[#065f46] transition hover:text-[#044e34]"
        href="/blog"
      >
        &lt;- Back to blog
      </Link>

      <div className="mt-10">
        <p className="text-[0.76rem] font-semibold uppercase tracking-[0.28em] text-[#065f46]">
          {post.category}
        </p>
        <h1
          className="mt-6 text-[3rem] font-bold leading-[0.95] tracking-[-0.05em] text-slate-950 sm:text-[4.35rem]"
          style={{ fontFamily: "var(--font-display-newsreader)" }}
        >
          {post.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-slate-500">
          <span className="text-slate-900">{post.author}</span>
          <span className="text-slate-300">/</span>
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
        </div>
        <p className="mt-7 text-[1.12rem] font-medium leading-8 text-slate-600">
          {post.description}
        </p>
      </div>
    </header>
  );
}

function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
