import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import postgres from "postgres";

type SqlClient = postgres.Sql;

export type ApiRateLimitAction =
  | "api:claim_consume"
  | "api:mcp"
  | "api:pdf_create"
  | "api:project_bootstrap"
  | "api:resume_create"
  | "api:resume_publish"
  | "api:resume_update"
  | "api:validate"
  | "workspace:attach"
  | "workspace:bootstrap"
  | "workspace:create"
  | "workspace:delete"
  | "workspace:import_legacy"
  | "workspace:publish"
  | "workspace:rename"
  | "workspace:save"
  | "workspace:switch";

type RateLimitPolicy = {
  max: number;
  windowSeconds: number;
};

type RateLimitSubject = {
  id: string;
  type: "ip" | "project" | "workspace";
};

const DEFAULT_POLICIES: Record<ApiRateLimitAction, RateLimitPolicy> = {
  "api:claim_consume": { max: 30, windowSeconds: 60 },
  "api:mcp": { max: 120, windowSeconds: 60 },
  "api:pdf_create": { max: 10, windowSeconds: 60 },
  "api:project_bootstrap": { max: 20, windowSeconds: 60 * 60 },
  "api:resume_create": { max: 30, windowSeconds: 60 },
  "api:resume_publish": { max: 30, windowSeconds: 60 },
  "api:resume_update": { max: 120, windowSeconds: 60 },
  "api:validate": { max: 120, windowSeconds: 60 },
  "workspace:attach": { max: 30, windowSeconds: 60 },
  "workspace:bootstrap": { max: 20, windowSeconds: 60 * 60 },
  "workspace:create": { max: 30, windowSeconds: 60 },
  "workspace:delete": { max: 60, windowSeconds: 60 },
  "workspace:import_legacy": { max: 10, windowSeconds: 60 * 60 },
  "workspace:publish": { max: 30, windowSeconds: 60 },
  "workspace:rename": { max: 60, windowSeconds: 60 },
  "workspace:save": { max: 180, windowSeconds: 60 },
  "workspace:switch": { max: 180, windowSeconds: 60 },
};

type RateLimitEventRow = {
  created_at: Date | string;
  subject_hash: string;
  subject_type: RateLimitSubject["type"];
};

let postgresClient: SqlClient | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export class ApiRateLimitError extends Error {
  code = "rate_limited";
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = "Rate limit exceeded. Please wait and try again.") {
    super(message);
    this.name = "ApiRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ApiRateLimitUnavailableError extends Error {
  code = "service_unavailable";

  constructor(message = "Rate limiting is not configured.") {
    super(message);
    this.name = "ApiRateLimitUnavailableError";
  }
}

export async function assertApiRateLimit(input: {
  action: ApiRateLimitAction;
  projectId?: string | null;
  request: NextRequest;
  workspaceId?: string | null;
}) {
  const policy = resolveApiRateLimitPolicy(input.action);

  if (!policy || !process.env.DATABASE_URL) {
    return;
  }

  const subjects = buildRateLimitSubjects(input.request, {
    projectId: input.projectId,
    workspaceId: input.workspaceId,
  });

  if (subjects.length === 0) {
    return;
  }

  const sql = getPostgresClient();
  await ensureSchema(sql);
  await recordAndAssertSubjects(sql, input.action, subjects, policy);
}

export function buildRateLimitSubjects(
  request: NextRequest,
  input: {
    projectId?: string | null;
    workspaceId?: string | null;
  },
) {
  const subjects: RateLimitSubject[] = [];

  if (input.projectId) {
    subjects.push({ id: input.projectId, type: "project" });
  }

  if (input.workspaceId) {
    subjects.push({ id: input.workspaceId, type: "workspace" });
  }

  const ipAddress = readRequestIp(request);

  if (ipAddress) {
    subjects.push({ id: ipAddress, type: "ip" });
  }

  return subjects;
}

export function readRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || null;
}

