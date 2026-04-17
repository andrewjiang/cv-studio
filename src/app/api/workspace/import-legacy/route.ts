import { NextResponse, type NextRequest } from "next/server";
import { importLegacyWorkspaceDrafts } from "@/app/_lib/hosted-resume-store";
import {
  readWorkspaceCookieFromRequest,
  writeWorkspaceCookie,
} from "@/app/_lib/workspace-cookie";
import {
  assertWorkspaceRateLimit,
  handleResumeStoreError,
} from "@/app/api/resumes/_lib";

function parseImportLegacyBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;

  if (!Array.isArray(value.drafts)) {
    return null;
  }

  const drafts = value.drafts
    .filter((draft): draft is Record<string, unknown> => typeof draft === "object" && draft !== null)
    .map((draft) => ({
      editorToken: typeof draft.editorToken === "string" ? draft.editorToken : undefined,
      markdown: typeof draft.markdown === "string" ? draft.markdown : "",
      name: typeof draft.name === "string" ? draft.name : "Imported CV",
      remoteResumeId: typeof draft.remoteResumeId === "string" ? draft.remoteResumeId : undefined,
      updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : new Date().toISOString(),
    }))
    .filter((draft) => draft.markdown.trim().length > 0);

  return {
    activeDraftName: typeof value.activeDraftName === "string" ? value.activeDraftName : null,
    drafts,
  };
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = readWorkspaceCookieFromRequest(request);
    await assertWorkspaceRateLimit({
      action: "workspace:import_legacy",
      request,
      workspaceId,
    });

    const body = parseImportLegacyBody(await request.json());

    if (!body) {
      return NextResponse.json(
        { error: "Expected a drafts array in the request body." },
        { status: 400 },
      );
    }

    const payload = await importLegacyWorkspaceDrafts({
      activeDraftName: body.activeDraftName,
      drafts: body.drafts,
      workspaceId,
    });

    const response = NextResponse.json(payload, { status: 201 });
    writeWorkspaceCookie(response, payload.workspace.workspaceId);
    return response;
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
