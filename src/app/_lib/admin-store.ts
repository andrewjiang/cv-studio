import "server-only";

import postgres from "postgres";
import { getPrimaryDomain } from "@/app/_lib/resume-domains";
import type { PlanKey } from "@/app/_lib/entitlements-core";

type SqlClient = postgres.Sql;

export type AdminMetricKey =
  | "users"
  | "resumes"
  | "published"
  | "paid"
  | "projects"
  | "pdf"
  | "webhooks"
  | "payments";

export type AdminMetric = {
  detail: string;
  key: AdminMetricKey;
  label: string;
  value: number;
};

export type AdminActivity = {
  action: string;
  occurredAt: string;
  projectSlug: string | null;
  quantity: number;
  userEmail: string | null;
};

export type AdminIssue = {
  count: number;
  href: string;
  label: string;
  tone: "amber" | "red" | "slate";
};

export type AdminOverview = {
  activity: AdminActivity[];
  issues: AdminIssue[];
  metrics: AdminMetric[];
};

export type AdminPaidAccount = {
  createdAt: string;
  email: string;
  name: string;
  planKey: string;
  source: "grant" | "subscription";
  status: string;
  userId: string;
};

export type AdminPaymentReceipt = {
  amountUsd: string;
  createdAt: string;
  currency: string;
  id: string;
  network: string | null;
  payer: string | null;
  protocol: string;
  routeKey: string;
};

export type AdminUserSummary = {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  planKey: PlanKey;
  projectSlug: string | null;
  resumeCount: number;
  updatedAt: string;
};

export type AdminUserDetail = AdminUserSummary & {
  billingCustomer: {
    stripeCustomerId: string | null;
  } | null;
  domains: AdminUserDomain[];
  grants: AdminPlanGrant[];
  project: AdminUserProject | null;
  resumes: AdminUserResume[];
  subscriptions: AdminSubscription[];
  usage: AdminUsageSummary[];
};

export type AdminUserResume = {
  id: string;
  isPublished: boolean;
  publicUrl: string | null;
  slug: string;
  templateKey: string;
  title: string;
  updatedAt: string;
};

export type AdminPlanGrant = {
  createdAt: string;
  expiresAt: string | null;
  planKey: string;
  reason: string | null;
  revokedAt: string | null;
  source: string;
};

export type AdminSubscription = {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  planKey: string;
  providerSubscriptionId: string;
  status: string;
  updatedAt: string;
};

export type AdminUserDomain = {
  domainType: string;
  hostname: string;
  resumeId: string;
  status: string;
  updatedAt: string;
};

export type AdminUserProject = {
  activeApiKeyCount: number;
  id: string;
  name: string;
  slug: string;
};

export type AdminUsageSummary = {
  action: string;
  lastOccurredAt: string;
  quantity: number;
};

export type AdminResumeSummary = {
  createdAt: string;
  createdVia: string;
  id: string;
  isPublished: boolean;
  ownerEmail: string | null;
  projectSlug: string | null;
  publicUrl: string | null;
  slug: string;
  templateKey: string;
  title: string;
  updatedAt: string;
};

export type AdminPdfJobSummary = {
  errorCode: string | null;
  errorMessage: string | null;
  id: string;
  projectSlug: string | null;
  requestedAt: string;
  resumeId: string;
  resumeTitle: string | null;
  status: string;
  updatedAt: string;
};

export type AdminWebhookDeliverySummary = {
  attemptCount: number;
  endpointUrl: string;
  eventType: string;
  id: string;
  lastError: string | null;
  nextAttemptAt: string | null;
  projectSlug: string | null;
  statusCode: number | null;
  updatedAt: string;
};

type AdminOverviewCountsRow = {
  paid: string | number;
  payments: string | number;
  pdf_failed: string | number;
  pdf_pending: string | number;
  projects: string | number;
  published: string | number;
  resumes: string | number;
  users: string | number;
  webhooks_due: string | number;
  webhooks_failed: string | number;
};

