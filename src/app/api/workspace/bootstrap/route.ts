import { NextResponse, type NextRequest } from "next/server";
import { createWorkspaceBootstrap } from "@/app/_lib/hosted-resume-store";
import { recordUsageEvent } from "@/app/_lib/usage-events";
import {
  readWorkspaceCookieFromRequest,
  writeWorkspaceCookie,
} from "@/app/_lib/workspace-cookie";
import {
  assertWorkspaceRateLimit,
  buildResumeResponse,
  handleResumeStoreError,
  parseTemplateCreateBody,
} from "@/app/api/resumes/_lib";

export async function POST(request: NextRequest) {
  try {
    const workspaceId = readWorkspaceCookieFromRequest(request);
    await assertWorkspaceRateLimit({
      action: "workspace:bootstrap",
      request,
      workspaceId,
    });
    const body = parseTemplateCreateBody(await request.json());

    if (!body) {
      return NextResponse.json(
        { error: "Expected a templateKey in the request body." },
        { status: 400 },
      );
    }

    const payload = await createWorkspaceBootstrap({
      templateKey: body.templateKey,
      workspaceId,
    });

    const metadata = {
      surface: "new_resume",
      template_key: body.templateKey,
      workspace_id: payload.workspace.workspaceId,
    };

    await recordUsageEvent({
      action: "workspace_bootstrap_created",
      metadata,
    });
    await recordUsageEvent({
      action: "cv_create_start",
      metadata,
    });

    const response = NextResponse.json(buildResumeResponse(request, payload), { status: 201 });
    writeWorkspaceCookie(response, payload.workspace.workspaceId);
    return response;
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
