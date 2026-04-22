"use client";

import { DownloadIcon } from "@/app/_components/cv-studio-ui";
import Link from "next/link";

export function PublicResumeFooterActions({
  pageWidth,
  showBranding,
}: {
  pageWidth: number;
  showBranding: boolean;
}) {
  if (!showBranding) {
    return (
      <footer
        className="app-chrome mx-auto mt-4 flex w-full items-center justify-end pb-2 lg:mt-5 lg:pb-0 print:hidden"
        style={{ maxWidth: `${pageWidth}px` }}
      >
        <button
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 text-[0.82rem] font-medium text-slate-600 underline-offset-4 transition hover:text-slate-950 hover:underline sm:min-h-0 sm:min-w-0"
          onClick={() => window.print()}
          type="button"
        >
          <DownloadIcon className="h-[0.92rem] w-[0.92rem]" />
          <span>PDF</span>
        </button>
      </footer>
    );
  }

  return (
    <footer
      className="app-chrome mx-auto mt-4 flex w-full flex-col gap-2 pb-2 text-left sm:flex-row sm:items-center sm:justify-between lg:mt-5 lg:pb-0 print:hidden"
      style={{ maxWidth: `${pageWidth}px` }}
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Published with Tiny CV
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.82rem] font-medium text-slate-600">
        <button
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 underline-offset-4 transition hover:text-slate-950 hover:underline sm:min-h-0 sm:min-w-0"
          onClick={() => window.print()}
          type="button"
        >
          <DownloadIcon className="h-[0.92rem] w-[0.92rem]" />
          <span>PDF</span>
        </button>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <Link
          className="inline-flex min-h-11 items-center underline-offset-4 transition hover:text-slate-950 hover:underline sm:min-h-0"
          href="/new"
        >
          Create your own
        </Link>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-[#065f46] underline-offset-4 transition hover:text-[#044e34] hover:underline sm:min-h-0"
          href="/account#billing"
        >
          Claim your tiny.cv URL
        </Link>
      </div>
    </footer>
  );
}
