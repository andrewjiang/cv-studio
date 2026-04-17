import { NextResponse, type NextRequest } from "next/server";
import { consumeProjectEditClaim } from "@/app/_lib/developer-platform-store";
import { readWorkspaceCookieFromRequest, writeWorkspaceCookie } from "@/app/_lib/workspace-cookie";
import {
  assertIpRateLimit,
  createApiRequestId,
  handleDeveloperPlatformError,
  jsonError,
} from "@/app/api/v1/_lib";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/v1/edit-claims/[claimId]/consume">,
) {
  const requestId = createApiRequestId();

  try {
    await assertIpRateLimit(request, "api:claim_consume");
    const { claimId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token : "";

    if (!token) {
      return jsonError(requestId, 400, "invalid_input", "Missing claim token.");
    }

    const payload = await consumeProjectEditClaim({
      claimId,
      token,
      workspaceId: readWorkspaceCookieFromRequest(request),
    });

    if (!payload) {
      return jsonError(requestId, 404, "not_found", "Claim not found.");
    }

    const response = NextResponse.json({
      cleanEditorUrl: payload.cleanEditorPath,
    });

    writeWorkspaceCookie(response, payload.workspaceId);
    return response;
  } catch (error) {
    return handleDeveloperPlatformError(requestId, error);
  }
}
