import { redirect } from "next/navigation";
import { WorkspaceBootstrap } from "@/app/_components/workspace-bootstrap";
import { getWorkspace } from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workspaceId = await readWorkspaceCookie();
  const workspace = workspaceId ? await getWorkspace(workspaceId) : null;

  if (workspace?.currentResumeId) {
    redirect(`/studio/${workspace.currentResumeId}`);
  }

  return <WorkspaceBootstrap allowLegacyImport={!workspaceId} />;
}
