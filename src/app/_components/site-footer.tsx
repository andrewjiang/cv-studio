"use client";

import Image from "next/image";
import Link from "next/link";

const GITHUB_REPO_URL = "https://github.com/andrewjiang/cv-studio";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-black/5 bg-black/[0.01] px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[80rem] flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <Link className="inline-flex min-h-11 items-center" href="/">
          <Image
            alt="Tiny CV"
            className="h-7 w-auto"
            height={130}
            src="/tinycv_logo.png"
            width={400}
          />
        </Link>

        <nav className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-bold text-slate-500">
          <Link className="transition hover:text-slate-950" href="/blog">
            Blog
          </Link>
          <Link className="transition hover:text-slate-950" href="/templates">
            Templates
          </Link>
          <Link className="transition hover:text-slate-950" href="/developers">
            Documentation
          </Link>
          <Link className="transition hover:text-slate-950" href="/api/v1/openapi.json">
            OpenAPI
          </Link>
          <Link className="transition hover:text-slate-950" href={GITHUB_REPO_URL} target="_blank">
            GitHub
          </Link>
          <Link className="transition hover:text-slate-950" href="https://x.com/andrewjiang" target="_blank">
            Twitter
          </Link>
        </nav>

        <p className="text-sm font-medium text-slate-400">
          &copy; 2026 Tiny CV. Built by Andrew Jiang.
        </p>
      </div>
    </footer>
  );
}
