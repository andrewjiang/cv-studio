import type { NextRequest } from "next/server";
import { validateResumeInput } from "@/app/_lib/developer-resume-input";
import type { ValidateResumeRequest } from "@/app/_lib/developer-platform-types";
import {
  assertProjectRateLimit,
  createApiRequestId,
  handleDeveloperPlatformError,
  jsonOk,
  requireProjectAuth,
} from "@/app/api/v1/_lib";

export async function POST(request: NextRequest) {
  const requestId = createApiRequestId();

  try {
    const authenticated = await requireProjectAuth(request);
    await assertProjectRateLimit(request, "api:validate", authenticated.project.id);
    const body = await request.json() as ValidateResumeRequest;
    return jsonOk(validateResumeInput(body));
  } catch (error) {
    return handleDeveloperPlatformError(requestId, error);
  }
}
