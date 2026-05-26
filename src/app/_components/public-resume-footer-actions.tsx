"use client";

import { DownloadIcon } from "@/app/_components/cv-studio-ui";
import { trackActivationEvent } from "@/app/_lib/activation-analytics-client";
import { downloadPdfFromUrl } from "@/app/_lib/pdf-download-client";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";
import { buildResumePdfDownloadUrl } from "@/app/_lib/resume-print-url";
import Link from "next/link";

export function PublicResumeFooterActions({
  pageWidth,
  showBranding,
  templateKey,
}: {
  pageWidth: number;
  showBranding: boolean;
  templateKey: TemplateKey;
}) {
  const activationMetadata = {
    surface: "public_resume_footer",
    template_key: templateKey,
  } as const;

  const handleDownloadPdf = async () => {
    const usedDedicatedPdfView = shouldUseDedicatedPrintView();
    trackActivationEvent("pdf_download_clicked", {
      ...activationMetadata,
      used_dedicated_pdf_view: usedDedicatedPdfView,
    });

    if (!usedDedicatedPdfView) {
      window.print();
      trackActivationEvent("pdf_download_succeeded", {
        ...activationMetadata,
        used_dedicated_pdf_view: false,
      });
      return;
    }

    try {
      await downloadPdfFromUrl(buildResumePdfDownloadUrl(window.location.href));
      trackActivationEvent("pdf_download_succeeded", {
        ...activationMetadata,
        used_dedicated_pdf_view: true,
      });
    } catch (error) {
      trackActivationEvent("pdf_download_failed", {
        ...activationMetadata,
        error_code: "request_failed",
        used_dedicated_pdf_view: true,
      });
      window.alert(error instanceof Error ? error.message : "Unable to download this PDF.");
    }
  };

  if (!showBranding) {
    return (
      <footer
        className="app-chrome mx-auto mt-4 flex w-full items-center justify-end pb-2 lg:mt-5 lg:pb-0 print:hidden"
        style={{ maxWidth: `${pageWidth}px` }}
      >
        <button
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 text-[0.82rem] font-medium text-slate-600 underline-offset-4 transition hover:text-slate-950 hover:underline sm:min-h-0 sm:min-w-0"
          onClick={() => void handleDownloadPdf()}
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
          onClick={() => void handleDownloadPdf()}
          type="button"
        >
          <DownloadIcon className="h-[0.92rem] w-[0.92rem]" />
          <span>PDF</span>
        </button>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <Link
          className="inline-flex min-h-11 items-center underline-offset-4 transition hover:text-slate-950 hover:underline sm:min-h-0"
          href="/new"
          onClick={() => trackActivationEvent("public_footer_create_clicked", activationMetadata)}
        >
          Create your own
        </Link>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-[#065f46] underline-offset-4 transition hover:text-[#044e34] hover:underline sm:min-h-0"
          href="/account#billing"
          onClick={() => trackActivationEvent("account_cta_clicked", {
            ...activationMetadata,
            mode: "claim_tinycv_url",
          })}
        >
          Claim your tiny.cv URL
        </Link>
      </div>
    </footer>
  );
}

function shouldUseDedicatedPrintView() {
  return window.matchMedia("(max-width: 1023px)").matches;
}
