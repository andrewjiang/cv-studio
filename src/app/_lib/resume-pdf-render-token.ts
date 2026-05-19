import "server-only";

import { createHmac } from "node:crypto";
import { safeEquals } from "@/app/_lib/developer-platform-auth";

type StudioPdfRenderTokenInput = {
  expiresAt: string;
  resumeId: string;
  workspaceId: string;
};

export function buildStudioPdfRenderToken(input: StudioPdfRenderTokenInput) {
  return `v1.${createHmac("sha256", getStudioPdfRenderSecret())
    .update(buildStudioPdfRenderPayload(input))
    .digest("base64url")}`;
}

export function isStudioPdfRenderTokenValid(input: StudioPdfRenderTokenInput & {
  token: string | null | undefined;
}) {
  if (!input.token) {
    return false;
  }

  const expires = Number(new Date(input.expiresAt));

  if (!Number.isFinite(expires) || Date.now() > expires) {
    return false;
  }

  return safeEquals(input.token, buildStudioPdfRenderToken(input));
}

function buildStudioPdfRenderPayload(input: StudioPdfRenderTokenInput) {
  return `studio-pdf:${input.resumeId}:${input.workspaceId}:${input.expiresAt}`;
}

function getStudioPdfRenderSecret() {
  const secret =
    process.env.TINYCV_PDF_RENDER_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.TINYCV_PLATFORM_SECRET?.trim();

  if (secret && secret !== "change-me") {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("TINYCV_PDF_RENDER_SECRET or BETTER_AUTH_SECRET is required for studio PDF rendering.");
  }

  return "tinycv-development-pdf-render-secret";
}
