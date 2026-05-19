import "server-only";

import {
  getBrowserRenderOrigin,
  getBrowserTimeoutMs,
  resolveLocalChromeExecutablePath,
  withBrowserPage,
} from "@/app/_lib/browser-renderer";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import { ensureResumePrintUrl } from "@/app/_lib/resume-print-url";

type ResumePdfResult = {
  contentType: string;
  data: Uint8Array;
  fileName: string;
};

type BrowserPdfInput = {
  markdown: string;
  publicUrl?: string;
  renderUrl?: string;
};

export async function generateResumePdf(input: BrowserPdfInput): Promise<ResumePdfResult> {
  const document = parseCvMarkdown(input.markdown);
  const renderUrl = input.renderUrl ?? input.publicUrl;

  if (!renderUrl) {
    throw new Error("Expected a URL to render the resume PDF.");
  }

  return {
    contentType: "application/pdf",
    data: await renderResumeUrlToPdf(renderUrl),
    fileName: `${slugifyFilename(document.name || "resume")}.pdf`,
  };
}

export function buildPublishedResumePrintUrl(origin: string, slug: string) {
  const url = new URL(`/${encodeURIComponent(slug)}`, normalizeOrigin(origin));
  return ensurePublishedResumePrintUrl(url.toString());
}

export function ensurePublishedResumePrintUrl(publicUrl: string) {
  return ensureResumePrintUrl(publicUrl);
}

export const getPdfRenderOrigin = getBrowserRenderOrigin;
export { resolveLocalChromeExecutablePath };

export function buildResumePdfResponse(pdf: ResumePdfResult) {
  return new Response(new Blob([pdf.data as BlobPart], { type: pdf.contentType }), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${pdf.fileName}"`,
      "Content-Type": pdf.contentType,
    },
  });
}

async function renderResumeUrlToPdf(renderUrl: string) {
  const printUrl = ensureResumePrintUrl(renderUrl);

  return withBrowserPage(async (page) => {
    await page.setViewport({
      deviceScaleFactor: 1,
      height: 1056,
      width: 816,
    });
    await page.goto(printUrl, {
      timeout: getBrowserTimeoutMs(),
      waitUntil: "networkidle0",
    });
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      margin: {
        bottom: "0in",
        left: "0in",
        right: "0in",
        top: "0in",
      },
      preferCSSPageSize: true,
      printBackground: true,
      timeout: getBrowserTimeoutMs(),
    });

    return pdf;
  });
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function slugifyFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "resume";
}
