"use client";

import Link from "next/link";
import {
  CopyAccountPublicLinkButton,
  SetPrimaryResumeIconButton,
} from "@/app/_components/account-client-actions";
import { ExternalLinkIcon, PencilIcon } from "@/app/_components/icons";
import { LandingPaperPreview } from "@/app/_components/tinycv-landing-page";
import type { AccountResumeSummary } from "@/app/_lib/account-store";

export function AccountResumeCard({
  resume,
}: {
  resume: AccountResumeSummary;
}) {
  return (
    <div className="group relative flex flex-col rounded-[2rem] border border-black/[0.06] bg-white/75 p-4 antialiased shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-black/[0.1] hover:shadow-[0_16px_34px_rgba(15,23,42,0.09)]">
      {resume.isPrimary && (
        <div className="absolute left-4 top-4 z-30 animate-in fade-in zoom-in-90 delay-300 duration-500 fill-mode-both">
          <span className="rounded-full border border-black/10 bg-white/92 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-700 shadow-sm">
            Primary
          </span>
        </div>
      )}

      <div className="absolute right-4 top-4 z-30 flex flex-col gap-1.5 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:translate-x-2">
        <Link
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/92 text-slate-600 shadow-[0_4px_10px_rgba(15,23,42,0.08)] backdrop-blur-[2px] transition-all duration-200 hover:border-black/20 hover:bg-white hover:text-slate-950 active:scale-95"
          href={`/account/resumes/${resume.id}/open`}
          title="Edit CV"
        >
          <PencilIcon className="h-4 w-4" />
        </Link>
        {resume.publicUrl && (
          <a
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/92 text-slate-600 shadow-[0_4px_10px_rgba(15,23,42,0.08)] backdrop-blur-[2px] transition-all duration-200 hover:border-black/20 hover:bg-white hover:text-slate-950 active:scale-95"
            href={resume.publicUrl}
            rel="noreferrer"
            target="_blank"
            title="View public page"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </a>
        )}
        <SetPrimaryResumeIconButton
          className="!h-9 !w-9 !rounded-full !border !border-black/10 !bg-white/92 !text-amber-500 !shadow-[0_4px_10px_rgba(15,23,42,0.08)] backdrop-blur-[2px] transition-all duration-200 hover:!border-amber-300 hover:!bg-amber-50 hover:!text-amber-600 active:scale-95"
          disabled={!resume.isPublished}
          isPrimary={resume.isPrimary}
          resumeId={resume.id}
          title={resume.isPublished ? "Set as primary" : "Publish before setting as primary"}
        />
      </div>

      <div className="relative flex w-full items-start justify-center px-8 pt-2">
        <div className="origin-top transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03]">
          <LandingPaperPreview
            className="!rounded-[0.2rem] !border-slate-200 !bg-white shadow-[0_20px_40px_rgba(15,23,42,0.2)]"
            fitScale={resume.fitScale}
            markdown={resume.markdown}
            scale={0.38}
            templateKey={resume.templateKey}
          />
        </div>
      </div>

      <div className="mt-3 px-1 pb-1">
        <div className="min-w-0">
          <h3 className="truncate text-[1.05rem] font-bold tracking-tight text-slate-950 text-wrap-balance">
            {resume.title}
          </h3>
          <p className="mt-0.5 text-[0.82rem] font-semibold text-slate-400 tabular-nums">
            Updated {formatRelativeDate(resume.updatedAt)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-[0.78rem] font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            href={`/account/resumes/${resume.id}/open`}
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Open editor
          </Link>
          {resume.publicUrl ? (
            <>
              <a
                className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-[0.78rem] font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                href={resume.publicUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLinkIcon className="h-3.5 w-3.5" />
                View public
              </a>
              <CopyAccountPublicLinkButton
                label="Copy public link"
                publicUrl={resume.publicUrl}
              />
            </>
          ) : (
            <span className="inline-flex h-9 items-center rounded-full border border-black/8 bg-[#fbf7f0] px-3 text-[0.78rem] font-bold text-slate-500">
              Draft
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "today";
  if (diffInDays === 1) return "yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
