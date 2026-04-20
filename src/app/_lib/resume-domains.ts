import "server-only";

import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { getUserEntitlements } from "@/app/_lib/entitlements";
import type { HostedResumePublicRecord } from "@/app/_lib/hosted-resume-types";

export type ResumeDomainStatus =
  | "active"
  | "disabled"
  | "needs_configuration"
  | "pending"
  | "verification_failed";

export type ResumeDomainType = "custom_domain" | "tinycv_subdomain";

export type ResumeDomainSummary = {
  domainId: string;
  domainType: ResumeDomainType;
  hostname: string;
  resumeId: string;
  status: ResumeDomainStatus;
};

export type HostResolution =
  | { kind: "app" }
  | { hostname: string; kind: "resume_domain"; resume: HostedResumePublicRecord }
  | { hostname: string; kind: "unknown" };

type ResumeDomainRow = {
  domain_type: ResumeDomainType;
  hostname: string;
  id: string;
  resume_id: string;
  status: ResumeDomainStatus;
};

type DomainResumeRow = {
  created_at: Date | string;
  domain_type: ResumeDomainType;
  fit_scale: number;
  hostname: string;
  id: string;
  is_published: boolean;
  markdown: string;
  published_at: Date | string | null;
  resume_id: string;
  slug: string;
  status: ResumeDomainStatus;
  template_key: HostedResumePublicRecord["templateKey"];
  title: string;
  updated_at: Date | string;
  user_id: string;
};

export const RESERVED_TINYCV_SUBDOMAINS = new Set([
  "account",
  "admin",
  "api",
  "app",
  "assets",
  "billing",
  "documentation",
  "docs",
  "email",
  "localhost",
  "mail",
  "new",
  "static",
  "status",
  "studio",
  "support",
  "vercel",
  "www",
]);

let domainSql: postgres.Sql | null = null;

export class ResumeDomainConflictError extends Error {
  constructor(message = "That subdomain is already taken.") {
    super(message);
    this.name = "ResumeDomainConflictError";
  }
}

export class ResumeDomainForbiddenError extends Error {
  constructor(message = "Your plan does not include this domain feature.") {
    super(message);
    this.name = "ResumeDomainForbiddenError";
  }
}

export class ResumeDomainNotFoundError extends Error {
  constructor(message = "Resume not found for this account.") {
    super(message);
    this.name = "ResumeDomainNotFoundError";
  }
}

export class ResumeDomainValidationError extends Error {
  constructor(message = "Enter a valid subdomain.") {
    super(message);
    this.name = "ResumeDomainValidationError";
  }
}

export function normalizeHostname(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/:\d+$/, "");
}

export function getPrimaryDomain() {
  return normalizeHostname(process.env.TINYCV_PRIMARY_DOMAIN || "tiny.cv");
}

export function normalizeTinyCvSubdomain(value: string) {
  return value.trim().toLowerCase().replace(/\.tiny\.cv$/i, "");
}

export function validateTinyCvSubdomain(value: string) {
  const subdomain = normalizeTinyCvSubdomain(value);

  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(subdomain)) {
    throw new ResumeDomainValidationError("Use 3-40 lowercase letters, numbers, or hyphens.");
  }

  if (RESERVED_TINYCV_SUBDOMAINS.has(subdomain)) {
    throw new ResumeDomainValidationError("That subdomain is reserved.");
  }

  return subdomain;
}

export function buildTinyCvHostname(subdomain: string) {
  return `${validateTinyCvSubdomain(subdomain)}.${getPrimaryDomain()}`;
}

export function isAppHost(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const primaryDomain = getPrimaryDomain();
  const appUrlHost = getEnvUrlHost("TINYCV_APP_URL");
  const authUrlHost = getEnvUrlHost("BETTER_AUTH_URL");

  return (
    !normalized ||
    normalized === primaryDomain ||
    normalized === `www.${primaryDomain}` ||
    normalized === appUrlHost ||
    normalized === authUrlHost ||
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".vercel.app")
  );
}

export async function resolveHost(hostname: string | null): Promise<HostResolution> {
  const normalized = normalizeHostname(hostname);

  if (isAppHost(normalized)) {
    return { kind: "app" };
  }

  const resume = await getPublishedResumeForDomain(normalized);

  if (!resume) {
    return {
      hostname: normalized,
      kind: "unknown",
    };
  }

  return {
    hostname: normalized,
    kind: "resume_domain",
    resume,
  };
}

export async function getUserResumeDomains(userId: string) {
  const sql = getDomainSql();
  const rows = await sql<ResumeDomainRow[]>`
    select
      id,
      resume_id,
      hostname,
      domain_type,
      status
    from resume_domains
    where user_id = ${userId}
      and disabled_at is null
    order by created_at asc
  `;

  return rows.map(toResumeDomainSummary);
}

