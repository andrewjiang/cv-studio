"use client";

import Link from "next/link";
import { useState } from "react";
import { ResumePreview } from "./resume-content";
import { 
  CheckIcon, 
  CopyIcon, 
  GlobeIcon, 
  iconActionButtonClass, 
  primaryActionButtonClass 
} from "./cv-studio-ui";
import { type ResumeDocument } from "@/app/_lib/cv-markdown";
import { getPageMetrics } from "@/app/_lib/cv-fit";
import { brandPrimaryButtonClass, brandSecondaryButtonClass } from "./button-classes";

export function UnauthenticatedPublishModal({
  document,
  fitScale,
  publicUrl,
  onClose,
}: {
  document: ResumeDocument;
  fitScale: number;
  publicUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pageMetrics = getPageMetrics(document.style);
  
  // We want the preview to be quite small, maybe around 200px wide
  const previewScale = 240 / pageMetrics.pageWidth;

  const handleCopy = async () => {
    try {
      const absoluteUrl = new URL(publicUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-md">
      <div className="relative w-full max-w-xl animate-in fade-in zoom-in duration-300 rounded-[2rem] border border-black/8 bg-white p-8 shadow-[0_32px_80px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10">
            <GlobeIcon className="h-8 w-8" />
          </div>
          
          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Your CV is live!
          </h2>
          <p className="mt-3 text-[1.05rem] font-medium text-slate-500">
            Anyone with the link can view your resume.
          </p>

          <div className="mt-8 flex w-full justify-center">
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

          <div className="mt-8 w-full">
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

          <div className="mt-10 w-full rounded-[1.6rem] bg-[var(--accent)]/5 p-6 ring-1 ring-[var(--accent)]/10">
            <h3 className="text-[1.05rem] font-bold text-slate-900">
              Save your progress
            </h3>
            <p className="mt-2 text-[0.92rem] font-medium leading-relaxed text-slate-600">
              This draft is currently stored only in your browser. Sign up to save it permanently, access it from any device, and unlock custom subdomains.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/account"
                className={`${brandPrimaryButtonClass} flex-1 !py-3 !text-[0.94rem]`}
              >
                Create free account
              </Link>
              <button
                onClick={onClose}
                className={`${brandSecondaryButtonClass} flex-1 !py-3 !text-[0.94rem]`}
              >
                Continue as guest
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
