#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { randomUUID, sign as cryptoSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

const DEFAULT_GA_PROPERTY_ID = "538793454";
const APP_HOSTS = new Set(["tiny.cv", "www.tiny.cv", "cvstudio.vercel.app"]);
const NON_RESUME_SEGMENTS = new Set([
  "_next",
  "about",
  "account",
  "admin",
  "agents",
  "api",
  "blog",
  "claim",
  "contact",
  "cvs",
  "developers",
  "docs",
  "documentation",
  "examples",
  "favicon.ico",
  "internal",
  "manifest.webmanifest",
  "new",
  "privacy",
  "robots.txt",
  "sitemap.xml",
  "studio",
  "templates",
  "terms",
]);

if (isDirectInvocation()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const options = parseArgs(process.argv.slice(2));
  const result = await refreshAdminAnalytics(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.message);
}

export async function refreshAdminAnalytics(input = {}) {
  const options = {
    force: Boolean(input.force),
    json: Boolean(input.json),
    maxAgeHours: input.maxAgeHours ?? defaultMaxAgeHours(),
  };
  const databaseUrl = process.env.DATABASE_URL;
  const propertyId = process.env.TINYCV_GA4_PROPERTY_ID || DEFAULT_GA_PROPERTY_ID;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to refresh admin analytics.");
  }

  const sql = postgres(databaseUrl, { max: 2, prepare: false });

  try {
    await ensureAnalyticsTable(sql);

    const latest = await latestSnapshot(sql, propertyId);
    if (!options.force && latest && !isStale(latest.generated_at, options.maxAgeHours)) {
      const message = `Admin analytics cache is fresh; latest snapshot generated ${new Date(latest.generated_at).toISOString()}.`;
      return {
        generatedAt: new Date(latest.generated_at).toISOString(),
        message,
        refreshed: false,
      };
    }

    const token = await getGoogleAccessToken();
    const stockResumeSlugs = await getStockResumeSlugs(sql);
    const payload = await buildAnalyticsPayload({ propertyId, stockResumeSlugs, token });
    const id = randomUUID();

    await sql`
      insert into admin_analytics_snapshots (id, source, property_id, generated_at, period_hours, payload)
      values (${id}, 'ga4', ${propertyId}, ${payload.generatedAt}, ${options.maxAgeHours}, ${sql.json(payload)})
    `;
    await sql`
      delete from admin_analytics_snapshots
      where created_at < now() - interval '180 days'
    `;

    return {
      generatedAt: payload.generatedAt,
      id,
      message: `Stored GA4 analytics snapshot ${id}: ${payload.traffic24h.visitors} visitors, ` +
        `${payload.traffic24h.pageViews} page views, ${payload.resumePages24h.pageViews} resume-page views in 24h.`,
      payload,
      refreshed: true,
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function isDirectInvocation() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

function parseArgs(args) {
  const maxAgeArg = args.find((arg) => arg.startsWith("--max-age-hours="));
  const argHours = maxAgeArg ? Number(maxAgeArg.split("=")[1]) : NaN;
  const maxAgeHours = Number.isFinite(argHours)
    ? argHours
    : defaultMaxAgeHours();

  return {
    force: args.includes("--force"),
    json: args.includes("--json"),
    maxAgeHours,
  };
}

function defaultMaxAgeHours() {
  const envHours = Number(process.env.TINYCV_ANALYTICS_REFRESH_HOURS || 6);
  return Number.isFinite(envHours) ? envHours : 6;
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const contents = readFileSync(path, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function ensureAnalyticsTable(sql) {
  await sql`
    create table if not exists admin_analytics_snapshots (
      id text primary key,
      source text not null default 'ga4',
      property_id text not null,
      generated_at timestamptz not null,
      period_hours integer not null default 6,
      payload jsonb not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists admin_analytics_snapshots_generated_at_idx
    on admin_analytics_snapshots(generated_at desc)
  `;
}

async function latestSnapshot(sql, propertyId) {
  const [row] = await sql`
    select generated_at
    from admin_analytics_snapshots
    where property_id = ${propertyId}
    order by generated_at desc
    limit 1
  `;

  return row || null;
}

function isStale(generatedAt, maxAgeHours) {
  const timestamp = new Date(generatedAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > maxAgeHours * 60 * 60 * 1000;
}

async function getGoogleAccessToken() {
  const envToken = process.env.TINYCV_GA4_ACCESS_TOKEN?.trim();
  if (envToken) {
    return envToken;
  }

  const serviceAccount = getGoogleServiceAccount();
  if (serviceAccount) {
    return getGoogleServiceAccountAccessToken(serviceAccount);
  }

  try {
    return execFileSync("gcloud", ["auth", "application-default", "print-access-token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new Error(`Failed to get Google ADC access token: ${formatCommandError(error)}`);
  }
}

function getGoogleServiceAccount() {
  const encoded = process.env.TINYCV_GA4_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  const raw = encoded
    ? Buffer.from(encoded, "base64").toString("utf8")
    : process.env.TINYCV_GA4_SERVICE_ACCOUNT_JSON?.trim();

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("missing client_email or private_key");
    }

    return {
      clientEmail: String(parsed.client_email),
      privateKey: String(parsed.private_key).replace(/\\n/g, "\n"),
    };
  } catch (error) {
    throw new Error(`Invalid TINYCV_GA4_SERVICE_ACCOUNT_JSON_BASE64: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getGoogleServiceAccountAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signServiceAccountJwt({
    claims: {
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 55 * 60,
      iat: now,
      iss: serviceAccount.clientEmail,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
    },
    privateKey: serviceAccount.privateKey,
  });
  const body = new URLSearchParams({
    assertion,
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    throw new Error(`Google service account token request failed with HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  return String(payload.access_token);
}

function signServiceAccountJwt({ claims, privateKey }) {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  const signature = cryptoSign("RSA-SHA256", Buffer.from(unsigned), privateKey);
  return `${unsigned}.${base64Url(signature)}`;
}

function base64UrlJson(value) {
  return base64Url(Buffer.from(JSON.stringify(value)));
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getStockResumeSlugs(sql) {
  const rows = await sql`
    with stock_names as (
      select *
      from (values
        ('Alex Morgan'),
        ('Maya Chen'),
        ('Jordan Reyes'),
        ('Avery Brooks'),
        ('Jordan Lee')
      ) as names(name)
    )
    select slug
    from resumes r
    where exists (
      select 1
      from stock_names stock
      where r.markdown ilike '%# ' || stock.name || '%'
         or coalesce(r.published_markdown, '') ilike '%# ' || stock.name || '%'
         or r.title ilike '%' || stock.name || '%'
    )
  `;

  return new Set(rows.map((row) => String(row.slug).toLowerCase()));
}

async function buildAnalyticsPayload({ propertyId, stockResumeSlugs, token }) {
  const now = new Date();
  const last24Start = dateHour(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const nowHour = dateHour(now);

  const [sources24hPayload, sources7dPayload, pages24hPayload, pages7dPayload, dailyPayload] = await Promise.all([
    runGaReport(propertyId, token, rollingSourceReportBody()),
    runGaReport(propertyId, token, sourceReportBody("7daysAgo")),
    runGaReport(propertyId, token, rollingPageReportBody()),
    runGaReport(propertyId, token, pageReportBody("7daysAgo")),
    runGaReport(propertyId, token, dailyReportBody("30daysAgo")),
  ]);

  const sources24h = parseRollingSourceRows(sources24hPayload, last24Start, nowHour);
  const sources7d = parseSourceRows(sources7dPayload);
  const pages24h = parseRollingPageRows(pages24hPayload, last24Start, nowHour);
  const pages7d = parsePageRows(pages7dPayload);

  return {
    daily: parseDailyRows(dailyPayload),
    generatedAt: now.toISOString(),
    propertyId,
    resumePages24h: summarizePageRows(pages24h.filter((page) => isResumePage(page.location, stockResumeSlugs))),
    resumePages7d: summarizePageRows(pages7d.filter((page) => isResumePage(page.location, stockResumeSlugs))),
    sources24h,
    sources7d,
    topPages24h: summarizePageRows(pages24h),
    topPages7d: summarizePageRows(pages7d),
    traffic24h: summarizeSources(sources24h),
    traffic7d: summarizeSources(sources7d),
  };
}

function rollingSourceReportBody() {
  return {
    dateRanges: [{ startDate: "2daysAgo", endDate: "today" }],
    dimensions: [{ name: "dateHour" }, { name: "sessionSourceMedium" }],
    limit: "10000",
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
    ],
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
  };
}

function sourceReportBody(startDate) {
  return {
    dateRanges: [{ startDate, endDate: "today" }],
    dimensions: [{ name: "sessionSourceMedium" }],
    limit: "50",
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
    ],
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
  };
}

function rollingPageReportBody() {
  return {
    dateRanges: [{ startDate: "2daysAgo", endDate: "today" }],
    dimensions: [{ name: "dateHour" }, { name: "pageLocation" }],
    limit: "10000",
    metrics: [
      { name: "activeUsers" },
      { name: "screenPageViews" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
  };
}

function pageReportBody(startDate) {
  return {
    dateRanges: [{ startDate, endDate: "today" }],
    dimensions: [{ name: "pageLocation" }],
    limit: "10000",
    metrics: [
      { name: "activeUsers" },
      { name: "screenPageViews" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
  };
}

function dailyReportBody(startDate) {
  return {
    dateRanges: [{ startDate, endDate: "today" }],
    dimensions: [{ name: "date" }],
    limit: "60",
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
    ],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  };
}

async function runGaReport(propertyId, token, body) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`GA4 Data API report failed with HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function parseSourceRows(payload) {
  return (payload.rows || []).map((row) => ({
    pageViews: numberValue(row.metricValues?.[2]?.value),
    sessions: numberValue(row.metricValues?.[1]?.value),
    source: row.dimensionValues?.[0]?.value || "(unknown)",
    visitors: numberValue(row.metricValues?.[0]?.value),
  }));
}

function parseRollingSourceRows(payload, startDateHour, endDateHour) {
  const sources = new Map();

  for (const row of payload.rows || []) {
    const rowDateHour = row.dimensionValues?.[0]?.value || "";
    if (rowDateHour < startDateHour || rowDateHour > endDateHour) continue;

    const source = row.dimensionValues?.[1]?.value || "(unknown)";
    const existing = sources.get(source) || {
      pageViews: 0,
      sessions: 0,
      source,
      visitors: 0,
    };

    existing.visitors += numberValue(row.metricValues?.[0]?.value);
    existing.sessions += numberValue(row.metricValues?.[1]?.value);
    existing.pageViews += numberValue(row.metricValues?.[2]?.value);
    sources.set(source, existing);
  }

  return [...sources.values()].sort((a, b) => b.visitors - a.visitors);
}

function parsePageRows(payload) {
  return (payload.rows || []).map((row) => ({
    location: row.dimensionValues?.[0]?.value || "",
    pageViews: numberValue(row.metricValues?.[1]?.value),
    visitors: numberValue(row.metricValues?.[0]?.value),
  }));
}

function parseRollingPageRows(payload, startDateHour, endDateHour) {
  const pages = new Map();

  for (const row of payload.rows || []) {
    const rowDateHour = row.dimensionValues?.[0]?.value || "";
    if (rowDateHour < startDateHour || rowDateHour > endDateHour) continue;

    const location = row.dimensionValues?.[1]?.value || "";
    const existing = pages.get(location) || {
      location,
      pageViews: 0,
      visitors: 0,
    };

    existing.visitors += numberValue(row.metricValues?.[0]?.value);
    existing.pageViews += numberValue(row.metricValues?.[1]?.value);
    pages.set(location, existing);
  }

  return [...pages.values()].sort((a, b) => b.pageViews - a.pageViews);
}

function parseDailyRows(payload) {
  return (payload.rows || []).map((row) => ({
    date: isoDateFromGaDate(row.dimensionValues?.[0]?.value || ""),
    pageViews: numberValue(row.metricValues?.[2]?.value),
    sessions: numberValue(row.metricValues?.[1]?.value),
    visitors: numberValue(row.metricValues?.[0]?.value),
  }));
}

function summarizeSources(rows) {
  return rows.reduce((summary, row) => ({
    pageViews: summary.pageViews + row.pageViews,
    sessions: summary.sessions + row.sessions,
    visitors: summary.visitors + row.visitors,
  }), { pageViews: 0, sessions: 0, visitors: 0 });
}

function summarizePageRows(rows) {
  return {
    pageViews: rows.reduce((sum, row) => sum + row.pageViews, 0),
    topPages: rows
      .filter((row) => row.location)
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 25),
    visitors: rows.reduce((sum, row) => sum + row.visitors, 0),
  };
}

function isResumePage(location, stockResumeSlugs = new Set()) {
  let url;

  try {
    url = new URL(location);
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname || "/";

  if (!APP_HOSTS.has(host) && !host.endsWith(".vercel.app")) {
    return true;
  }

  if (path === "/") return false;

  const segment = decodeURIComponent(path.split("/").filter(Boolean)[0] || "").toLowerCase();
  if (!segment || NON_RESUME_SEGMENTS.has(segment)) return false;
  if (segment.includes(".")) return false;
  if (stockResumeSlugs.has(segment)) return false;

  return true;
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateHour(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  return `${year}${month}${day}${hour}`;
}

function isoDateFromGaDate(value) {
  if (!/^\d{8}$/.test(value)) {
    return value;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function formatCommandError(error) {
  if (error && typeof error === "object") {
    const stderr = error.stderr?.toString?.().trim();
    const message = error.message || "";
    return stderr || message;
  }

  return String(error);
}
