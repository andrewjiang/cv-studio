import { NextResponse, type NextRequest } from "next/server";
import {
  ApiRateLimitError,
  ApiRateLimitUnavailableError,
  assertApiRateLimit,
} from "@/app/_lib/api-rate-limit";
import { BrowserRendererUnavailableError } from "@/app/_lib/browser-renderer";
import {
  getPublishedResumeBySlug,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";
import {
  buildResumeSocialCardRenderUrl,
  renderResumeSocialCard,
  SOCIAL_CARD_CONTENT_TYPE,
} from "@/app/_lib/resume-social-card";
import { TINYCV_SOCIAL_CARD_PATH } from "@/app/_lib/site-metadata";

export const maxDuration = 60;

const CARD_CACHE_CONTROL = "public, max-age=3600, s-maxage=604800, stale-while-revalidate=604800";
const FALLBACK_CACHE_CONTROL = "public, max-age=60, s-maxage=300";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/[slug]/social-card">,
) {
  const { slug } = await context.params;

  try {
    await assertApiRateLimit({ action: "social:card", request });

    const resume = await getPublishedResumeBySlug(slug);

    if (!resume) {
      return buildFallbackCardResponse(request);
    }

    const card = await renderResumeSocialCard(
      buildResumeSocialCardRenderUrl(request.nextUrl.origin, resume.slug),
    );

    return new Response(card as BodyInit, {
      headers: {
        "Cache-Control": CARD_CACHE_CONTROL,
        "Content-Type": SOCIAL_CARD_CONTENT_TYPE,
      },
    });
  } catch (error) {
    if (isRecoverableCardError(error)) {
      return buildFallbackCardResponse(request);
    }

    throw error;
  }
}

/**
 * A link preview should never look broken, so anything that stops us rendering
 * the resume itself falls back to the generic Tiny CV card.
 */
function buildFallbackCardResponse(request: NextRequest) {
  return NextResponse.redirect(new URL(TINYCV_SOCIAL_CARD_PATH, request.nextUrl.origin), {
    headers: { "Cache-Control": FALLBACK_CACHE_CONTROL },
    status: 307,
  });
}

function isRecoverableCardError(error: unknown) {
  return (
    error instanceof ApiRateLimitError ||
    error instanceof ApiRateLimitUnavailableError ||
    error instanceof BrowserRendererUnavailableError ||
    error instanceof HostedResumeStoreUnavailableError
  );
}
