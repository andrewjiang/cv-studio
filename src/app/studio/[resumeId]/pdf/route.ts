import { type NextRequest, NextResponse } from "next/server";
import { BrowserRendererUnavailableError } from "@/app/_lib/browser-renderer";
import {
  getStudioBootstrap,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";
import {
  buildResumePdfResponse,
  generateResumePdf,
} from "@/app/_lib/resume-pdf";
import { buildStudioPdfRenderToken } from "@/app/_lib/resume-pdf-render-token";
import { readWorkspaceCookieFromRequest } from "@/app/_lib/workspace-cookie";
import {
  ApiRateLimitError,
  ApiRateLimitUnavailableError,
} from "@/app/_lib/api-rate-limit";
import {
  assertWorkspaceRateLimit,
  handleResumeStoreError,
} from "@/app/api/resumes/_lib";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  context: RouteContext<"/studio/[resumeId]/pdf">,
) {
  try {
    const workspaceId = readWorkspaceCookieFromRequest(request);

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspace cookie." }, { status: 401 });
    }

    await assertWorkspaceRateLimit({
      action: "api:pdf_create",
      request,
      workspaceId,
    });

    const { resumeId } = await context.params;
    const payload = await getStudioBootstrap({ resumeId, workspaceId });

    if (!payload) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 5).toISOString();
    const renderUrl = new URL(`/studio/${encodeURIComponent(resumeId)}/pdf-render`, request.nextUrl.origin);
    renderUrl.searchParams.set("workspace", workspaceId);
    renderUrl.searchParams.set("expires", expiresAt);
    renderUrl.searchParams.set("token", buildStudioPdfRenderToken({
      expiresAt,
      resumeId,
      workspaceId,
    }));

    const pdf = await generateResumePdf({
      markdown: payload.resume.markdown,
      renderUrl: renderUrl.toString(),
    });

    return buildResumePdfResponse(pdf);
  } catch (error) {
    return handleStudioPdfError(error);
  }
}

function handleStudioPdfError(error: unknown) {
  if (
    error instanceof ApiRateLimitError ||
    error instanceof ApiRateLimitUnavailableError ||
    error instanceof HostedResumeStoreUnavailableError
  ) {
    return handleResumeStoreError(error);
  }

  if (error instanceof BrowserRendererUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }

  throw error;
}
