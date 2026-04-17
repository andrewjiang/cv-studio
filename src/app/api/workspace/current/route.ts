import { NextResponse, type NextRequest } from "next/server";
import { switchWorkspaceResume } from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookieFromRequest } from "@/app/_lib/workspace-cookie";
import {
  assertWorkspaceRateLimit,
  buildResumeResponse,
  handleResumeStoreError,
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
      action: "workspace:switch",
      request,
      workspaceId,
    });

    const body = await request.json() as { resumeId?: unknown };

    if (typeof body.resumeId !== "string" || !body.resumeId) {
      return NextResponse.json(
        { error: "Expected a resumeId in the request body." },
        { status: 400 },
      );
    }

    const payload = await switchWorkspaceResume({
      resumeId: body.resumeId,
      workspaceId,
    });

    if (!payload) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    return NextResponse.json(buildResumeResponse(request, payload));
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
