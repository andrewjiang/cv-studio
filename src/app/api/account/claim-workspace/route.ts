import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/_lib/auth";
import { claimWorkspaceForUser } from "@/app/_lib/account-store";
import { readWorkspaceCookieFromRequest } from "@/app/_lib/workspace-cookie";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({
      error: "Sign in before claiming a workspace.",
    }, { status: 401 });
  }

  const workspaceId = readWorkspaceCookieFromRequest(request);

  if (!workspaceId) {
    return NextResponse.json({
      claimedCount: 0,
      currentResumeId: null,
      resumes: [],
    });
  }

  const payload = await claimWorkspaceForUser({
    userId: session.user.id,
    workspaceId,
  });

  return NextResponse.json(payload);
}
