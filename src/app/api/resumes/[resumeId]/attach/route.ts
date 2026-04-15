import { NextResponse, type NextRequest } from "next/server";
import { attachHostedResume } from "@/app/_lib/hosted-resume-store";
import {
  readWorkspaceCookieFromRequest,
  writeWorkspaceCookie,
} from "@/app/_lib/workspace-cookie";
import {
  buildResumeResponse,
  handleResumeStoreError,
  parseAttachResumeBody,
} from "@/app/api/resumes/_lib";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[resumeId]/attach">,
) {
  try {
    const { resumeId } = await context.params;
    const body = parseAttachResumeBody(await request.json());

    if (!body) {
      return NextResponse.json(
        { error: "Expected a token in the request body." },
        { status: 400 },
      );
    }

    const payload = await attachHostedResume({
      resumeId,
      token: body.token,
      workspaceId: readWorkspaceCookieFromRequest(request),
    });

    if (!payload) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const response = NextResponse.json({
      ...buildResumeResponse(request, payload),
      cleanEditorUrl: `${request.nextUrl.origin}/studio/${payload.resume.id}`,
    });
    writeWorkspaceCookie(response, payload.workspace.workspaceId);
    return response;
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
