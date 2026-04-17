import type { NextRequest } from "next/server";
import { parseBearerToken } from "@/app/_lib/developer-platform-auth";
import { processDeveloperPlatformBackgroundWork } from "@/app/_lib/developer-platform-store";
import {
  createApiRequestId,
  handleDeveloperPlatformError,
  jsonError,
  jsonOk,
} from "@/app/api/v1/_lib";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return processJobsRequest(request);
}

export async function GET(request: NextRequest) {
  return processJobsRequest(request);
}

async function processJobsRequest(request: NextRequest) {
  const requestId = createApiRequestId();

  try {
    const allowedSecrets = getAllowedWorkerSecrets();

    if (allowedSecrets.length === 0 && process.env.NODE_ENV === "production") {
      return jsonError(requestId, 503, "service_unavailable", "Worker processing is not configured.");
    }

    if (allowedSecrets.length > 0) {
      const headerSecret = request.headers.get("x-tinycv-worker-secret")?.trim();
      const bearer = parseBearerToken(request);

      if (!allowedSecrets.includes(headerSecret || "") && !allowedSecrets.includes(bearer || "")) {
        return jsonError(requestId, 401, "unauthorized", "Invalid worker secret.");
      }
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const pdfJobLimit =
      toPositiveInteger(body.pdf_job_limit) ??
      toPositiveInteger(request.nextUrl.searchParams.get("pdf_job_limit")) ??
      1;
    const webhookLimit =
      toPositiveInteger(body.webhook_limit) ??
      toPositiveInteger(request.nextUrl.searchParams.get("webhook_limit")) ??
      10;
    const result = await processDeveloperPlatformBackgroundWork({
      pdfJobLimit,
      webhookLimit,
    });

    return jsonOk({
      pdf_jobs_processed: result.pdfJobs.length,
      webhook_deliveries_processed: result.webhooks.length,
    });
  } catch (error) {
    return handleDeveloperPlatformError(requestId, error);
  }
}

function toPositiveInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function getAllowedWorkerSecrets() {
  return [
    process.env.TINYCV_WORKER_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
  ].filter((secret): secret is string => Boolean(secret));
}
