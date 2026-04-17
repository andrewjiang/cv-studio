import type { NextRequest } from "next/server";
import { publishProjectResume } from "@/app/_lib/developer-platform-store";
import type { PublishResumeRequest } from "@/app/_lib/developer-platform-types";
import {
  assertProjectRateLimit,
  createApiRequestId,
  handleDeveloperPlatformError,
  jsonError,
  requireProjectAuth,
  scheduleDeveloperPlatformBackgroundWork,
  withAbsoluteResumeUrls,
  withRequiredIdempotency,
} from "@/app/api/v1/_lib";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/v1/resumes/[resumeId]/publish">,
) {
  const requestId = createApiRequestId();

  try {
    const authenticated = await requireProjectAuth(request);
    await assertProjectRateLimit(request, "api:resume_publish", authenticated.project.id);
    const { resumeId } = await context.params;
    const body = await request.json().catch(() => ({})) as PublishResumeRequest;

    const outcome = await withRequiredIdempotency({
      buildResponseBody(result) {
        return withAbsoluteResumeUrls(request.nextUrl.origin, result.record);
      },
      execute: async () => {
        const payload = await publishProjectResume({
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