type AdminUserSummaryRow = {
  created_at: Date | string;
  email: string;
  id: string;
  name: string;
  plan_key: PlanKey | null;
  project_slug: string | null;
  resume_count: string | number;
  updated_at: Date | string;
};

type AdminActivityRow = {
  action: string;
  occurred_at: Date | string;
  project_slug: string | null;
  quantity: number;
  user_email: string | null;
};

type AdminUserResumeRow = {
  id: string;
  is_published: boolean;
  slug: string;
  template_key: string;
  title: string;
  updated_at: Date | string;
};

type AdminPlanGrantRow = {
  created_at: Date | string;
  expires_at: Date | string | null;
  plan_key: string;
  reason: string | null;
  revoked_at: Date | string | null;
  source: string;
};

type AdminSubscriptionRow = {
  cancel_at_period_end: boolean;
  current_period_end: Date | string | null;
  plan_key: string;
  provider_subscription_id: string;
  status: string;
  updated_at: Date | string;
};

type AdminUserDomainRow = {
  domain_type: string;
  hostname: string;
  resume_id: string;
  status: string;
  updated_at: Date | string;
};

type AdminUserProjectRow = {
  active_api_key_count: string | number;
  id: string;
  name: string;
  slug: string;
};

type AdminUsageSummaryRow = {
  action: string;
  last_occurred_at: Date | string;
  quantity: string | number;
};

type AdminResumeSummaryRow = {
  created_at: Date | string;
  created_via: string;
  id: string;
  is_published: boolean;
  owner_email: string | null;
  project_slug: string | null;
  slug: string;
  template_key: string;
  title: string;
  updated_at: Date | string;
};

type AdminPdfJobSummaryRow = {
  error_code: string | null;
  error_message: string | null;
  id: string;
  project_slug: string | null;
  requested_at: Date | string;
  resume_id: string;
  resume_title: string | null;
  status: string;
  updated_at: Date | string;
};

type AdminWebhookDeliverySummaryRow = {
  attempt_count: number;
  endpoint_url: string;
  event_type: string;
  id: string;
  last_error: string | null;
  next_attempt_at: Date | string | null;
  project_slug: string | null;
  status_code: number | null;
  updated_at: Date | string;
};

type AdminPaidAccountRow = {
  created_at: Date | string;
  email: string;
  name: string;
  plan_key: string;
  source: "grant" | "subscription";
  status: string;
  user_id: string;
};

type AdminPaymentReceiptRow = {
  amount_usd: string;
  created_at: Date | string;
  currency: string;
  id: string;
  network: string | null;
  payer: string | null;
  protocol: string;
  route_key: string;
};

export class AdminStoreUnavailableError extends Error {
  constructor(message = "Tiny CV admin requires DATABASE_URL.") {
    super(message);
    this.name = "AdminStoreUnavailableError";
  }
}

let adminSql: postgres.Sql | null = null;

