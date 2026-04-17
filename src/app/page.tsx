import { TinyCvLandingPage } from "@/app/_components/tinycv-landing-page";
import { getWorkspace } from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workspaceId = await readWorkspaceCookie();
  const workspace = workspaceId ? await getWorkspace(workspaceId) : null;
  const continueEditingHref = workspace?.currentResumeId
    ? `/studio/${workspace.currentResumeId}`
    : null;

  return <TinyCvLandingPage continueEditingHref={continueEditingHref} />;
}
