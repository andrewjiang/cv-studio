import "server-only";

import {
  getBrowserRenderOrigin,
  getBrowserTimeoutMs,
  resolveLocalChromeExecutablePath,
  withBrowserPage,
} from "@/app/_lib/browser-renderer";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";

type ResumePdfResult = {
  contentType: string;
  data: Uint8Array;
  fileName: string;
};

type BrowserPdfInput = {
  markdown: string;
  publicUrl: string;
};

export async function generateResumePdf(input: BrowserPdfInput): Promise<ResumePdfResult> {
  const document = parseCvMarkdown(input.markdown);

  return {
    contentType: "application/pdf",
    data: await renderPublicResumeUrlToPdf(input.publicUrl),
    fileName: `${slugifyFilename(document.name || "resume")}.pdf`,
  };
}

export function buildPublishedResumePrintUrl(origin: string, slug: string) {
  const url = new URL(`/${encodeURIComponent(slug)}`, normalizeOrigin(origin));
  return ensurePublishedResumePrintUrl(url.toString());
}

export function ensurePublishedResumePrintUrl(publicUrl: string) {
  const url = new URL(publicUrl);
  url.searchParams.set("print", "1");
  return url.toString();
}

export const getPdfRenderOrigin = getBrowserRenderOrigin;
export { resolveLocalChromeExecutablePath };

async function renderPublicResumeUrlToPdf(publicUrl: string) {
  const printUrl = ensurePublishedResumePrintUrl(publicUrl);

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
