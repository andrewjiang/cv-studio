import { NextResponse, type NextRequest } from "next/server";
import {
  assertSelfServeBootstrapAllowed,
  recordSelfServeBootstrapAttempt,
  SelfServeCaptchaError,
  SelfServeRateLimitError,
  verifySelfServeCaptcha,
} from "@/app/_lib/developer-platform-self-serve";
import { bootstrapDeveloperProject } from "@/app/_lib/developer-platform-store";
import {
  createApiRequestId,
  handleDeveloperPlatformError,
  jsonError,
} from "@/app/api/v1/_lib";

export async function POST(request: NextRequest) {
  const requestId = createApiRequestId();
  let requestContext: Awaited<ReturnType<typeof assertSelfServeBootstrapAllowed>> | null = null;

  try {
    requestContext = await assertSelfServeBootstrapAllowed(request);

    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name : "";
    const slug = typeof body.slug === "string" ? body.slug : undefined;
    const apiKeyLabel = typeof body.api_key_label === "string" ? body.api_key_label : undefined;
    const captchaToken = typeof body.captcha_token === "string" ? body.captcha_token : "";

    await verifySelfServeCaptcha({
      ipAddress: requestContext.ipAddress,
      token: captchaToken,
    });

    const payload = await bootstrapDeveloperProject({
      apiKeyLabel,
      name,
      slug,
    });

    await recordSelfServeBootstrapAttempt({
      fingerprintHash: requestContext.fingerprintHash,
      outcome: "success",
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (requestContext && !(error instanceof SelfServeRateLimitError)) {
      await recordSelfServeBootstrapAttempt({
        fingerprintHash: requestContext.fingerprintHash,
        outcome: error instanceof SelfServeCaptchaError ? "captcha_failed" : "failed",
      });
    }

    if (error instanceof SelfServeRateLimitError) {
      return jsonError(requestId, 429, error.code, error.message, {
        retry_after_seconds: error.retryAfterSeconds,
      });
    }

    if (error instanceof SelfServeCaptchaError) {
      return jsonError(requestId, 400, error.code, error.message, error.details);
    }

    return handleDeveloperPlatformError(requestId, error);
  }
}
