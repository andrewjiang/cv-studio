import "server-only";

import { getBrowserTimeoutMs, withBrowserPage } from "@/app/_lib/browser-renderer";
import type { HostedResumePublicRecord } from "@/app/_lib/hosted-resume-types";

export const SOCIAL_CARD_CONTENT_TYPE = "image/png";

/** Open Graph's 1.91:1 landscape card, rendered at 2x for high density displays. */
export const SOCIAL_CARD_LAYOUT = {
  deviceScaleFactor: 2,
  height: 630,
  width: 1200,
} as const;

export const SOCIAL_CARD_IMAGE_SIZE = {
  height: SOCIAL_CARD_LAYOUT.height * SOCIAL_CARD_LAYOUT.deviceScaleFactor,
  width: SOCIAL_CARD_LAYOUT.width * SOCIAL_CARD_LAYOUT.deviceScaleFactor,
} as const;

/**
 * How far the 8.5in page is scaled up on the card. It leaves a ~110px gutter on
 * each side, and the page runs off the bottom edge so the card shows the top of
 * the resume at a readable size rather than a shrunken whole page.
 */
export const SOCIAL_CARD_PAGE_SCALE = 1.2;

export function buildResumeSocialCardPath(resume: HostedResumePublicRecord) {
  return `/${encodeURIComponent(resume.slug)}/social-card?v=${buildSocialCardVersion(resume)}`;
}

export function buildResumeSocialCardRenderUrl(origin: string, slug: string) {
  return new URL(
    `/internal/social-card/${encodeURIComponent(slug)}`,
    origin.replace(/\/+$/, ""),
  ).toString();
}

export async function renderResumeSocialCard(renderUrl: string) {
  return await withBrowserPage(async (page) => {
    await page.setViewport({
      deviceScaleFactor: SOCIAL_CARD_LAYOUT.deviceScaleFactor,
      height: SOCIAL_CARD_LAYOUT.height,
      width: SOCIAL_CARD_LAYOUT.width,
    });
    await page.goto(renderUrl, {
      timeout: getBrowserTimeoutMs(),
      waitUntil: "networkidle0",
    });
    await page.evaluate(() => window.document.fonts.ready.then(() => undefined));

    return await page.screenshot({
      captureBeyondViewport: false,
      type: "png",
    });
  });
}

function buildSocialCardVersion(resume: HostedResumePublicRecord) {
  const timestamp = Date.parse(resume.publishedAt ?? resume.updatedAt);

  return Number.isFinite(timestamp) ? timestamp.toString(36) : "1";
}
