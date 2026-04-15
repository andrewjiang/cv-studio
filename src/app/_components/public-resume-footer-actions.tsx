"use client";

import Link from "next/link";

export function PublicResumeFooterActions() {
  return (
    <footer className="app-chrome mt-6 flex flex-col items-center justify-center gap-2 pb-2 text-center lg:mt-8 lg:pb-0 print:hidden">
      <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Published with Tiny CV
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.92rem] font-medium text-slate-600">
        <button
          className="cursor-pointer underline-offset-4 transition hover:text-slate-950 hover:underline"
          onClick={() => window.print()}
          type="button"
        >
          Download PDF
        </button>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <Link
          className="cursor-pointer underline-offset-4 transition hover:text-slate-950 hover:underline"
          href="/"
        >
          Create your own
        </Link>
      </div>
    </footer>
  );
}
