import { notFound } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { BrowserRendererUnavailableError } from "@/app/_lib/browser-renderer";
import type { HostedResumePublicRecord } from "@/app/_lib/hosted-resume-types";
import {
  buildPublishedResumePrintUrl,
  buildResumePdfResponse,
  generateResumePdf,
} from "@/app/_lib/resume-pdf";
import { ensureResumePrintUrl } from "@/app/_lib/resume-print-url";
import {
  ApiRateLimitError,
  ApiRateLimitUnavailableError,
  assertApiRateLimit,
} from "@/app/_lib/api-rate-limit";
import { HostedResumeStoreUnavailableError } from "@/app/_lib/hosted-resume-store";

export async function renderPublicResumePdfResponse({
  request,
  renderUrl,
  resume,
}: {
  request: NextRequest;
  renderUrl: string;
  resume: HostedResumePublicRecord | null;
}) {
  try {
    await assertApiRateLimit({
      action: "api:pdf_create",
      request,
    });

    if (!resume) {
      notFound();
    }

    const pdf = await generateResumePdf({
      markdown: resume.markdown,
      renderUrl,
    });

    return buildResumePdfResponse(pdf);
  } catch (error) {
    return handlePdfDownloadError(error);
  }
}

export function buildAppHostResumeRenderUrl(request: NextRequest, resume: HostedResumePublicRecord) {
  return buildPublishedResumePrintUrl(request.nextUrl.origin, resume.slug);
}

export function buildResumeDomainRenderUrl(request: NextRequest) {
  return ensureResumePrintUrl(request.nextUrl.origin);
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
