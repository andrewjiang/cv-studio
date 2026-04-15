import "server-only";

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const EDITOR_TOKEN_VERSION = "v2";

export function buildEditorAccessToken(resumeId: string) {
  const signature = createHmac("sha256", getEditorLinkSecret())
    .update(`resume:${resumeId}:edit`)
    .digest("base64url");

  return `${EDITOR_TOKEN_VERSION}.${signature}`;
}

export function buildEditorPath(resumeId: string) {
  return `/studio/${resumeId}?token=${encodeURIComponent(buildEditorAccessToken(resumeId))}`;
}

export function createLegacyEditorToken() {
  return `${randomUUID()}-${randomBytes(16).toString("hex")}`;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isEditorAccessTokenValid({
  legacyTokenHash,
  resumeId,
  token,
}: {
  legacyTokenHash: string;
  resumeId: string;
  token: string;
}) {
  if (!token) {
    return false;
  }

  if (token.startsWith(`${EDITOR_TOKEN_VERSION}.`)) {
    return safeTokenEquals(token, buildEditorAccessToken(resumeId));
  }

  return safeTokenEquals(hashToken(token), legacyTokenHash);
}

function getEditorLinkSecret() {
  return process.env.TINYCV_EDITOR_SECRET ??
    process.env.DATABASE_URL ??
    "tinycv-local-editor-secret";
}

function safeTokenEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