export function resolveApiRateLimitPolicy(action: ApiRateLimitAction) {
  if (isRateLimitingDisabled()) {
    return null;
  }

  const defaults = DEFAULT_POLICIES[action];
  const envPrefix = `TINYCV_RATE_LIMIT_${action.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
  const max = parsePositiveInteger(process.env[`${envPrefix}_MAX`]) ?? defaults.max;
  const windowSeconds = parsePositiveInteger(process.env[`${envPrefix}_WINDOW_SECONDS`]) ?? defaults.windowSeconds;

  return {
    max,
    windowSeconds,
  } satisfies RateLimitPolicy;
}

export function getRateLimitRetryAfterSeconds(
  oldestEventCreatedAt: Date | string | undefined,
  windowSeconds: number,
) {
  if (!oldestEventCreatedAt) {
    return windowSeconds;
  }

  const createdAt = Number(new Date(oldestEventCreatedAt));

  if (!Number.isFinite(createdAt)) {
    return windowSeconds;
  }

  const retryAfterMs = Math.max(createdAt + windowSeconds * 1000 - Date.now(), 1000);
  return Math.ceil(retryAfterMs / 1000);
}

async function recordAndAssertSubjects(
  sql: SqlClient,
  action: ApiRateLimitAction,
  subjects: RateLimitSubject[],
  policy: RateLimitPolicy,
) {
  const windowStart = new Date(Date.now() - policy.windowSeconds * 1000);
  const timestamp = new Date();
  const events = subjects.map((subject) => ({
    action,
    created_at: timestamp,
    id: randomUUID(),
    subject_hash: hashRateLimitSubject(subject),
    subject_type: subject.type,
  }));
  const subjectHashes = events.map((event) => event.subject_hash);
  const subjectTypes = [...new Set(events.map((event) => event.subject_type))];

  const recentEvents = await sql.begin(async (tx) => {
    await tx`
      insert into api_rate_limit_events (
        id,
        action,
        subject_type,
        subject_hash,
        created_at
      )
      select *
      from unnest(
        ${events.map((event) => event.id)}::text[],
        ${events.map((event) => event.action)}::text[],
        ${events.map((event) => event.subject_type)}::text[],
        ${events.map((event) => event.subject_hash)}::text[],
        ${events.map((event) => event.created_at)}::timestamptz[]
      )
    `;

    return tx<RateLimitEventRow[]>`
      select subject_type, subject_hash, created_at
      from api_rate_limit_events
      where action = ${action}
        and subject_type = any(${subjectTypes})
        and subject_hash = any(${subjectHashes})
        and created_at >= ${windowStart}
      order by subject_type asc, subject_hash asc, created_at asc
    `;
  });

  const recentEventsBySubject = new Map<string, RateLimitEventRow[]>();

  for (const event of recentEvents) {
    const key = `${event.subject_type}:${event.subject_hash}`;
    const subjectEvents = recentEventsBySubject.get(key) ?? [];
    subjectEvents.push(event);
    recentEventsBySubject.set(key, subjectEvents);
  }

  for (const event of events) {
    const key = `${event.subject_type}:${event.subject_hash}`;
    const subjectEvents = recentEventsBySubject.get(key) ?? [];

    if (subjectEvents.length > policy.max) {
      throw new ApiRateLimitError(
        getRateLimitRetryAfterSeconds(subjectEvents[0]?.created_at, policy.windowSeconds),
      );
    }
  }
}

function hashRateLimitSubject(subject: RateLimitSubject) {
  return createHash("sha256")
    .update(`${subject.type}:${subject.id}`)
    .digest("hex");
}

function getPostgresClient() {
  postgresClient ??= postgres(process.env.DATABASE_URL!, {
    max: 1,
    prepare: false,
  });

  return postgresClient;
}

async function ensureSchema(sql: SqlClient) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      if (!shouldRunRuntimeSchemaSync()) {
        await verifyRateLimitSchema(sql);
        return;
      }

      await sql`
        create table if not exists api_rate_limit_events (
          id text primary key,
          action text not null,
          subject_type text not null,
          subject_hash text not null,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists api_rate_limit_events_lookup_idx
        on api_rate_limit_events(subject_type, subject_hash, action, created_at desc)
      `;
    })();
  }

  await schemaReadyPromise;
}

async function verifyRateLimitSchema(sql: SqlClient) {
  const [row] = await sql<{ exists: boolean }[]>`
    select exists(
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'api_rate_limit_events'
    ) as exists
  `;

  if (!row?.exists) {
    throw new ApiRateLimitUnavailableError(
      "Tiny CV rate limit schema is not migrated. Run `pnpm db:migrate` before enabling public API routes.",
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

function parsePositiveInteger(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function isRateLimitingDisabled() {
  const value = process.env.TINYCV_RATE_LIMIT_DISABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
