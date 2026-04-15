import { NextResponse, type NextRequest } from "next/server";
import { createWorkspaceBootstrap } from "@/app/_lib/hosted-resume-store";
import {
  readWorkspaceCookieFromRequest,
  writeWorkspaceCookie,
} from "@/app/_lib/workspace-cookie";
import {
  buildResumeResponse,
  handleResumeStoreError,
  parseTemplateCreateBody,
} from "@/app/api/resumes/_lib";

export async function POST(request: NextRequest) {
  try {
    const body = parseTemplateCreateBody(await request.json());

    if (!body) {
      return NextResponse.json(
        { error: "Expected a templateKey in the request body." },
        { status: 400 },
      );
    }

    const payload = await createWorkspaceBootstrap({
      templateKey: body.templateKey,
      workspaceId: readWorkspaceCookieFromRequest(request),
    });

    const response = NextResponse.json(buildResumeResponse(request, payload), { status: 201 });
    writeWorkspaceCookie(response, payload.workspace.workspaceId);
    return response;
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
