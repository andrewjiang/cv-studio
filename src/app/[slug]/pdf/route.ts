import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { BrowserRendererUnavailableError } from "@/app/_lib/browser-renderer";
import {
  getPublishedResumeBySlug,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";
import {
  buildPublishedResumePrintUrl,
  buildResumePdfResponse,
  generateResumePdf,
} from "@/app/_lib/resume-pdf";
import {
  ApiRateLimitError,
  ApiRateLimitUnavailableError,
  assertApiRateLimit,
} from "@/app/_lib/api-rate-limit";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  context: RouteContext<"/[slug]/pdf">,
) {
  try {
    await assertApiRateLimit({
      action: "api:pdf_create",
      request,
    });

    const { slug } = await context.params;
    const resume = await getPublishedResumeBySlug(slug);

    if (!resume) {
      notFound();
    }

    const pdf = await generateResumePdf({
      markdown: resume.markdown,
      renderUrl: buildPublishedResumePrintUrl(request.nextUrl.origin, resume.slug),
    });

    return buildResumePdfResponse(pdf);
  } catch (error) {
    return handlePdfDownloadError(error);
  }
}

function handlePdfDownloadError(error: unknown) {
  if (error instanceof ApiRateLimitError) {
    return NextResponse.json(
      {
        error: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
      },
      {
        headers: {
          "Retry-After": String(error.retryAfterSeconds),
        },
        status: 429,
      },
    );
  }

  if (
    error instanceof ApiRateLimitUnavailableError ||
    error instanceof BrowserRendererUnavailableError ||
    error instanceof HostedResumeStoreUnavailableError
  ) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }

  throw error;
}
