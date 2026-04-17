import type { NextRequest } from "next/server";
import { getProjectPdfJob } from "@/app/_lib/developer-platform-store";
import {
  createApiRequestId,
  handleDeveloperPlatformError,
  jsonError,
  jsonOk,
  requireProjectAuth,
  withAbsolutePdfJobUrls,
} from "@/app/api/v1/_lib";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/v1/pdf-jobs/[jobId]">,
) {
  const requestId = createApiRequestId();

  try {
    const authenticated = await requireProjectAuth(request);
    const { jobId } = await context.params;
    const payload = await getProjectPdfJob({
      jobId,
      projectId: authenticated.project.id,
    });

    if (!payload) {
      return jsonError(requestId, 404, "not_found", "PDF job not found.");
    }

    return jsonOk(withAbsolutePdfJobUrls(request.nextUrl.origin, payload));
  } catch (error) {
    return handleDeveloperPlatformError(requestId, error);
  }
}
