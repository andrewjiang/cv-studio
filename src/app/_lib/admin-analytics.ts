import "server-only";

import postgres from "postgres";
import { AdminStoreUnavailableError } from "@/app/_lib/admin-store";

type SqlClient = postgres.Sql;

export type AdminAnalyticsMetricSet = {
  pageViews: number;
  sessions: number;
  visitors: number;
};

export type AdminAnalyticsSourceRow = AdminAnalyticsMetricSet & {
  source: string;
};

export type AdminAnalyticsPageRow = {
  location: string;
  pageViews: number;
  visitors: number;
};

export type AdminAnalyticsPageSummary = {
  pageViews: number;
  topPages: AdminAnalyticsPageRow[];
  visitors: number;
};

export type AdminAnalyticsDailyRow = AdminAnalyticsMetricSet & {
  date: string;
};

export type AdminAnalyticsPayload = {
  daily: AdminAnalyticsDailyRow[];
  generatedAt: string;
  propertyId: string;
  resumePages24h: AdminAnalyticsPageSummary;
  resumePages7d: AdminAnalyticsPageSummary;
  sources24h: AdminAnalyticsSourceRow[];
  sources7d: AdminAnalyticsSourceRow[];
  topPages24h: AdminAnalyticsPageSummary;
  topPages7d: AdminAnalyticsPageSummary;
  traffic24h: AdminAnalyticsMetricSet;
  traffic7d: AdminAnalyticsMetricSet;
};

export type AdminAnalyticsSnapshot = {
  createdAt: string;
  generatedAt: string;
  id: string;
  payload: AdminAnalyticsPayload;
  periodHours: number;
  propertyId: string;
  source: string;
};

type AdminAnalyticsSnapshotRow = {
  created_at: Date | string;
  generated_at: Date | string;
  id: string;
  payload: AdminAnalyticsPayload | string;
  period_hours: number | string;
  property_id: string;
  source: string;
};

let adminAnalyticsSql: postgres.Sql | null = null;

export async function getLatestAdminAnalyticsSnapshot(): Promise<AdminAnalyticsSnapshot | null> {
  const sql = getAdminAnalyticsSql();

  try {
    const [row] = await sql<AdminAnalyticsSnapshotRow[]>`
      select id, source, property_id, generated_at, period_hours, payload, created_at
      from admin_analytics_snapshots
      order by generated_at desc
      limit 1
    `;

    return row ? toAdminAnalyticsSnapshot(row) : null;
  } catch (error) {
    if (isMissingAnalyticsTableError(error)) {
      return null;
    }

    throw error;
  }
}

export function isAdminAnalyticsStale(snapshot: AdminAnalyticsSnapshot | null, staleAfterHours = 8) {
  if (!snapshot) {
    return true;
  }

  const generatedAt = new Date(snapshot.generatedAt).getTime();
  if (!Number.isFinite(generatedAt)) {
    return true;
  }

  return Date.now() - generatedAt > staleAfterHours * 60 * 60 * 1000;
}

export function displayAnalyticsLocation(location: string) {
  try {
    const url = new URL(location);
    const host = url.hostname.toLowerCase();

    if (["tiny.cv", "www.tiny.cv", "cvstudio.vercel.app"].includes(host)) {
      return `${url.pathname}${url.search}`;
    }

    return `${url.hostname}${url.pathname}${url.search}`;
  } catch {
    return location;
  }
}

function toAdminAnalyticsSnapshot(row: AdminAnalyticsSnapshotRow): AdminAnalyticsSnapshot {
  return {
    createdAt: formatTimestamp(row.created_at),
    generatedAt: formatTimestamp(row.generated_at),
    id: row.id,
    payload: normalizePayload(row.payload),
    periodHours: toNumber(row.period_hours),
    propertyId: row.property_id,
    source: row.source,
  };
}

function normalizePayload(payload: AdminAnalyticsSnapshotRow["payload"]): AdminAnalyticsPayload {
  if (typeof payload === "string") {
    return JSON.parse(payload) as AdminAnalyticsPayload;
  }

  return payload;
}

function getAdminAnalyticsSql(): SqlClient {
  if (!process.env.DATABASE_URL) {
    throw new AdminStoreUnavailableError();
  }

  adminAnalyticsSql ??= postgres(process.env.DATABASE_URL, {
    max: 2,
    prepare: false,
  });

  return adminAnalyticsSql;
}

function isMissingAnalyticsTableError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "42P01");
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
