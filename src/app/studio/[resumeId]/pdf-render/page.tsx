import { notFound } from "next/navigation";
import { ResumePrintView } from "@/app/_components/resume-print-view";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import {
  getStudioBootstrap,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";
import { isStudioPdfRenderTokenValid } from "@/app/_lib/resume-pdf-render-token";

export const dynamic = "force-dynamic";

export default async function StudioPdfRenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ resumeId: string }>;
  searchParams: Promise<{ expires?: string; token?: string; workspace?: string }>;
}) {
  const { resumeId } = await params;
  const { expires, token, workspace } = await searchParams;

  if (
    !workspace ||
    !expires ||
    !isStudioPdfRenderTokenValid({
      expiresAt: expires,
      resumeId,
      token,
      workspaceId: workspace,
    })
  ) {
    notFound();
  }

  let payload = null;

  try {
    payload = await getStudioBootstrap({
      resumeId,
      workspaceId: workspace,
    });
  } catch (error) {
    if (error instanceof HostedResumeStoreUnavailableError) {
      notFound();
    }

    throw error;
  }

  if (!payload) {
    notFound();
  }

  return (
    <ResumePrintView
      document={parseCvMarkdown(payload.resume.markdown)}
      fitScale={payload.resume.fitScale}
    />
  );
}
