import { notFound, redirect } from "next/navigation";
import { CvStudio } from "@/app/_components/cv-studio";
import { EditorLinkAttachBridge } from "@/app/_components/editor-link-attach-bridge";
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
  searchParams: Promise<{ token?: string }>;
}) {
  const { resumeId } = await params;
  const { token } = await searchParams;

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

  return (
    <CvStudio
      initialPublicPath={payload.publicPath}
      initialResume={payload.resume}
      workspace={payload.workspace}
    />
  );
}
