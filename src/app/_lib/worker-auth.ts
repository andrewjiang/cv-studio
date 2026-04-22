import "server-only";

import { safeEquals } from "@/app/_lib/developer-platform-auth";

const LOCAL_WORKER_SECRET = "tinycv-local-worker-secret";

export function getAllowedWorkerSecrets(input: {
  includeLocalDefault?: boolean;
} = {}) {
  return [
    process.env.TINYCV_WORKER_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
    input.includeLocalDefault && process.env.NODE_ENV !== "production" ? LOCAL_WORKER_SECRET : null,
  ].filter((secret): secret is string => Boolean(secret));
}

export function getInternalWorkerSecret() {
  return getAllowedWorkerSecrets({ includeLocalDefault: true })[0] ?? null;
}

export function isWorkerSecretAuthorized(secret: string | null) {
  if (!secret) {
    return false;
  }

  return getAllowedWorkerSecrets({ includeLocalDefault: true }).some((allowed) => safeEquals(allowed, secret));
}
