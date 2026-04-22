import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/_lib/auth";
import { openUserResumeInWorkspace } from "@/app/_lib/account-store";
import {
  readWorkspaceCookieFromRequest,
  writeWorkspaceCookie,
} from "@/app/_lib/workspace-cookie";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/cvs/[resumeId]/open">,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  const { resumeId } = await context.params;
  const result = await openUserResumeInWorkspace({
    resumeId,
    userId: session.user.id,
    workspaceId: readWorkspaceCookieFromRequest(request),
  });

  if (!result) {
    return NextResponse.redirect(new URL("/account?error=resume-not-found", request.url));
  }

  const response = NextResponse.redirect(new URL(`/studio/${resumeId}`, request.url));
  writeWorkspaceCookie(response, result.workspaceId);
  return response;
}
