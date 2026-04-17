import { NextResponse, type NextRequest } from "next/server";
import { bootstrapDeveloperProject } from "@/app/_lib/developer-platform-store";
import {
  assertIpRateLimit,
  createApiRequestId,
  handleDeveloperPlatformError,
  requireBootstrapAuthorization,
} from "@/app/api/v1/_lib";

export async function POST(request: NextRequest) {
  const requestId = createApiRequestId();

  try {
    requireBootstrapAuthorization(request);
    await assertIpRateLimit(request, "api:project_bootstrap");
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name : "";
    const slug = typeof body.slug === "string" ? body.slug : undefined;
    const apiKeyLabel = typeof body.api_key_label === "string" ? body.api_key_label : undefined;

    const payload = await bootstrapDeveloperProject({
      apiKeyLabel,
      name,
      slug,
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return handleDeveloperPlatformError(requestId, error);
  }
}
