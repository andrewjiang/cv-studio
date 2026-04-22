import { NextResponse, type NextRequest } from "next/server";
import { assertBrowserRendererConfigured } from "@/app/_lib/browser-renderer";
import { parseIdempotencyKey } from "@/app/_lib/developer-platform-auth";
import {
  createProjectResumeDraft,
  DeveloperPlatformConflictError,
  DeveloperPlatformValidationError,
  getCompletedIdempotentProjectRequest,
  publishProjectResume,
} from "@/app/_lib/developer-platform-store";
import type { CreateResumeRequest, PaidCreateResumeResponse } from "@/app/_lib/developer-platform-types";
import {
  assertMachinePaymentsConfigured,
  ensureMachinePaymentStorage,
  getMachinePaymentRouteDefinition,
  MACHINE_PAYMENT_PROTOCOLS,
  MACHINE_PAYMENT_ROUTE_KEYS,
  maybeCreateMachinePaymentDiscoveryChallenge,
  normalizePaidCreateResumeRequest,
  requireMachinePayment,
  runPaidIdempotentMutation,
  stableRequestHash,
} from "@/app/_lib/machine-payments";
import {
  assertIpRateLimit,
  createApiRequestId,
  handleDeveloperPlatformError,
  scheduleDeveloperPlatformBackgroundWork,
  withAbsoluteResumeUrls,
} from "@/app/api/v1/_lib";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createApiRequestId();

  try {
    const config = assertMachinePaymentsConfigured();
    const route = {
      ...getMachinePaymentRouteDefinition(MACHINE_PAYMENT_ROUTE_KEYS.CREATE_AND_PUBLISH_RESUME, config),
      operation: `${request.method}:${request.nextUrl.pathname}`,
    };
    const idempotencyKey = parseIdempotencyKey(request);

    await assertIpRateLimit(request, "api:resume_create");

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

    const body = normalizePaidCreateResumeRequest(await parseJsonBody(request));
    const requestHash = stableRequestHash(body);

    await ensureMachinePaymentStorage(config);

    const completed = await getCompletedIdempotentProjectRequest({
      idempotencyKey,
      operation: route.operation,
      projectId: config.projectId,
      requestHash,
    });

    if (completed) {
      return replayResponse(completed.responseBody, completed.statusCode);
    }

    assertBrowserRendererConfigured();

    let executed = false;
    let receiptResumeId: string | null = null;
    const response = await requireMachinePayment({
      handler: async () => {
        const mutation = await runPaidIdempotentMutation({
          buildResponseBody(result) {
            const responseBody = {
              payment: {
                benefits: [
                  "standard_hosted_url",
                  "claimable_edit_link",
                  "payment_receipt",
                ],
                charged_amount_usd: route.priceUsd,
                premium_url_included: false,
                product: "agent_publish",
                protocols_supported: [...MACHINE_PAYMENT_PROTOCOLS] as ["x402", "mpp"],
              },
              resume: withAbsoluteResumeUrls(request.nextUrl.origin, result.record),
            } satisfies PaidCreateResumeResponse;

            return responseBody;
          },
          execute: async () => {
            const draftBody = {
              ...body,
              return_edit_claim_url: false,
            } as CreateResumeRequest;
            const draft = await createProjectResumeDraft({
              attachedVia: "machine_payment_create",
              body: draftBody,
              createdVia: "machine_payment",
              projectId: config.projectId,
            });
            const published = await publishProjectResume({
              body: {
                return_edit_claim_url: body.return_edit_claim_url ?? true,
              },
              projectId: config.projectId,
              resumeId: draft.record.resume_id,
            });

            if (!published) {
              throw new Error("Created paid resume could not be published.");
            }

            executed = true;
            receiptResumeId = published.record.resume_id;

            return {
              result: published,
              status: 201,
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
      receiptResourceIds: () => ({ resumeId: receiptResumeId }),
      request,
      requestHash,
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

async function parseJsonBody(request: NextRequest) {
  try {
    return await request.clone().json();
  } catch {
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