export async function getAdminOverview(): Promise<AdminOverview> {
  const sql = getAdminSql();
  const [counts] = await sql<AdminOverviewCountsRow[]>`
    select
      (select count(*) from auth_users) as users,
      (select count(*) from resumes) as resumes,
      (select count(*) from resumes where is_published = true) as published,
      (
        select count(distinct user_id)
        from (
          select user_id from account_plan_grants
          where revoked_at is null
            and starts_at <= now()
            and (expires_at is null or expires_at > now())
          union
          select user_id from billing_subscriptions
          where status in ('active', 'trialing')
            and (current_period_end is null or current_period_end > now())
        ) paid_accounts
      ) as paid,
      (select count(*) from projects) as projects,
      (select count(*) from pdf_jobs where status in ('queued', 'processing')) as pdf_pending,
      (select count(*) from pdf_jobs where status = 'failed') as pdf_failed,
      (
        select count(*)
        from webhook_deliveries
        where delivered_at is null
          and next_attempt_at is not null
          and next_attempt_at <= now()
      ) as webhooks_due,
      (
        select count(*)
        from webhook_deliveries
        where delivered_at is null
          and attempt_count >= 3
      ) as webhooks_failed,
      (select count(*) from machine_payment_receipts) as payments
  `;
  const users = toNumber(counts?.users);
  const resumes = toNumber(counts?.resumes);
  const published = toNumber(counts?.published);
  const paid = toNumber(counts?.paid);
  const projects = toNumber(counts?.projects);
  const pdfPending = toNumber(counts?.pdf_pending);
  const pdfFailed = toNumber(counts?.pdf_failed);
  const webhooksDue = toNumber(counts?.webhooks_due);
  const webhooksFailed = toNumber(counts?.webhooks_failed);
  const payments = toNumber(counts?.payments);

  return {
    activity: [],
    issues: [
      { count: pdfFailed, href: "/admin/jobs?status=failed", label: "PDF failed", tone: pdfFailed > 0 ? "red" : "slate" },
      { count: pdfPending, href: "/admin/jobs?status=pending", label: "PDF pending", tone: pdfPending > 0 ? "amber" : "slate" },
      { count: webhooksFailed, href: "/admin/jobs?status=failed", label: "Webhook failed", tone: webhooksFailed > 0 ? "red" : "slate" },
      { count: webhooksDue, href: "/admin/jobs?status=due", label: "Webhook due", tone: webhooksDue > 0 ? "amber" : "slate" },
    ],
    metrics: [
      { detail: "Signed-in accounts", key: "users", label: "Users", value: users },
      { detail: `${published} published`, key: "resumes", label: "CVs", value: resumes },
      { detail: "Live public pages", key: "published", label: "Published", value: published },
      { detail: "Grant or subscription", key: "paid", label: "Paid", value: paid },
      { detail: "API and machine", key: "projects", label: "Projects", value: projects },
      { detail: `${pdfFailed} failed`, key: "pdf", label: "PDF jobs", value: pdfPending + pdfFailed },
      { detail: `${webhooksDue} due`, key: "webhooks", label: "Webhooks", value: webhooksFailed + webhooksDue },
      { detail: "Machine receipts", key: "payments", label: "Payments", value: payments },
    ],
  };
}

