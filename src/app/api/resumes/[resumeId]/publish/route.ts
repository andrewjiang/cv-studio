import { NextResponse, type NextRequest } from "next/server";
import { publishWorkspaceResume } from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookieFromRequest } from "@/app/_lib/workspace-cookie";
import {
  assertWorkspaceRateLimit,
  buildResumeResponse,
  handleResumeStoreError,
  parseResumeMutationBody,
} from "@/app/api/resumes/_lib";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[resumeId]/publish">,
) {
  try {
    const workspaceId = readWorkspaceCookieFromRequest(request);

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspace cookie." },
        { status: 401 },
      );
    }

    await assertWorkspaceRateLimit({
      action: "workspace:publish",
      request,
      workspaceId,
    });

    const { resumeId } = await context.params;
    const body = parseResumeMutationBody(await request.json());

    if (!body) {
      return NextResponse.json(
        { error: "Expected markdown and fitScale in the request body." },
        { status: 400 },
      );
    }

    const payload = await publishWorkspaceResume({
      fitScale: body.fitScale,
      markdown: body.markdown,
      resumeId,
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
