import "server-only";

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import postgres from "postgres";
import { sha256 } from "@/app/_lib/developer-platform-auth";
import { DeveloperPlatformUnavailableError } from "@/app/_lib/developer-platform-store";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEFAULT_RATE_LIMIT_MAX_ATTEMPTS = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 60;

type SqlClient = postgres.Sql;

type SelfServeBootstrapAttemptRow = {
  created_at: Date | string;
  id: string;
};

export type SelfServeRequestContext = {
  fingerprintHash: string;
  ipAddress: string | null;
};

export class SelfServeCaptchaError extends Error {
  code = "captcha_failed";
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "SelfServeCaptchaError";
    this.details = details;
  }
}

export class SelfServeRateLimitError extends Error {
  code = "rate_limited";
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = "Too many API key creation attempts. Please wait and try again.") {
    super(message);
    this.name = "SelfServeRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

let postgresClient: SqlClient | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export async function assertSelfServeBootstrapAllowed(request: NextRequest): Promise<SelfServeRequestContext> {
  const sql = getPostgresClient();
  await ensureSchema(sql);

  const context = buildSelfServeRequestContext(request);
  const attempts = await loadRecentAttempts(sql, context.fingerprintHash);
  const maxAttempts = getRateLimitMaxAttempts();

  if (attempts.length >= maxAttempts) {
    const retryAfterSeconds = getRetryAfterSeconds(attempts[0]?.created_at);
    await recordSelfServeBootstrapAttempt({
      fingerprintHash: context.fingerprintHash,
      outcome: "rate_limited",
    });
    throw new SelfServeRateLimitError(retryAfterSeconds);
  }

  return context;
}

export async function verifySelfServeCaptcha(input: {
  ipAddress: string | null;
  token: string;
}) {
  const secret = process.env.TINYCV_TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    throw new DeveloperPlatformUnavailableError("Self-serve API key creation is not configured.");
  }

  const token = input.token.trim();

  if (!token) {
    throw new SelfServeCaptchaError("Complete the CAPTCHA challenge before creating a key.");
  }

  const body = new URLSearchParams({
    response: token,
    secret,
  });

  if (input.ipAddress) {
    body.set("remoteip", input.ipAddress);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new DeveloperPlatformUnavailableError("CAPTCHA verification is currently unavailable.");
  }

  const payload = await response.json() as {
    "error-codes"?: string[];
    success?: boolean;
  };

  if (!payload.success) {
    throw new SelfServeCaptchaError("CAPTCHA verification failed. Please try again.", {
      provider_errors: payload["error-codes"] ?? [],
    });
  }
}

export async function recordSelfServeBootstrapAttempt(input: {
  fingerprintHash: string;
  outcome: "captcha_failed" | "failed" | "rate_limited" | "success";
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);

  await sql`
    insert into self_serve_bootstrap_attempts (
      id,
      fingerprint_hash,
      outcome
    ) values (
      ${randomUUID()},
      ${input.fingerprintHash},
      ${input.outcome}
    )
  `;
}

function buildSelfServeRequestContext(request: NextRequest): SelfServeRequestContext {
  const ipAddress = readRequestIp(request);
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown";
  const acceptLanguage = request.headers.get("accept-language")?.trim() || "unknown";

  return {
    fingerprintHash: sha256(`${ipAddress ?? "unknown"}|${userAgent}|${acceptLanguage}`),
    ipAddress,
  };
}

function readRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || null;
}

async function loadRecentAttempts(sql: SqlClient, fingerprintHash: string) {
  const windowStart = new Date(Date.now() - getRateLimitWindowMinutes() * 60 * 1000);

  return sql<SelfServeBootstrapAttemptRow[]>`
    select
      id,
      created_at
    from self_serve_bootstrap_attempts
    where fingerprint_hash = ${fingerprintHash}
      and created_at >= ${windowStart}
    order by created_at asc
  `;
}

function getRetryAfterSeconds(oldestAttempt: Date | string | undefined) {
  if (!oldestAttempt) {
    return getRateLimitWindowMinutes() * 60;
  }

  const createdAt = Number(new Date(oldestAttempt));
  const windowMs = getRateLimitWindowMinutes() * 60 * 1000;
  const retryAfterMs = Math.max(createdAt + windowMs - Date.now(), 1000);
  return Math.ceil(retryAfterMs / 1000);
}

function getRateLimitMaxAttempts() {
  const parsed = Number(process.env.TINYCV_SELF_SERVE_RATE_LIMIT_MAX_ATTEMPTS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_RATE_LIMIT_MAX_ATTEMPTS;
}

function getRateLimitWindowMinutes() {
  const parsed = Number(process.env.TINYCV_SELF_SERVE_RATE_LIMIT_WINDOW_MINUTES);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_RATE_LIMIT_WINDOW_MINUTES;
}

function getPostgresClient() {
  if (!process.env.DATABASE_URL) {
    throw new DeveloperPlatformUnavailableError(
      "Set DATABASE_URL to enable the Tiny CV developer platform.",
    );
  }

  postgresClient ??= postgres(process.env.DATABASE_URL, {
    prepare: false,
  });

  return postgresClient;
}

async function ensureSchema(sql: SqlClient) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      if (!shouldRunRuntimeSchemaSync()) {
        await verifySelfServeSchema(sql);
        return;
      }

      await sql`
        create table if not exists self_serve_bootstrap_attempts (
          id text primary key,
          fingerprint_hash text not null,
          outcome text not null,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists self_serve_bootstrap_attempts_fingerprint_created_idx
        on self_serve_bootstrap_attempts (fingerprint_hash, created_at desc)
      `;
    })();
  }

  await schemaReadyPromise;
}

async function verifySelfServeSchema(sql: SqlClient) {
  const [row] = await sql<{ exists: boolean }[]>`
    select exists(
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'self_serve_bootstrap_attempts'
    ) as exists
  `;

  if (!row?.exists) {
    throw new DeveloperPlatformUnavailableError(
      "Tiny CV self-serve developer schema is not migrated. Run `pnpm db:migrate` before enabling /api/v1/projects/self-serve.",
    );
  }
}

function shouldRunRuntimeSchemaSync() {
  const configured = process.env.TINYCV_RUNTIME_SCHEMA_SYNC?.trim().toLowerCase();

  if (configured === "1" || configured === "true" || configured === "yes") {
    return true;
  }

  if (configured === "0" || configured === "false" || configured === "no") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}
