import { NextResponse, type NextRequest } from "next/server";
import { createWorkspaceResume } from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookieFromRequest } from "@/app/_lib/workspace-cookie";
import {
  assertWorkspaceRateLimit,
  buildResumeResponse,
  handleResumeStoreError,
  parseTemplateCreateBody,
} from "@/app/api/resumes/_lib";

export async function POST(request: NextRequest) {
  try {
    const workspaceId = readWorkspaceCookieFromRequest(request);

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspace cookie." },
        { status: 401 },
      );
    }

    await assertWorkspaceRateLimit({
      action: "workspace:create",
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

    const payload = await createWorkspaceResume({
      markdown: body.markdown,
      templateKey: body.templateKey,
      title: body.title,
      workspaceId,
    });

    if (!payload) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    return NextResponse.json(buildResumeResponse(request, payload), { status: 201 });
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