export async function searchAdminUsers(query: string, limit = 25): Promise<AdminUserSummary[]> {
  const sql = getAdminSql();
  const normalizedQuery = `%${query.trim().toLowerCase()}%`;
  const rows = query.trim()
    ? await sql<AdminUserSummaryRow[]>`
      with selected_users as (
        select id, name, email, created_at, updated_at
        from auth_users
        where lower(email) like ${normalizedQuery}
          or lower(name) like ${normalizedQuery}
          or lower(id) like ${normalizedQuery}
        order by created_at desc
        limit ${limit}
      )
      select
        u.id,
        u.name,
        u.email,
        u.created_at,
        u.updated_at,
        coalesce(resume_counts.resume_count, 0) as resume_count,
        coalesce(active_grant.plan_key, active_subscription.plan_key, 'free') as plan_key,
        project.slug as project_slug
      from selected_users u
      left join lateral (
        select count(*) as resume_count
        from user_resume_memberships membership
        where membership.user_id = u.id
          and membership.deleted_at is null
      ) resume_counts on true
      left join lateral (
        select plan_key
        from account_plan_grants
        where user_id = u.id
          and revoked_at is null
          and starts_at <= now()
          and (expires_at is null or expires_at > now())
        order by case plan_key when 'founder' then 1 when 'pro' then 2 else 99 end, created_at desc
        limit 1
      ) active_grant on true
      left join lateral (
        select plan_key
        from billing_subscriptions
        where user_id = u.id
          and status in ('active', 'trialing')
          and (current_period_end is null or current_period_end > now())
        order by case plan_key when 'founder' then 1 when 'pro' then 2 else 99 end, updated_at desc
        limit 1
      ) active_subscription on true
      left join account_developer_projects account_project on account_project.user_id = u.id
      left join projects project on project.id = account_project.project_id
      order by u.created_at desc
    `
    : await sql<AdminUserSummaryRow[]>`
      with selected_users as (
        select id, name, email, created_at, updated_at
        from auth_users
        order by created_at desc
        limit ${limit}
      )
      select
        u.id,
        u.name,
        u.email,
        u.created_at,
        u.updated_at,
        coalesce(resume_counts.resume_count, 0) as resume_count,
        coalesce(active_grant.plan_key, active_subscription.plan_key, 'free') as plan_key,
        project.slug as project_slug
      from selected_users u
      left join lateral (
        select count(*) as resume_count
        from user_resume_memberships membership
        where membership.user_id = u.id
          and membership.deleted_at is null
      ) resume_counts on true
      left join lateral (
        select plan_key
        from account_plan_grants
        where user_id = u.id
          and revoked_at is null
          and starts_at <= now()
          and (expires_at is null or expires_at > now())
        order by case plan_key when 'founder' then 1 when 'pro' then 2 else 99 end, created_at desc
        limit 1
      ) active_grant on true
      left join lateral (
        select plan_key
        from billing_subscriptions
        where user_id = u.id
          and status in ('active', 'trialing')
          and (current_period_end is null or current_period_end > now())
        order by case plan_key when 'founder' then 1 when 'pro' then 2 else 99 end, updated_at desc
        limit 1
      ) active_subscription on true
      left join account_developer_projects account_project on account_project.user_id = u.id
      left join projects project on project.id = account_project.project_id
      order by u.created_at desc
    `;

  return rows.map(toAdminUserSummary);
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const sql = getAdminSql();
  const [userRow] = await sql<AdminUserSummaryRow[]>`
    select
      u.id,
      u.name,
      u.email,
      u.created_at,
      u.updated_at,
      coalesce(resume_counts.resume_count, 0) as resume_count,
      coalesce(active_grant.plan_key, active_subscription.plan_key, 'free') as plan_key,
      project.slug as project_slug
    from auth_users u
    left join lateral (
      select count(*) as resume_count
      from user_resume_memberships membership
      where membership.user_id = u.id
        and membership.deleted_at is null
    ) resume_counts on true
    left join lateral (
      select plan_key
      from account_plan_grants
      where user_id = u.id
        and revoked_at is null
        and starts_at <= now()
        and (expires_at is null or expires_at > now())
      order by case plan_key when 'founder' then 1 when 'pro' then 2 else 99 end, created_at desc
      limit 1
    ) active_grant on true
    left join lateral (
      select plan_key
      from billing_subscriptions
      where user_id = u.id
        and status in ('active', 'trialing')
        and (current_period_end is null or current_period_end > now())
      order by case plan_key when 'founder' then 1 when 'pro' then 2 else 99 end, updated_at desc
      limit 1
    ) active_subscription on true
    left join account_developer_projects account_project on account_project.user_id = u.id
    left join projects project on project.id = account_project.project_id
    where u.id = ${userId}
    limit 1
  `;

  if (!userRow) {
    return null;
  }

  const user = toAdminUserSummary(userRow);
  const [
    resumeRows,
    grantRows,
    subscriptionRows,
    domainRows,
    projectRows,
    usageRows,
    customerRows,
  ] = await Promise.all([
    sql<AdminUserResumeRow[]>`
      select r.id, r.title, r.slug, r.template_key, r.is_published, r.updated_at
      from user_resume_memberships membership
      join resumes r on r.id = membership.resume_id
      where membership.user_id = ${userId}
        and membership.deleted_at is null
      order by membership.last_opened_at desc
    `,
    sql<AdminPlanGrantRow[]>`
      select plan_key, source, reason, expires_at, revoked_at, created_at
      from account_plan_grants
      where user_id = ${userId}
      order by created_at desc
      limit 20
    `,
    sql<AdminSubscriptionRow[]>`
      select provider_subscription_id, plan_key, status, current_period_end, cancel_at_period_end, updated_at
      from billing_subscriptions
      where user_id = ${userId}
      order by updated_at desc
      limit 20
    `,
    sql<AdminUserDomainRow[]>`
      select hostname, domain_type, status, resume_id, updated_at
      from resume_domains
      where user_id = ${userId}
      order by updated_at desc
      limit 20
    `,
    sql<AdminUserProjectRow[]>`
      select
        p.id,
        p.name,
        p.slug,
        coalesce(key_counts.active_api_key_count, 0) as active_api_key_count
      from account_developer_projects account_project
      join projects p on p.id = account_project.project_id
      left join lateral (
        select count(*) as active_api_key_count
        from project_api_keys
        where project_id = p.id
          and revoked_at is null
      ) key_counts on true
      where account_project.user_id = ${userId}
      limit 1
    `,
    sql<AdminUsageSummaryRow[]>`
      select action, sum(quantity) as quantity, max(occurred_at) as last_occurred_at
      from usage_events
      where user_id = ${userId}
        and occurred_at >= now() - interval '30 days'
      group by action
      order by last_occurred_at desc
      limit 20
    `,
    sql<{ stripe_customer_id: string | null }[]>`
      select stripe_customer_id
      from billing_customers
      where user_id = ${userId}
      limit 1
    `,
  ]);

  return {
    ...user,
    billingCustomer: customerRows[0]
      ? { stripeCustomerId: customerRows[0].stripe_customer_id }
      : null,
    domains: domainRows.map(toAdminUserDomain),
    grants: grantRows.map(toAdminPlanGrant),
    project: projectRows[0] ? toAdminUserProject(projectRows[0]) : null,
    resumes: resumeRows.map(toAdminUserResume),
    subscriptions: subscriptionRows.map(toAdminSubscription),
    usage: usageRows.map(toAdminUsageSummary),
  };
}

