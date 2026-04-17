import "server-only";

import { randomUUID } from "node:crypto";
import postgres from "postgres";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

type SqlClient = postgres.Sql | postgres.TransactionSql;

type AccountResumeRow = {
  id: string;
  is_published: boolean;
  last_opened_at: Date | string;
  published_at: Date | string | null;
  slug: string;
  template_key: TemplateKey;
  title: string;
  updated_at: Date | string;
};

export type AccountResumeSummary = {
  id: string;
  isPublished: boolean;
  lastOpenedAt: string;
  publishedAt: string | null;
  slug: string;
  templateKey: TemplateKey;
  title: string;
  updatedAt: string;
};

export type AccountDashboardPayload = {
  currentResumeId: string | null;
  resumes: AccountResumeSummary[];
};

let accountSql: postgres.Sql | null = null;

export async function getAccountDashboard(userId: string): Promise<AccountDashboardPayload> {
  const sql = getAccountSql();
  const [profile] = await sql<{ current_resume_id: string | null }[]>`
    select current_resume_id
    from user_profiles
    where user_id = ${userId}
    limit 1
  `;
  const resumes = await getUserResumeRows(sql, userId);
  const activeResumeIds = new Set(resumes.map((resume) => resume.id));
  const currentResumeId = profile?.current_resume_id && activeResumeIds.has(profile.current_resume_id)
    ? profile.current_resume_id
    : resumes[0]?.id ?? null;

  return {
    currentResumeId,
    resumes: resumes.map(toAccountResumeSummary),
  };
}

export async function claimWorkspaceForUser(input: {
  userId: string;
  workspaceId: string;
}): Promise<AccountDashboardPayload & { claimedCount: number }> {
  const sql = getAccountSql();
  const now = new Date();

  return await sql.begin(async (tx) => {
    const workspaceRows = await tx<{
      current_resume_id: string | null;
      resume_id: string;
    }[]>`
      select
        w.current_resume_id,
        m.resume_id
      from workspaces w
      join workspace_resume_memberships m on m.workspace_id = w.id
      where w.id = ${input.workspaceId}
        and m.deleted_at is null
      order by m.last_opened_at desc
    `;

    if (workspaceRows.length === 0) {
      await ensureUserProfile(tx, input.userId, null, now);

      return {
        ...(await buildDashboardPayload(tx, input.userId)),
        claimedCount: 0,
      };
    }

    for (const row of workspaceRows) {
      await tx`
        insert into user_resume_memberships (
          user_id,
          resume_id,
          attached_via,
          last_opened_at,
          deleted_at,
          created_at,
          updated_at
        ) values (
          ${input.userId},
          ${row.resume_id},
          ${"workspace_claim"},
          ${now},
          ${null},
          ${now},
          ${now}
        )
        on conflict (user_id, resume_id)
        do update set
          attached_via = excluded.attached_via,
          last_opened_at = excluded.last_opened_at,
          deleted_at = null,
          updated_at = excluded.updated_at
      `;
    }

    const claimedResumeIds = new Set(workspaceRows.map((row) => row.resume_id));
    const workspaceCurrentId = workspaceRows[0]?.current_resume_id;
    const currentResumeId = workspaceCurrentId && claimedResumeIds.has(workspaceCurrentId)
      ? workspaceCurrentId
      : workspaceRows[0]?.resume_id ?? null;

    await ensureUserProfile(tx, input.userId, currentResumeId, now);

    return {
      ...(await buildDashboardPayload(tx, input.userId)),
      claimedCount: workspaceRows.length,
    };
  });
}

