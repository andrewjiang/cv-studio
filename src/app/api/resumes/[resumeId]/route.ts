import { NextResponse, type NextRequest } from "next/server";
import {
  deleteWorkspaceResume,
  getStudioBootstrap,
  renameWorkspaceResume,
  saveWorkspaceResume,
} from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookieFromRequest } from "@/app/_lib/workspace-cookie";
import {
  assertWorkspaceRateLimit,
  buildResumeResponse,
  handleResumeStoreError,
  parseResumeMutationBody,
  parseResumeRenameBody,
} from "@/app/api/resumes/_lib";

function getWorkspaceIdOrResponse(request: NextRequest) {
  const workspaceId = readWorkspaceCookieFromRequest(request);

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Missing workspace cookie." },
      { status: 401 },
    );
  }

  return workspaceId;
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[resumeId]">,
) {
  try {
    const workspaceId = getWorkspaceIdOrResponse(request);

    if (workspaceId instanceof NextResponse) {
      return workspaceId;
    }

    const { resumeId } = await context.params;
    const payload = await getStudioBootstrap({ resumeId, workspaceId });

    if (!payload) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    return NextResponse.json(buildResumeResponse(request, payload));
  } catch (error) {
    return handleResumeStoreError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[resumeId]">,
) {
  try {
    const workspaceId = getWorkspaceIdOrResponse(request);

    if (workspaceId instanceof NextResponse) {
      return workspaceId;
    }

    await assertWorkspaceRateLimit({
      action: "workspace:rename",
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

    const payload = await saveWorkspaceResume({
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

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[resumeId]">,
) {
  try {
    const workspaceId = getWorkspaceIdOrResponse(request);

    if (workspaceId instanceof NextResponse) {
      return workspaceId;
    }

    await assertWorkspaceRateLimit({
      action: "workspace:delete",
      request,
      workspaceId,
    });

    const { resumeId } = await context.params;
    const body = parseResumeRenameBody(await request.json());

    if (!body) {
      return NextResponse.json(
        { error: "Expected a non-empty title in the request body." },
        { status: 400 },
      );
    }

    const payload = await renameWorkspaceResume({
      resumeId,
      title: body.title,
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

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[resumeId]">,
) {
  try {
    const workspaceId = getWorkspaceIdOrResponse(request);

    if (workspaceId instanceof NextResponse) {
      return workspaceId;
    }

    const { resumeId } = await context.params;
    const payload = await deleteWorkspaceResume({ resumeId, workspaceId });

    if (!payload) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    return NextResponse.json({
      currentResumeId: payload.currentResumeId,
      redirectPath: payload.currentResumeId ? `/studio/${payload.currentResumeId}` : "/",
      workspace: payload.workspace,
    });
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
