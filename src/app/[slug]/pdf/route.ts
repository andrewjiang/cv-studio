import { type NextRequest } from "next/server";
import {
  getPublishedResumeBySlug,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";
import {
  buildAppHostResumeRenderUrl,
  renderPublicResumePdfResponse,
} from "@/app/_lib/resume-pdf-download-route";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  context: RouteContext<"/[slug]/pdf">,
) {
  const { slug } = await context.params;
  let resume = null;

  try {
    resume = await getPublishedResumeBySlug(slug);
  } catch (error) {
    if (!(error instanceof HostedResumeStoreUnavailableError)) {
      throw error;
    }
  }

  return renderPublicResumePdfResponse({
    renderUrl: resume ? buildAppHostResumeRenderUrl(request, resume) : request.nextUrl.toString(),
    request,
    resume,
  });
}
