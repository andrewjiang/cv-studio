import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { type NextRequest } from "next/server";
import {
  buildResumeDomainRenderUrl,
  renderPublicResumePdfResponse,
} from "@/app/_lib/resume-pdf-download-route";
import { resolveHost } from "@/app/_lib/resume-domains";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const requestHeaders = await headers();
  const hostResolution = await resolveHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );

  if (hostResolution.kind !== "resume_domain") {
    notFound();
  }

  return renderPublicResumePdfResponse({
    renderUrl: buildResumeDomainRenderUrl(request),
    request,
    resume: hostResolution.resume,
  });
}
