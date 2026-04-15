import { NextResponse, type NextRequest } from "next/server";
import { getWorkspace } from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookieFromRequest } from "@/app/_lib/workspace-cookie";
import { handleResumeStoreError } from "@/app/api/resumes/_lib";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = readWorkspaceCookieFromRequest(request);

    if (!workspaceId) {
      return NextResponse.json({ workspace: null });
    }

    const workspace = await getWorkspace(workspaceId);
    return NextResponse.json({ workspace });
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
