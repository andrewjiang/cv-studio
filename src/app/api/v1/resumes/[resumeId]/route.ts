import type { NextRequest } from "next/server";
import {
  getProjectResume,
  updateProjectResumeDraft,
} from "@/app/_lib/developer-platform-store";
import type { UpdateResumeRequest } from "@/app/_lib/developer-platform-types";
import {
  assertProjectRateLimit,
  createApiRequestId,
  handleDeveloperPlatformError,
  jsonError,
  jsonOk,
  requireProjectAuth,
  scheduleDeveloperPlatformBackgroundWork,
  withAbsoluteResumeUrls,
  withRequiredIdempotency,
} from "@/app/api/v1/_lib";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/v1/resumes/[resumeId]">,
) {
  const requestId = createApiRequestId();

  try {
    const authenticated = await requireProjectAuth(request);
    await assertProjectRateLimit(request, "api:resume_update", authenticated.project.id);
    const { resumeId } = await context.params;
    const payload = await getProjectResume({
      projectId: authenticated.project.id,
      resumeId,
    });

    if (!payload) {
      return jsonError(requestId, 404, "not_found", "Resume not found.");
    }

    return jsonOk(withAbsoluteResumeUrls(request.nextUrl.origin, payload.record));
  } catch (error) {
    return handleDeveloperPlatformError(requestId, error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/v1/resumes/[resumeId]">,
) {
  const requestId = createApiRequestId();

  try {
    const authenticated = await requireProjectAuth(request);
    const { resumeId } = await context.params;
    const body = await request.json() as UpdateResumeRequest;

    const outcome = await withRequiredIdempotency({
      buildResponseBody(result) {
        return withAbsoluteResumeUrls(request.nextUrl.origin, result.record);
      },
      execute: async () => {
        const payload = await updateProjectResumeDraft({
          body,
          projectId: authenticated.project.id,
          resumeId,
        });

        if (!payload) {
          throw new Error("__resume_not_found__");
        }

        return {
          result: payload,
          status: 200,
        };
      },
      projectId: authenticated.project.id,
      request,
      requestBody: body,
      requestId,
    });

    if (outcome.result) {
      scheduleDeveloperPlatformBackgroundWork();
    }

    return outcome.response;
  } catch (error) {
    if (error instanceof Error && error.message === "__resume_not_found__") {
      return jsonError(requestId, 404, "not_found", "Resume not found.");
    }

    return handleDeveloperPlatformError(requestId, error);
  }
}