export async function searchAdminResumes(query: string, limit = 50): Promise<AdminResumeSummary[]> {
  const sql = getAdminSql();
  const normalizedQuery = `%${query.trim().toLowerCase()}%`;
  const rows = query.trim()
    ? await sql<AdminResumeSummaryRow[]>`
      select
        r.id,
        r.title,
        r.slug,
        r.template_key,
        r.created_via,
        r.is_published,
        r.created_at,
        r.updated_at,
        owner.email as owner_email,
        project.slug as project_slug
      from resumes r
      left join lateral (
        select u.email
        from user_resume_memberships membership
        join auth_users u on u.id = membership.user_id
        where membership.resume_id = r.id
          and membership.deleted_at is null
        order by membership.created_at asc
        limit 1
      ) owner on true
      left join projects project on project.id = r.source_project_id
      where lower(r.id) like ${normalizedQuery}
        or lower(r.title) like ${normalizedQuery}
        or lower(r.slug) like ${normalizedQuery}
        or lower(coalesce(owner.email, '')) like ${normalizedQuery}
      order by r.updated_at desc
      limit ${limit}
    `
    : await sql<AdminResumeSummaryRow[]>`
      select
        r.id,
        r.title,
        r.slug,
        r.template_key,
        r.created_via,
        r.is_published,
        r.created_at,
        r.updated_at,
        owner.email as owner_email,
        project.slug as project_slug
      from resumes r
      left join lateral (
        select u.email
        from user_resume_memberships membership
        join auth_users u on u.id = membership.user_id
        where membership.resume_id = r.id
          and membership.deleted_at is null
        order by membership.created_at asc
        limit 1
      ) owner on true
      left join projects project on project.id = r.source_project_id
      order by r.updated_at desc
      limit ${limit}
    `;

  return rows.map(toAdminResumeSummary);
}

export async function getAdminJobs(): Promise<{
  pdfJobs: AdminPdfJobSummary[];
  webhookDeliveries: AdminWebhookDeliverySummary[];
}> {
  const sql = getAdminSql();
  const [pdfRows, webhookRows] = await Promise.all([
    sql<AdminPdfJobSummaryRow[]>`
      select
        j.id,
        j.resume_id,
        j.status,
        j.error_code,
        j.error_message,
        j.requested_at,
        j.updated_at,
        r.title as resume_title,
        p.slug as project_slug
      from pdf_jobs j
      left join resumes r on r.id = j.resume_id
      left join projects p on p.id = j.project_id
      where j.status in ('queued', 'processing', 'failed')
      order by
        case j.status when 'failed' then 1 when 'processing' then 2 else 3 end,
        j.updated_at desc
      limit 50
    `,
    sql<AdminWebhookDeliverySummaryRow[]>`
      select
        d.id,
        d.event_type,
        d.status_code,
        d.attempt_count,
        d.last_error,
        d.next_attempt_at,
        d.updated_at,
        endpoint.url as endpoint_url,
        p.slug as project_slug
      from webhook_deliveries d
      join webhook_endpoints endpoint on endpoint.id = d.webhook_endpoint_id
      left join projects p on p.id = endpoint.project_id
      where d.delivered_at is null
        and (d.attempt_count > 0 or d.next_attempt_at is not null)
      order by d.updated_at desc
      limit 50
    `,
  ]);

  return {
    pdfJobs: pdfRows.map(toAdminPdfJobSummary),
    webhookDeliveries: webhookRows.map(toAdminWebhookDeliverySummary),
  };
}

