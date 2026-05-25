"use client";

import Link from "next/link";
import { useState } from "react";
import { ResumePreview } from "./resume-content";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  GlobeIcon,
  SpinnerIcon,
} from "./cv-studio-ui";
import { ExternalLinkIcon } from "./icons";
import { type ResumeDocument } from "@/app/_lib/cv-markdown";
import { getPageMetrics } from "@/app/_lib/cv-fit";
import { brandPrimaryButtonClass, brandSecondaryButtonClass } from "./button-classes";
import { authClient } from "@/app/_lib/auth-client";

export function PostPublishSuccessModal({
  document,
  fitScale,
  onAccountCtaClick,
  publicUrl,
  onCopyLink,
  onClose,
  onDownloadPdf,
  onViewLive,
}: {
  document: ResumeDocument;
  fitScale: number;
  onAccountCtaClick: () => void;
  publicUrl: string;
  onCopyLink: () => Promise<void>;
  onClose: () => void;
  onDownloadPdf: () => Promise<void>;
  onViewLive: () => void;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const pageMetrics = getPageMetrics(document.style);

  // We want the preview to be quite small, maybe around 200px wide
  const previewScale = 240 / pageMetrics.pageWidth;

  const handleCopy = async () => {
    await onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);

    try {
      await onDownloadPdf();
    } finally {
      setIsDownloading(false);
    }
  };

  const shouldShowAccountCta = !isPending && !session;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-md">
      <div className="relative w-full max-w-2xl animate-in rounded-[1.5rem] border border-black/8 bg-white p-6 shadow-[0_32px_80px_rgba(15,23,42,0.22)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10">
            <GlobeIcon className="h-8 w-8" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Your CV is live
          </h2>
          <p className="mt-3 max-w-md text-[1rem] font-medium leading-7 text-slate-600">
            Anyone with the link can view this CV. Drafts stay private until you publish them.
          </p>

          <div className="mt-7 flex w-full justify-center">
            <div
              className="overflow-hidden rounded-xl border border-black/8 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
              style={{
                height: `${pageMetrics.pageHeight * previewScale}px`,
                width: `${pageMetrics.pageWidth * previewScale}px`,
              }}
            >
              <div
                style={{
                  height: `${pageMetrics.pageHeight}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  width: `${pageMetrics.pageWidth}px`,
                }}
              >
                <ResumePreview
                  document={document}
                  fitScale={fitScale}
                  interactive={false}
                />
              </div>
            </div>
          </div>

          <div className="mt-7 w-full">
            <div className="flex items-center gap-2 rounded-2xl border border-black/8 bg-slate-50 p-1.5 pl-4 ring-1 ring-black/5">
              <span className="min-w-0 flex-1 truncate text-left text-[0.92rem] font-semibold text-slate-600">
                {publicUrl.replace(/^https?:\/\//, "")}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[0.88rem] font-bold text-slate-900 shadow-sm ring-1 ring-black/8 transition hover:bg-slate-50 active:scale-95"
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4 text-slate-500" />
                    <span>Copy link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-5 grid w-full gap-3 sm:grid-cols-2">
            <a
              className={`${brandSecondaryButtonClass} gap-2 !justify-center !py-3 !text-[0.94rem]`}
              href={publicUrl}
              onClick={onViewLive}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLinkIcon className="h-4 w-4" />
              View live CV
            </a>
            <button
              className={`${brandSecondaryButtonClass} gap-2 !justify-center !py-3 !text-[0.94rem]`}
              disabled={isDownloading}
              onClick={() => void handleDownloadPdf()}
              type="button"
            >
              {isDownloading ? <SpinnerIcon /> : <DownloadIcon className="h-4 w-4" />}
              Download PDF
            </button>
          </div>

          {shouldShowAccountCta ? (
            <div className="mt-5 w-full rounded-[1.25rem] bg-[var(--accent)]/5 p-5 ring-1 ring-[var(--accent)]/10">
              <h3 className="text-[1.02rem] font-bold text-slate-900">
                Save this workspace
              </h3>
              <p className="mt-2 text-[0.9rem] font-medium leading-relaxed text-slate-600">
                Create an account to keep this draft available from any device.
              </p>
              <Link
                href="/account"
                className={`${brandPrimaryButtonClass} mt-5 w-full !py-3 !text-[0.94rem]`}
                onClick={onAccountCtaClick}
              >
                Create free account
              </Link>
            </div>
          ) : null}

          <button
            className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-[0.92rem] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            Continue editing
          </button>
        </div>
      </div>
    </div>
  );
}

export const UnauthenticatedPublishModal = PostPublishSuccessModal;