export async function openUserResumeInWorkspace(input: {
  resumeId: string;
  userId: string;
  workspaceId?: string | null;
}): Promise<{ workspaceId: string } | null> {
  const sql = getAccountSql();
  const now = new Date();

  return await sql.begin(async (tx) => {
    const [membership] = await tx<{ resume_id: string }[]>`
      select resume_id
      from user_resume_memberships
      where user_id = ${input.userId}
        and resume_id = ${input.resumeId}
        and deleted_at is null
      limit 1
    `;

    if (!membership) {
      return null;
    }

    const workspaceId = input.workspaceId || randomUUID();

    await tx`
      insert into workspaces (
        id,
        current_resume_id,
        created_at,
        updated_at
      ) values (
        ${workspaceId},
        ${input.resumeId},
        ${now},
        ${now}
      )
      on conflict (id)
      do update set
        current_resume_id = excluded.current_resume_id,
        updated_at = excluded.updated_at
    `;

    await tx`
      insert into workspace_resume_memberships (
        workspace_id,
        resume_id,
        attached_via,
        last_opened_at,
        deleted_at,
        created_at,
        updated_at
      ) values (
        ${workspaceId},
        ${input.resumeId},
        ${"account"},
        ${now},
        ${null},
        ${now},
        ${now}
      )
      on conflict (workspace_id, resume_id)
      do update set
        attached_via = excluded.attached_via,
        last_opened_at = excluded.last_opened_at,
        deleted_at = null,
        updated_at = excluded.updated_at
    `;

    await tx`
      update user_resume_memberships
      set
        last_opened_at = ${now},
        updated_at = ${now}
      where user_id = ${input.userId}
        and resume_id = ${input.resumeId}
    `;

    await ensureUserProfile(tx, input.userId, input.resumeId, now);

    return { workspaceId };
  });
}

function getAccountSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Tiny CV accounts.");
  }

  accountSql ??= postgres(process.env.DATABASE_URL, {
    max: 5,
    prepare: false,
  });

  return accountSql;
}

async function buildDashboardPayload(
  sql: SqlClient,
  userId: string,
): Promise<AccountDashboardPayload> {
  const [profile] = await sql<{ current_resume_id: string | null }[]>`
    select current_resume_id
    from user_profiles
    where user_id = ${userId}
    limit 1
  `;
  const resumes = await getUserResumeRows(sql, userId);
  const activeResumeIds = new Set(resumes.map((resume) => resume.id));
  const currentResumeId = profile?.current_resume_id && activeResumeIds.has(profile.current_resume_id)
    ? profile.current_resume_id
    : resumes[0]?.id ?? null;

  return {
    currentResumeId,
    resumes: resumes.map(toAccountResumeSummary),
  };
}

async function getUserResumeRows(sql: SqlClient, userId: string) {
  return await sql<AccountResumeRow[]>`
    select
      r.id,
      r.title,
      r.slug,
      r.is_published,
      r.template_key,
      r.updated_at,
      r.published_at,
      m.last_opened_at
    from user_resume_memberships m
    join resumes r on r.id = m.resume_id
    where m.user_id = ${userId}
      and m.deleted_at is null
    order by m.last_opened_at desc, r.updated_at desc
  `;
}

async function ensureUserProfile(
  sql: SqlClient,
  userId: string,
  currentResumeId: string | null,
  timestamp: Date,
) {
  await sql`
    insert into user_profiles (
      user_id,
      current_resume_id,
      created_at,
      updated_at
    ) values (
      ${userId},
      ${currentResumeId},
      ${timestamp},
      ${timestamp}
    )
    on conflict (user_id)
    do update set
      current_resume_id = coalesce(excluded.current_resume_id, user_profiles.current_resume_id),
      updated_at = excluded.updated_at
  `;
}

function toAccountResumeSummary(row: AccountResumeRow): AccountResumeSummary {
  return {
    id: row.id,
    isPublished: row.is_published,
    lastOpenedAt: formatTimestamp(row.last_opened_at),
    publishedAt: formatNullableTimestamp(row.published_at),
    slug: row.slug,
    templateKey: row.template_key,
    title: row.title,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function formatTimestamp(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function formatNullableTimestamp(value: Date | string | null) {
  return value ? formatTimestamp(value) : null;
}
