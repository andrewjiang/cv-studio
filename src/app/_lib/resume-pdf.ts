import "server-only";

import { access } from "node:fs/promises";
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

const LOCAL_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
] as const;

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
  url.searchParams.set("print", "1");
  return url.toString();
}

export function getPdfRenderOrigin() {
  const configuredOrigin =
    process.env.TINYCV_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_TINYCV_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return normalizeOrigin(vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`);
  }

  return `http://localhost:${process.env.PORT || "3000"}`;
}

export async function resolveLocalChromeExecutablePath() {
  const explicitPath = process.env.TINYCV_CHROME_EXECUTABLE_PATH?.trim();

  if (explicitPath) {
    await assertExecutableExists(explicitPath);
    return explicitPath;
  }

  for (const candidate of LOCAL_CHROME_CANDIDATES) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function renderPublicResumeUrlToPdf(publicUrl: string) {
  const puppeteer = await import("puppeteer-core");
  const browserWsEndpoint = getBrowserWsEndpoint();
  const browser = browserWsEndpoint
    ? await puppeteer.connect({ browserWSEndpoint: browserWsEndpoint })
    : await puppeteer.launch({
      args: [
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-setuid-sandbox",
        "--headless=new",
        "--no-sandbox",
      ],
      executablePath: await getRequiredChromeExecutablePath(),
      headless: true,
      pipe: true,
    });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      deviceScaleFactor: 1,
      height: 1056,
      width: 816,
    });
    await page.goto(publicUrl, {
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
  } finally {
    await browser.close();
  }
}

function getBrowserWsEndpoint() {
  return (
    process.env.TINYCV_BROWSER_WS_ENDPOINT?.trim() ||
    process.env.BROWSERLESS_WS_ENDPOINT?.trim() ||
    null
  );
}

async function getRequiredChromeExecutablePath() {
  const executablePath = await resolveLocalChromeExecutablePath();

  if (!executablePath) {
    throw new Error(
      "PDF rendering requires Chromium. Set TINYCV_BROWSER_WS_ENDPOINT for Browserless/CDP, or TINYCV_CHROME_EXECUTABLE_PATH for a local Chrome binary.",
    );
  }

  return executablePath;
}

function getBrowserTimeoutMs() {
  const parsed = Number(process.env.TINYCV_PDF_BROWSER_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30_000;
}

async function assertExecutableExists(path: string) {
  if (!(await pathExists(path))) {
    throw new Error(`Chrome executable not found at ${path}.`);
  }
}

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function slugifyFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "resume";
}