export async function getAdminPaidAccounts(limit = 12): Promise<AdminPaidAccount[]> {
  const sql = getAdminSql();
  const rows = await sql<AdminPaidAccountRow[]>`
    select *
    from (
      select
        grant_row.user_id,
        u.email,
        u.name,
        grant_row.plan_key,
        ${"grant"} as source,
        case when grant_row.revoked_at is null then ${"active"} else ${"revoked"} end as status,
        grant_row.created_at
      from account_plan_grants grant_row
      join auth_users u on u.id = grant_row.user_id
      where grant_row.revoked_at is null
        and grant_row.starts_at <= now()
        and (grant_row.expires_at is null or grant_row.expires_at > now())

      union all

      select
        subscription.user_id,
        u.email,
        u.name,
        subscription.plan_key,
        ${"subscription"} as source,
        subscription.status,
        subscription.updated_at as created_at
      from billing_subscriptions subscription
      join auth_users u on u.id = subscription.user_id
      where subscription.status in ('active', 'trialing', 'past_due')
        and (subscription.current_period_end is null or subscription.current_period_end > now())
    ) paid_accounts
    order by created_at desc
    limit ${limit}
  `;

  return rows.map(toAdminPaidAccount);
}

export async function getAdminPaymentReceipts(limit = 12): Promise<AdminPaymentReceipt[]> {
  const sql = getAdminSql();
  const rows = await sql<AdminPaymentReceiptRow[]>`
    select
      id,
      protocol,
      route_key,
      amount_usd,
      currency,
      network,
      payer,
      created_at
    from machine_payment_receipts
    order by created_at desc
    limit ${limit}
  `;

  return rows.map(toAdminPaymentReceipt);
}

export async function getAdminActivity(limit = 50): Promise<AdminActivity[]> {
  return getRecentActivity(getAdminSql(), limit);
}

async function getRecentActivity(sql: SqlClient, limit = 12) {
  const rows = await sql<AdminActivityRow[]>`
    with recent_events as (
      select action, quantity, occurred_at, user_id, project_id
      from usage_events
      order by occurred_at desc
      limit ${limit}
    )
    select
      event.action,
      event.quantity,
      event.occurred_at,
      u.email as user_email,
      p.slug as project_slug
    from recent_events event
    left join auth_users u on u.id = event.user_id
    left join projects p on p.id = event.project_id
    order by event.occurred_at desc
  `;

  return rows.map((row) => ({
    action: row.action,
    occurredAt: formatTimestamp(row.occurred_at),
    projectSlug: row.project_slug,
    quantity: row.quantity,
    userEmail: row.user_email,
  }));
}

