import type { NextRequest } from "next/server";
import { createProjectResumeDraft } from "@/app/_lib/developer-platform-store";
import type { CreateResumeRequest } from "@/app/_lib/developer-platform-types";
import {
  assertProjectRateLimit,
  createApiRequestId,
  handleDeveloperPlatformError,
  scheduleDeveloperPlatformBackgroundWork,
  withAbsoluteResumeUrls,
  withRequiredIdempotency,
  requireProjectAuth,
} from "@/app/api/v1/_lib";

export async function POST(request: NextRequest) {
  const requestId = createApiRequestId();

  try {
    const authenticated = await requireProjectAuth(request);
    await assertProjectRateLimit(request, "api:resume_create", authenticated.project.id);
    const body = await request.json() as CreateResumeRequest;

    const outcome = await withRequiredIdempotency({
      buildResponseBody(result) {
        return withAbsoluteResumeUrls(request.nextUrl.origin, result.record);
      },
      execute: async () => ({
        result: await createProjectResumeDraft({
          body,
          projectId: authenticated.project.id,
        }),
        status: 201,
      }),
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
    return handleDeveloperPlatformError(requestId, error);
  }
}
