import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

export class DeveloperPlatformConfigurationError extends Error {
  code = "configuration_error";

  constructor(message: string) {
    super(message);
    this.name = "DeveloperPlatformConfigurationError";
  }
}

export function createProjectApiKey() {
  const raw = `tcv_live_${randomBytes(24).toString("hex")}`;

  return {
    key: raw,
    keyHash: sha256(raw),
    keyPrefix: raw.slice(0, 18),
  };
}

export function createOneTimeClaimToken() {
  const token = `tcv_claim_${randomUUID()}_${randomBytes(12).toString("hex")}`;

  return {
    token,
    tokenHash: sha256(token),
  };
}

export function buildProjectWebhookSecret(projectId: string) {
  const digest = createHmac("sha256", getPlatformSecret())
    .update(`project:${projectId}:webhook`)
    .digest("hex");

  return `tcv_wsec_${digest}`;
}

export function buildPdfDownloadToken(jobId: string, expiresAt: string) {
  const digest = createHmac("sha256", getPlatformSecret())
    .update(`pdf-job:${jobId}:${expiresAt}`)
    .digest("base64url");

  return `v1.${digest}`;
}

export function isPdfDownloadTokenValid({
  expiresAt,
  jobId,
  token,
}: {
  expiresAt: string;
  jobId: string;
  token: string;
}) {
  if (!token || !expiresAt) {
    return false;
  }

  const expires = Number(new Date(expiresAt));

  if (!Number.isFinite(expires) || Date.now() > expires) {
    return false;
  }

  return safeEquals(token, buildPdfDownloadToken(jobId, expiresAt));
}

export function parseBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header) {
    return null;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function parseIdempotencyKey(request: NextRequest) {
  const key = request.headers.get("idempotency-key")?.trim();
  return key || null;
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getPlatformSecret() {
  const explicitSecret = process.env.TINYCV_PLATFORM_SECRET?.trim();

  if (explicitSecret && explicitSecret !== "change-me") {
    if (process.env.NODE_ENV === "production" && explicitSecret.length < 32) {
      throw new DeveloperPlatformConfigurationError(
        "TINYCV_PLATFORM_SECRET must be at least 32 characters in production.",
      );
    }

    return explicitSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new DeveloperPlatformConfigurationError(
      "TINYCV_PLATFORM_SECRET is required in production.",
    );
  }

  return process.env.TINYCV_EDITOR_SECRET ??
    process.env.DATABASE_URL ??
    "tinycv-development-platform-secret";
}
