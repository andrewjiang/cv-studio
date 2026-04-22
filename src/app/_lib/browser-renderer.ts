import "server-only";

import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import type { Browser, Page } from "puppeteer-core";

const LOCAL_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
] as const;

export class BrowserRendererUnavailableError extends Error {
  code = "browser_fit_unavailable";

  constructor(message = "Browser rendering is unavailable.") {
    super(message);
    this.name = "BrowserRendererUnavailableError";
  }
}

export async function withBrowserPage<T>(
  callback: (page: Page) => Promise<T>,
): Promise<T> {
  const browser = await openBrowser();

  try {
    const page = await browser.newPage();
    return await callback(page);
  } finally {
    await browser.close();
  }
}

export function getBrowserRenderOrigin() {
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

export function assertBrowserRendererConfigured() {
  if (getBrowserWsEndpoint()) {
    return;
  }

  const explicitPath = process.env.TINYCV_CHROME_EXECUTABLE_PATH?.trim();

  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new BrowserRendererUnavailableError(`Chrome executable not found at ${explicitPath}.`);
    }
    return;
  }

  if (LOCAL_CHROME_CANDIDATES.some((candidate) => existsSync(candidate))) {
    return;
  }

  throw new BrowserRendererUnavailableError(
    "Browser rendering requires Chromium. Set TINYCV_BROWSER_WS_ENDPOINT for Browserless/CDP, or TINYCV_CHROME_EXECUTABLE_PATH for a local Chrome binary.",
  );
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

export function getBrowserTimeoutMs() {
  const parsed = Number(process.env.TINYCV_PDF_BROWSER_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30_000;
}

async function openBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");
  const browserWsEndpoint = getBrowserWsEndpoint();

  if (browserWsEndpoint) {
    return puppeteer.connect({ browserWSEndpoint: browserWsEndpoint });
  }

  return puppeteer.launch({
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
    throw new BrowserRendererUnavailableError(
      "Browser rendering requires Chromium. Set TINYCV_BROWSER_WS_ENDPOINT for Browserless/CDP, or TINYCV_CHROME_EXECUTABLE_PATH for a local Chrome binary.",
    );
  }

  return executablePath;
}

async function assertExecutableExists(path: string) {
  if (!(await pathExists(path))) {
    throw new BrowserRendererUnavailableError(`Chrome executable not found at ${path}.`);
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
