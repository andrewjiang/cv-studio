import { randomUUID } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import {
  ApiRateLimitError,
  ApiRateLimitUnavailableError,
  assertApiRateLimit,
  type ApiRateLimitAction,
} from "@/app/_lib/api-rate-limit";
import {
  DeveloperPlatformConfigurationError,
  parseIdempotencyKey,
  parseBearerToken,
  sha256,
} from "@/app/_lib/developer-platform-auth";
import {
  authenticateDeveloperProject,
  DeveloperPlatformAuthError,
  DeveloperPlatformConflictError,
  DeveloperPlatformNotFoundError,
  DeveloperPlatformStateError,
  DeveloperPlatformUnavailableError,
  DeveloperPlatformValidationError,
  fulfillIdempotentProjectRequest,
  processDeveloperPlatformBackgroundWork,
  reserveIdempotentProjectRequest,
} from "@/app/_lib/developer-platform-store";
import type { ApiErrorShape, ApiResumeRecord, PdfJobResponse } from "@/app/_lib/developer-platform-types";

export async function requireProjectAuth(request: NextRequest) {
  const token = parseBearerToken(request);

  if (!token) {
    throw new DeveloperPlatformAuthError("Missing bearer token.");
  }

  const authenticated = await authenticateDeveloperProject(token);

  if (!authenticated) {
    throw new DeveloperPlatformAuthError();
  }

  return authenticated;
}

export async function assertProjectRateLimit(
  request: NextRequest,
  action: ApiRateLimitAction,
  projectId: string,
) {
  await assertApiRateLimit({
    action,
    projectId,
    request,
  });
}

export async function assertIpRateLimit(
  request: NextRequest,
  action: ApiRateLimitAction,
) {
  await assertApiRateLimit({
    action,
    request,
  });
}

export function requireBootstrapAuthorization(request: NextRequest) {
  const secret = process.env.TINYCV_PLATFORM_BOOTSTRAP_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    throw new DeveloperPlatformAuthError("Project bootstrap is not configured.");
  }

  const headerSecret = request.headers.get("x-tinycv-bootstrap-secret")?.trim();
  const bearer = parseBearerToken(request);

  if (headerSecret === secret || bearer === secret) {
    return;
  }

  throw new DeveloperPlatformAuthError("Invalid bootstrap secret.");
}

export function createApiRequestId() {
  return randomUUID();
}

export function jsonOk(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export function jsonError(
  requestId: string,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json({
    error: {
      code,
      details,
      message,
      request_id: requestId,
    },
  } satisfies ApiErrorShape, {
    status,
  });
}

export function handleDeveloperPlatformError(requestId: string, error: unknown) {
  if (error instanceof ApiRateLimitError) {
    return NextResponse.json({
      error: {
        code: error.code,
        details: {
          retry_after_seconds: error.retryAfterSeconds,
        },
        message: error.message,
        request_id: requestId,
      },
    } satisfies ApiErrorShape, {
      headers: {
        "Retry-After": String(error.retryAfterSeconds),
      },
      status: 429,
    });
  }

  if (error instanceof ApiRateLimitUnavailableError) {
    return jsonError(requestId, 503, error.code, error.message);
  }

  if (error instanceof DeveloperPlatformUnavailableError) {
    return jsonError(requestId, 503, "service_unavailable", error.message);
  }

  if (error instanceof DeveloperPlatformConfigurationError) {
    return jsonError(requestId, 503, error.code, error.message);
  }

  if (error instanceof DeveloperPlatformAuthError) {
    return jsonError(requestId, 401, error.code, error.message);
  }

  if (error instanceof DeveloperPlatformValidationError) {
    return jsonError(requestId, 400, error.code, error.message, {
      errors: error.errors,
      warnings: error.warnings,
    });
  }

  if (error instanceof DeveloperPlatformConflictError) {
    const status = error.code === "missing_idempotency_key" ? 400 : 409;
    return jsonError(requestId, status, error.code, error.message, error.details);
  }

  if (error instanceof DeveloperPlatformStateError) {
    const status = error.code === "not_published" ? 409 : 400;
    return jsonError(requestId, status, error.code, error.message);
  }

  if (error instanceof DeveloperPlatformNotFoundError) {
    return jsonError(requestId, 404, error.code, error.message);
  }

  throw error;
}

export async function withRequiredIdempotency<T extends object>(input: {
  buildResponseBody: (result: T) => object;
  execute: () => Promise<{ result: T; status: number }>;
  request: NextRequest;
  requestBody: unknown;
  requestId: string;
  projectId: string;
}) {
  const idempotencyKey = parseIdempotencyKey(input.request);
  const operation = `${input.request.method}:${input.request.nextUrl.pathname}`;

  if (!idempotencyKey) {
    throw new DeveloperPlatformConflictError(
      "missing_idempotency_key",
      "Idempotency-Key header is required for this endpoint.",
    );
  }

  const reservation = await reserveIdempotentProjectRequest({
    idempotencyKey,
    operation,
    projectId: input.projectId,
    requestHash: sha256(JSON.stringify(input.requestBody)),
  });

  if (reservation.status === "replay") {
    return {
      response: NextResponse.json(reservation.responseBody, {
        status: reservation.statusCode,
      }),
      result: null,
    };
  }

  const executed = await input.execute();
  const responseBody = input.buildResponseBody(executed.result);

  await fulfillIdempotentProjectRequest({
    idempotencyKey,
    operation,
    projectId: input.projectId,
    responseBody,
    statusCode: executed.status,
  });

  return {
    response: jsonOk(responseBody, executed.status),
    result: executed.result,
  };
}

export function withAbsoluteResumeUrls(origin: string, record: ApiResumeRecord): ApiResumeRecord {
  const editorClaimUrl = absolutizeMaybe(origin, record.editor_claim_url);

  return {
    ...record,
    pdf_url: absolutizeMaybe(origin, record.pdf_url),
    public_url: absolutizeMaybe(origin, record.public_url),
    ...(editorClaimUrl ? { editor_claim_url: editorClaimUrl } : {}),
  };
}

export function withAbsolutePdfJobUrls(origin: string, record: PdfJobResponse): PdfJobResponse {
  return {
    ...record,
    pdf_url: absolutizeMaybe(origin, record.pdf_url),
  };
}

export function absolutizeMaybe(origin: string, value: string | null | undefined) {
  if (!value) {
    return value ?? null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${origin}${value}`;
}

export function scheduleDeveloperPlatformBackgroundWork() {
  after(async () => {
    try {
      await processDeveloperPlatformBackgroundWork();
    } catch (error) {
      console.error("Tiny CV developer background work failed.", error);
    }
  });
}
