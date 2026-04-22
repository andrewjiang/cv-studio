import { NextResponse, type NextRequest } from "next/server";
import { parseIdempotencyKey } from "@/app/_lib/developer-platform-auth";
import {
  createProjectPdfJob,
  DeveloperPlatformConflictError,
  DeveloperPlatformValidationError,
  getCompletedIdempotentProjectRequest,
  getProjectResume,
} from "@/app/_lib/developer-platform-store";
import type { CreatePdfJobRequest } from "@/app/_lib/developer-platform-types";
import {
  assertMachinePaymentsConfigured,
  ensureMachinePaymentStorage,
  getMachinePaymentRouteDefinition,
  MACHINE_PAYMENT_ROUTE_KEYS,
  maybeCreateMachinePaymentDiscoveryChallenge,
  normalizePaidCreatePdfJobRequest,
  requireMachinePayment,
  runPaidIdempotentMutation,
  stableRequestHash,
} from "@/app/_lib/machine-payments";
import {
  assertIpRateLimit,
  createApiRequestId,
  handleDeveloperPlatformError,
  jsonError,
  scheduleDeveloperPlatformBackgroundWork,
  withAbsolutePdfJobUrls,
} from "@/app/api/v1/_lib";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/v1/paid/resumes/[resumeId]/pdf-jobs">,
) {
  const requestId = createApiRequestId();

  try {
    const config = assertMachinePaymentsConfigured();
    const route = {
      ...getMachinePaymentRouteDefinition(MACHINE_PAYMENT_ROUTE_KEYS.CREATE_PDF_JOB, config),
      operation: `${request.method}:${request.nextUrl.pathname}`,
    };
    const idempotencyKey = parseIdempotencyKey(request);

    await assertIpRateLimit(request, "api:pdf_create");

    const discoveryChallenge = await maybeCreateMachinePaymentDiscoveryChallenge({
      idempotencyKey,
      request,
      route,
    });

    if (discoveryChallenge) {
      return discoveryChallenge;
    }

    if (!idempotencyKey) {
      throw new DeveloperPlatformConflictError(
        "missing_idempotency_key",
        "Idempotency-Key header is required for this endpoint.",
      );
    }

    const { resumeId } = await context.params;
    const body = normalizePaidCreatePdfJobRequest(await parseOptionalJsonBody(request));
    const requestHash = stableRequestHash(body);

    await ensureMachinePaymentStorage(config);

    const resume = await getProjectResume({
      projectId: config.projectId,
      resumeId,
    });

    if (!resume) {
      return jsonError(requestId, 404, "not_found", "Resume not found.");
    }

    const completed = await getCompletedIdempotentProjectRequest({
      idempotencyKey,
      operation: route.operation,
      projectId: config.projectId,
      requestHash,
    });

    if (completed) {
      return replayResponse(completed.responseBody, completed.statusCode);
    }

    let executed = false;
    let receiptPdfJobId: string | null = null;
    const response = await requireMachinePayment({
      handler: async () => {
        const mutation = await runPaidIdempotentMutation({
          buildResponseBody(result) {
            return withAbsolutePdfJobUrls(request.nextUrl.origin, result);
          },
          execute: async () => {
            const payload = await createProjectPdfJob({
              body: body as CreatePdfJobRequest,
              idempotencyKey,
              projectId: config.projectId,
              resumeId,
            });

            if (!payload) {
              throw new Error("Paid resume not found.");
            }

            executed = true;
            receiptPdfJobId = payload.job_id;

            return {
              result: payload,
              status: 202,
            };
          },
          idempotencyKey,
          operation: route.operation,
          projectId: config.projectId,
          requestHash,
        });
        const nextResponse = NextResponse.json(mutation.responseBody, {
          status: mutation.statusCode,
        });

        if (mutation.replay) {
          nextResponse.headers.set("X-TinyCV-Idempotency-Replay", "true");
        }

        return nextResponse;
      },
      idempotencyKey,
      receiptResourceIds: () => ({ pdfJobId: receiptPdfJobId, resumeId }),
      request,
      requestHash,
      resumeId,
      route,
    });

    if (executed) {
      scheduleDeveloperPlatformBackgroundWork();
    }

    return response;
  } catch (error) {
    return handleDeveloperPlatformError(requestId, error);
  }
}

async function parseOptionalJsonBody(request: NextRequest) {
  try {
    return await request.clone().json();
  } catch {
    if (request.headers.get("content-length") === "0" || !request.headers.get("content-length")) {
      return {};
    }

    throw new DeveloperPlatformValidationError("Request body must be valid JSON.", {
      errors: [{
        code: "invalid_json",
        message: "Request body must be valid JSON.",
      }],
    });
  }
}

function replayResponse(responseBody: unknown, statusCode: number) {
  const response = NextResponse.json(responseBody, {
    status: statusCode,
  });
  response.headers.set("X-TinyCV-Idempotency-Replay", "true");
  return response;
}
