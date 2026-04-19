import "server-only";

import { randomUUID } from "node:crypto";
import postgres from "postgres";

export type UsageEventInput = {
  action: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
  projectId?: string | null;
  quantity?: number;
  userId?: string | null;
};

let usageSql: postgres.Sql | null = null;

export async function recordUsageEvent(input: UsageEventInput) {
  if (!process.env.DATABASE_URL) {
    return;
  }

  try {
    await insertUsageEvent(getUsageSql(), input);
  } catch (error) {
    console.error("[usage-events] Could not record usage event.", {
      action: input.action,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function insertUsageEvent(sql: postgres.Sql, input: UsageEventInput) {
  await sql`
    insert into usage_events (
      id,
      user_id,
      project_id,
      action,
      quantity,
      idempotency_key,
      metadata,
      occurred_at
    ) values (
      ${randomUUID()},
      ${input.userId ?? null},
      ${input.projectId ?? null},
      ${input.action},
      ${input.quantity ?? 1},
      ${input.idempotencyKey ?? null},
      ${sql.json((input.metadata ?? {}) as postgres.JSONValue)},
      ${new Date()}
    )
  `;
}

function getUsageSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Tiny CV usage events.");
  }

  usageSql ??= postgres(process.env.DATABASE_URL, {
    max: 3,
    prepare: false,
  });

  return usageSql;
}
