import Link from "next/link";
import { SetPrimaryResumeIconButton } from "@/app/_components/account-client-actions";
import { LinkIcon, SquarePenIcon } from "@/app/_components/icons";
import { ResumePaperPreview } from "@/app/_components/resume-paper-preview";
import type { AccountResumeSummary } from "@/app/_lib/account-store";

export function AccountResumeCard({
  resume,
}: {
  resume: AccountResumeSummary;
}) {
  const thumbnailFitScale = Math.min(resume.fitScale, 0.96);

  return (
    <div className="group flex flex-col items-center antialiased">
      <div className="inline-flex max-w-full flex-col items-start pt-3">
        <div className="relative max-w-full">
          <div className="absolute left-3 top-0 z-30 flex -translate-y-1/2 flex-wrap gap-1.5">
            {resume.isPrimary ? (
              <span className="rounded-full border border-amber-300/75 bg-amber-100/95 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-amber-700 shadow-[0_6px_16px_rgba(245,158,11,0.16)] backdrop-blur-[2px]">
                Primary
              </span>
            ) : null}
            {!resume.isPublished ? (
              <span className="rounded-full border border-slate-200 bg-white/94 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-600 shadow-sm backdrop-blur-[2px]">
                Draft
              </span>
            ) : null}
          </div>

          <div className="absolute -right-4 top-3 z-30 flex flex-col gap-1.5 opacity-100 transition-all duration-300 sm:translate-x-2 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
            <Link
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/92 text-slate-600 shadow-[0_4px_10px_rgba(15,23,42,0.08)] backdrop-blur-[2px] transition-all duration-200 hover:border-black/20 hover:bg-white hover:text-slate-950 active:scale-95"
              href={`/cvs/${resume.id}/open`}
              title="Edit CV"
            >
              <SquarePenIcon className="h-[1.08rem] w-[1.08rem]" />
            </Link>
            {resume.publicUrl && (
              <a
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/92 text-slate-600 shadow-[0_4px_10px_rgba(15,23,42,0.08)] backdrop-blur-[2px] transition-all duration-200 hover:border-black/20 hover:bg-white hover:text-slate-950 active:scale-95"
                href={resume.publicUrl}
                rel="noreferrer"
                target="_blank"
                title="Open public link"
              >
                <LinkIcon className="h-[1.08rem] w-[1.08rem]" />
              </a>
            )}
            <SetPrimaryResumeIconButton
              className="!h-9 !w-9 !rounded-full !border !border-amber-300/70 !bg-amber-50/95 !text-amber-500 !shadow-[0_4px_10px_rgba(245,158,11,0.14)] [&_svg]:!h-[1.08rem] [&_svg]:!w-[1.08rem] backdrop-blur-[2px] transition-all duration-200 hover:!border-amber-300 hover:!bg-amber-100 hover:!text-amber-600 active:scale-95"
              disabled={!resume.isPublished}
              isPrimary={resume.isPrimary}
              resumeId={resume.id}
              title={resume.isPublished ? "Set as primary" : "Publish before setting as primary"}
            />
          </div>

          <div className="origin-top transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] sm:group-hover:-translate-y-1 sm:group-hover:scale-[1.02]">
            <ResumePaperPreview
              className="!rounded-[0.2rem] !border-slate-200 !bg-white shadow-[0_20px_40px_rgba(15,23,42,0.2)]"
              fitScale={thumbnailFitScale}
              markdown={resume.markdown}
              mobileTargetHeight={390}
              scale={0.4}
              targetHeight={392}
              templateKey={resume.templateKey}
            />
          </div>
        </div>

        <div className="mt-4 min-w-0 px-0.5">
          <h3 className="truncate text-[1.05rem] font-bold tracking-tight text-slate-950 text-wrap-balance">
            {resume.title}
          </h3>
          <p className="mt-0.5 text-[0.82rem] font-semibold text-slate-400 tabular-nums">
            Updated {formatRelativeDate(resume.updatedAt)}
          </p>
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