function toAdminUserSummary(row: AdminUserSummaryRow): AdminUserSummary {
  return {
    createdAt: formatTimestamp(row.created_at),
    email: row.email,
    id: row.id,
    name: row.name,
    planKey: row.plan_key ?? "free",
    projectSlug: row.project_slug,
    resumeCount: toNumber(row.resume_count),
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function toAdminUserResume(row: AdminUserResumeRow): AdminUserResume {
  return {
    id: row.id,
    isPublished: row.is_published,
    publicUrl: row.is_published ? buildPublicResumeUrl(row.slug) : null,
    slug: row.slug,
    templateKey: row.template_key,
    title: row.title,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function toAdminPlanGrant(row: AdminPlanGrantRow): AdminPlanGrant {
  return {
    createdAt: formatTimestamp(row.created_at),
    expiresAt: formatNullableTimestamp(row.expires_at),
    planKey: row.plan_key,
    reason: row.reason,
    revokedAt: formatNullableTimestamp(row.revoked_at),
    source: row.source,
  };
}

function toAdminSubscription(row: AdminSubscriptionRow): AdminSubscription {
  return {
    cancelAtPeriodEnd: row.cancel_at_period_end,
    currentPeriodEnd: formatNullableTimestamp(row.current_period_end),
    planKey: row.plan_key,
    providerSubscriptionId: row.provider_subscription_id,
    status: row.status,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function toAdminUserDomain(row: AdminUserDomainRow): AdminUserDomain {
  return {
    domainType: row.domain_type,
    hostname: row.hostname,
    resumeId: row.resume_id,
    status: row.status,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function toAdminUserProject(row: AdminUserProjectRow): AdminUserProject {
  return {
    activeApiKeyCount: toNumber(row.active_api_key_count),
    id: row.id,
    name: row.name,
    slug: row.slug,
  };
}

function toAdminUsageSummary(row: AdminUsageSummaryRow): AdminUsageSummary {
  return {
    action: row.action,
    lastOccurredAt: formatTimestamp(row.last_occurred_at),
    quantity: toNumber(row.quantity),
  };
}

function toAdminResumeSummary(row: AdminResumeSummaryRow): AdminResumeSummary {
  return {
    createdAt: formatTimestamp(row.created_at),
    createdVia: row.created_via,
    id: row.id,
    isPublished: row.is_published,
    ownerEmail: row.owner_email,
    projectSlug: row.project_slug,
    publicUrl: row.is_published ? buildPublicResumeUrl(row.slug) : null,
    slug: row.slug,
    templateKey: row.template_key,
    title: row.title,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function toAdminPdfJobSummary(row: AdminPdfJobSummaryRow): AdminPdfJobSummary {
  return {
    errorCode: row.error_code,
    errorMessage: row.error_message,
    id: row.id,
    projectSlug: row.project_slug,
    requestedAt: formatTimestamp(row.requested_at),
    resumeId: row.resume_id,
    resumeTitle: row.resume_title,
    status: row.status,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function toAdminWebhookDeliverySummary(row: AdminWebhookDeliverySummaryRow): AdminWebhookDeliverySummary {
  return {
    attemptCount: row.attempt_count,
    endpointUrl: row.endpoint_url,
    eventType: row.event_type,
    id: row.id,
    lastError: row.last_error,
    nextAttemptAt: formatNullableTimestamp(row.next_attempt_at),
    projectSlug: row.project_slug,
    statusCode: row.status_code,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function toAdminPaidAccount(row: AdminPaidAccountRow): AdminPaidAccount {
  return {
    createdAt: formatTimestamp(row.created_at),
    email: row.email,
    name: row.name,
    planKey: row.plan_key,
    source: row.source,
    status: row.status,
    userId: row.user_id,
  };
}

function toAdminPaymentReceipt(row: AdminPaymentReceiptRow): AdminPaymentReceipt {
  return {
    amountUsd: row.amount_usd,
    createdAt: formatTimestamp(row.created_at),
    currency: row.currency,
    id: row.id,
    network: row.network,
    payer: row.payer,
    protocol: row.protocol,
    routeKey: row.route_key,
  };
}

function buildPublicResumeUrl(slug: string) {
  const appUrl = process.env.TINYCV_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_TINYCV_APP_URL?.trim() ||
    `https://${getPrimaryDomain()}`;
  return `${appUrl.replace(/\/$/, "")}/${slug}`;
}

function getAdminSql() {
  if (!process.env.DATABASE_URL) {
    throw new AdminStoreUnavailableError();
  }

  adminSql ??= postgres(process.env.DATABASE_URL, {
    max: 5,
    prepare: false,
  });

  return adminSql;
}

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function formatNullableTimestamp(value: Date | string | null) {
  return value ? formatTimestamp(value) : null;
}
