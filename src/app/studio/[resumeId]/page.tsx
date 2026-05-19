import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CvStudio } from "@/app/_components/cv-studio";
import { EditorLinkAttachBridge } from "@/app/_components/editor-link-attach-bridge";
import { ResumePrintView } from "@/app/_components/resume-print-view";
import { attachWorkspaceResumeToUser } from "@/app/_lib/account-store";
import { auth } from "@/app/_lib/auth";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import {
  getStudioBootstrap,
  HostedResumeStoreUnavailableError,
  validateHostedResumeEditLink,
} from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";

export default async function HostedStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ resumeId: string }>;
  searchParams: Promise<{ autoprint?: string; print?: string; token?: string }>;
}) {
  const { resumeId } = await params;
  const { autoprint, print, token } = await searchParams;

  if (token) {
    let resume = null;

    try {
      resume = await validateHostedResumeEditLink({
        resumeId,
        token,
      });
    } catch (error) {
      if (error instanceof HostedResumeStoreUnavailableError) {
        notFound();
      }

      throw error;
    }

    if (!resume) {
      notFound();
    }

    return <EditorLinkAttachBridge resumeId={resumeId} token={token} />;
  }

  const workspaceId = await readWorkspaceCookie();

  if (!workspaceId) {
    redirect("/");
  }

  let payload = null;

  try {
    payload = await getStudioBootstrap({
      resumeId,
      workspaceId,
    });
  } catch (error) {
    if (error instanceof HostedResumeStoreUnavailableError) {
      notFound();
    }

    throw error;
  }

  if (!payload) {
    redirect("/");
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id) {
    await attachWorkspaceResumeToUser({
      resumeId,
      userId: session.user.id,
      workspaceId,
    });
  }

  const isPrintView = print === "1" || print === "true";
  const isAutoPrintView = isPrintView && (autoprint === "1" || autoprint === "true");

  if (isPrintView) {
    return (
      <ResumePrintView
        autoPrint={isAutoPrintView}
        document={parseCvMarkdown(payload.resume.markdown)}
        fitScale={payload.resume.fitScale}
      />
    );
  }

  return (
    <CvStudio
      initialPublicPath={payload.publicPath}
      initialResume={payload.resume}
      workspace={payload.workspace}
    />
  );
}