export async function claimTinyCvSubdomain(input: {
  resumeId: string;
  subdomain: string;
  userId: string;
}): Promise<ResumeDomainSummary> {
  const sql = getDomainSql();
  const hostname = buildTinyCvHostname(input.subdomain);
  const now = new Date();
  const entitlementResolution = await getUserEntitlements(input.userId);

  if (entitlementResolution.entitlements.customSubdomainLimit <= 0) {
    throw new ResumeDomainForbiddenError("Upgrade to claim a tiny.cv subdomain.");
  }

  return await sql.begin(async (tx) => {
    const [resume] = await tx<{ id: string; is_published: boolean }[]>`
      select
        r.id,
        r.is_published
      from user_resume_memberships m
      join resumes r on r.id = m.resume_id
      where m.user_id = ${input.userId}
        and m.resume_id = ${input.resumeId}
        and m.deleted_at is null
      limit 1
    `;

    if (!resume) {
      throw new ResumeDomainNotFoundError();
    }

    if (!resume.is_published) {
      throw new ResumeDomainValidationError("Publish this resume before assigning a subdomain.");
    }

    const [conflict] = await tx<{ id: string; user_id: string }[]>`
      select id, user_id
      from resume_domains
      where lower(hostname) = lower(${hostname})
        and disabled_at is null
      limit 1
    `;

    if (conflict && conflict.user_id !== input.userId) {
      throw new ResumeDomainConflictError();
    }

    const [existing] = await tx<{ id: string }[]>`
      select id
      from resume_domains
      where user_id = ${input.userId}
        and domain_type = ${"tinycv_subdomain"}
        and disabled_at is null
      order by created_at asc
      limit 1
    `;

    if (existing) {
      const [updated] = await tx<ResumeDomainRow[]>`
        update resume_domains
        set
          resume_id = ${input.resumeId},
          hostname = ${hostname},
          status = ${"active"},
          provider = ${"vercel"},
          verified_at = coalesce(verified_at, ${now}),
          updated_at = ${now}
        where id = ${existing.id}
        returning id, resume_id, hostname, domain_type, status
      `;

      return toResumeDomainSummary(updated);
    }

    const [created] = await tx<ResumeDomainRow[]>`
      insert into resume_domains (
        id,
        user_id,
        resume_id,
        hostname,
        domain_type,
        status,
        provider,
        verified_at,
        created_at,
        updated_at
      ) values (
        ${randomUUID()},
        ${input.userId},
        ${input.resumeId},
        ${hostname},
        ${"tinycv_subdomain"},
        ${"active"},
        ${"vercel"},
        ${now},
        ${now},
        ${now}
      )
      returning id, resume_id, hostname, domain_type, status
    `;

    return toResumeDomainSummary(created);
  });
}

async function getPublishedResumeForDomain(hostname: string): Promise<HostedResumePublicRecord | null> {
  const sql = getDomainSql();
  const [row] = await sql<DomainResumeRow[]>`
    select
      d.id,
      d.user_id,
      d.resume_id,
      d.hostname,
      d.domain_type,
      d.status,
      r.slug,
      r.title,
      r.published_markdown as markdown,
      coalesce(r.published_fit_scale, r.fit_scale) as fit_scale,
      r.is_published,
      r.template_key,
      r.created_at,
      r.updated_at,
      r.published_at
    from resume_domains d
    join resumes r on r.id = d.resume_id
    where lower(d.hostname) = lower(${hostname})
      and d.status = ${"active"}
      and d.disabled_at is null
      and r.is_published = true
      and r.published_markdown is not null
    limit 1
  `;

  if (!row) {
    return null;
  }

  const entitlementResolution = await getUserEntitlements(row.user_id);
  const allowed = row.domain_type === "tinycv_subdomain"
    ? entitlementResolution.entitlements.customSubdomainLimit > 0
    : entitlementResolution.entitlements.customDomainLimit > 0;

  if (!allowed) {
    return null;
  }

  return {
    createdAt: formatTimestamp(row.created_at),
    fitScale: row.fit_scale,
    id: row.resume_id,
    isPublished: true,
    markdown: row.markdown,
    publishedAt: formatNullableTimestamp(row.published_at),
    slug: row.slug,
    templateKey: row.template_key,
    title: row.title,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function getDomainSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Tiny CV domains.");
  }

  domainSql ??= postgres(process.env.DATABASE_URL, {
    max: 3,
    prepare: false,
  });

  return domainSql;
}

function getEnvUrlHost(name: string) {
  const value = process.env[name];

  if (!value) {
    return "";
  }

  try {
    return normalizeHostname(new URL(value).host);
  } catch {
    return "";
  }
}

function toResumeDomainSummary(row: ResumeDomainRow): ResumeDomainSummary {
  return {
    domainId: row.id,
    domainType: row.domain_type,
    hostname: row.hostname,
    resumeId: row.resume_id,
    status: row.status,
  };
}

function formatTimestamp(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}

function formatNullableTimestamp(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return formatTimestamp(value);
}
