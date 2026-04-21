import "server-only";

import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { createProjectApiKey } from "@/app/_lib/developer-platform-auth";
import type {
  ProjectApiKeyRecord,
  ProjectSummary,
} from "@/app/_lib/developer-platform-types";

type SqlClient = postgres.Sql | postgres.TransactionSql;

type AccountDeveloperProjectRow = {
  created_at: Date | string;
  id: string;
  name: string;
  slug: string;
  updated_at: Date | string;
};

type AccountProjectApiKeyRow = {
  created_at: Date | string;
  id: string;
  key_prefix: string;
  label: string;
  last_used_at: Date | string | null;
  revoked_at: Date | string | null;
};

export type AccountDeveloperSettings = {
  apiKeys: ProjectApiKeyRecord[];
  project: ProjectSummary | null;
  webhookSecret: string | null;
};

export type AccountApiKeyCreation = AccountDeveloperSettings & {
  apiKey: {
    key: string;
    keyPrefix: string;
    label: string;
  };
};

let accountDeveloperSql: postgres.Sql | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export async function getAccountDeveloperSettings(userId: string): Promise<AccountDeveloperSettings> {
  const sql = getAccountDeveloperSql();
  await ensureSchema(sql);

  const project = await getAccountDeveloperProject(sql, userId);

  if (!project) {
    return {
      apiKeys: [],
      project: null,
      webhookSecret: null,
    };
  }

  const apiKeys = await getProjectApiKeys(sql, project.id);

  return {
    apiKeys,
    project,
    webhookSecret: null,
  };
}

export async function createAccountDeveloperApiKey(input: {
  label?: string | null;
  userId: string;
  userName?: string | null;
}): Promise<AccountApiKeyCreation> {
  const sql = getAccountDeveloperSql();
  await ensureSchema(sql);
  const now = new Date();
  const label = input.label?.trim() || "Default API key";

  return await sql.begin(async (tx) => {
    const project = await getOrCreateAccountDeveloperProject(tx, {
      timestamp: now,
      userId: input.userId,
      userName: input.userName,
    });
    const apiKeyId = randomUUID();
    const apiKey = createProjectApiKey();

    await tx`
      insert into project_api_keys (
        id,
        project_id,
        label,
        key_prefix,
        key_hash,
        last_used_at,
        revoked_at,
        created_at
      ) values (
        ${apiKeyId},
        ${project.id},
        ${label},
        ${apiKey.keyPrefix},
        ${apiKey.keyHash},
        ${null},
        ${null},
        ${now}
      )
    `;

    const apiKeys = await getProjectApiKeys(tx, project.id);

    return {
      apiKey: {
        key: apiKey.key,
        keyPrefix: apiKey.keyPrefix,
        label,
      },
      apiKeys,
      project,
      webhookSecret: null,
    };
  });
}

async function getOrCreateAccountDeveloperProject(
  sql: SqlClient,
  input: {
    timestamp: Date;
    userId: string;
    userName?: string | null;
  },
): Promise<ProjectSummary> {
  const existing = await getAccountDeveloperProject(sql, input.userId);

  if (existing) {
    return existing;
  }

  const projectId = randomUUID();
  const name = buildProjectName(input.userName);
  const slug = await createUniqueAccountProjectSlug(sql, input.userId);

  await sql`
    insert into projects (
      id,
      name,
      slug,
      created_at,
      updated_at
    ) values (
      ${projectId},
      ${name},
      ${slug},
      ${input.timestamp},
      ${input.timestamp}
    )
  `;

  await sql`
    insert into account_developer_projects (
      user_id,
      project_id,
      created_at,
      updated_at
    ) values (
      ${input.userId},
      ${projectId},
      ${input.timestamp},
      ${input.timestamp}
    )
    on conflict (user_id)
    do nothing
  `;

  const project = await getAccountDeveloperProject(sql, input.userId);

  if (!project) {
    throw new Error("Could not create an account API project.");
  }

  return project;
}

async function getAccountDeveloperProject(sql: SqlClient, userId: string) {
  const [row] = await sql<AccountDeveloperProjectRow[]>`
    select
      p.id,
      p.name,
      p.slug,
      p.created_at,
      p.updated_at
    from account_developer_projects account_project
    join projects p on p.id = account_project.project_id
    where account_project.user_id = ${userId}
    limit 1
  `;

  return row ? toProjectSummary(row) : null;
}

async function getProjectApiKeys(sql: SqlClient, projectId: string) {
  const rows = await sql<AccountProjectApiKeyRow[]>`
    select
      id,
      label,
      key_prefix,
      last_used_at,
      revoked_at,
      created_at
    from project_api_keys
    where project_id = ${projectId}
      and revoked_at is null
    order by created_at desc
  `;

  return rows.map(toProjectApiKeyRecord);
}

async function createUniqueAccountProjectSlug(sql: SqlClient, userId: string) {
  const base = `account-${slugify(userId).slice(0, 24) || randomUUID().slice(0, 8)}`;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${randomUUID().slice(0, 6)}`;
    const [existing] = await sql<{ exists: boolean }[]>`
      select exists(select 1 from projects where slug = ${candidate}) as exists
    `;

    if (!existing?.exists) {
      return candidate;
    }
  }

  return `account-${randomUUID()}`;
}

function buildProjectName(userName?: string | null) {
  const name = userName?.trim();
  return name ? `${name} API` : "Tiny CV API";
}

function toProjectSummary(row: AccountDeveloperProjectRow): ProjectSummary {
  return {
    createdAt: formatTimestamp(row.created_at),
    id: row.id,
    name: row.name,
    slug: row.slug,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function toProjectApiKeyRecord(row: AccountProjectApiKeyRow): ProjectApiKeyRecord {
  return {
    createdAt: formatTimestamp(row.created_at),
    id: row.id,
    keyPrefix: row.key_prefix,
    label: row.label,
    lastUsedAt: formatNullableTimestamp(row.last_used_at),
    revokedAt: formatNullableTimestamp(row.revoked_at),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getAccountDeveloperSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for account API keys.");
  }

  accountDeveloperSql ??= postgres(process.env.DATABASE_URL, {
    max: 5,
    prepare: false,
  });

  return accountDeveloperSql;
}

async function ensureSchema(sql: SqlClient) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      if (!shouldRunRuntimeSchemaSync()) {
        await verifySchema(sql);
        return;
      }

      await sql`
        create table if not exists account_developer_projects (
          user_id text primary key references auth_users(id) on delete cascade,
          project_id text not null unique references projects(id) on delete cascade,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists account_developer_projects_project_idx
        on account_developer_projects(project_id)
      `;
    })();
  }

  await schemaReadyPromise;
}

async function verifySchema(sql: SqlClient) {
  const requiredTables = [
    "account_developer_projects",
    "project_api_keys",
    "projects",
  ];
  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any(${requiredTables})
  `;
  const existingTables = new Set(rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !existingTables.has(table));

  if (missingTables.length > 0) {
    throw new Error(
      `Tiny CV account API schema is not migrated. Run \`pnpm db:migrate\`. Missing: ${missingTables.join(", ")}.`,
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

function formatTimestamp(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function formatNullableTimestamp(value: Date | string | null) {
  return value ? formatTimestamp(value) : null;
}
