import type { NextRequest } from "next/server";
import { parseBearerToken } from "@/app/_lib/developer-platform-auth";
import { getAllowedWorkerSecrets } from "@/app/_lib/worker-auth";
import {
  createApiRequestId,
  handleDeveloperPlatformError,
  jsonError,
  jsonOk,
} from "@/app/api/v1/_lib";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return refreshAnalyticsRequest(request);
}

export async function POST(request: NextRequest) {
  return refreshAnalyticsRequest(request);
}

async function refreshAnalyticsRequest(request: NextRequest) {
  const requestId = createApiRequestId();

  try {
    const allowedSecrets = getAllowedWorkerSecrets();

    if (allowedSecrets.length === 0 && process.env.NODE_ENV === "production") {
      return jsonError(requestId, 503, "service_unavailable", "Analytics refresh is not configured.");
    }

    if (allowedSecrets.length > 0) {
      const headerSecret = request.headers.get("x-tinycv-worker-secret")?.trim();
      const bearer = parseBearerToken(request);

      if (!allowedSecrets.includes(headerSecret || "") && !allowedSecrets.includes(bearer || "")) {
        return jsonError(requestId, 401, "unauthorized", "Invalid worker secret.");
      }
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const maxAgeHours =
      toPositiveNumber(body.max_age_hours) ??
      toPositiveNumber(request.nextUrl.searchParams.get("max_age_hours")) ??
      undefined;
    const force = body.force === true || request.nextUrl.searchParams.get("force") === "1";
    const { refreshAdminAnalytics } = await import("../../../../../../scripts/refresh-admin-analytics.mjs");
    const result = await refreshAdminAnalytics({ force, maxAgeHours });

    return jsonOk({
      generated_at: result.generatedAt,
      id: result.id ?? null,
      refreshed: result.refreshed,
    });
  } catch (error) {
    return handleDeveloperPlatformError(requestId, error);
  }
}

function toPositiveNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
