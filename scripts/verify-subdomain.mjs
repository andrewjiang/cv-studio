#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const baseUrl = normalizeOrigin(
  process.env.TINYCV_SUBDOMAIN_TEST_BASE_URL ||
    process.env.BASE_URL ||
    process.env.TINYCV_APP_URL ||
    `http://localhost:${process.env.PORT || "3101"}`,
);
const primaryDomain = normalizeHostname(process.env.TINYCV_PRIMARY_DOMAIN || "tiny.cv");
const jar = createCookieJar();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[subdomain-check] DATABASE_URL is required for subdomain verification.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});

async function main() {
  const runId = randomUUID().slice(0, 8).toLowerCase();
  const subdomain = `cv-${runId}`;
  const hostname = `${subdomain}.${primaryDomain}`;
  const grantId = `subdomain_check:${runId}`;
  let grantCreated = false;

  try {
    const bootstrapped = await request("/api/workspace/bootstrap", {
      body: {
        templateKey: "founder",
      },
      method: "POST",
    });
    assert(bootstrapped.resume?.id, "Workspace bootstrap did not return a resume id.");
    assert(bootstrapped.resume?.markdown, "Workspace bootstrap did not return markdown.");

    const signedUp = await request("/api/auth/sign-up/email", {
      body: {
        email: `subdomain-${runId}@example.com`,
        name: "Subdomain Smoke Test",
        password: "password123",
      },
      method: "POST",
    });
    assert(signedUp.user?.id, "Sign up did not return a user id.");

    const claimed = await request("/api/account/claim-workspace", {
      method: "POST",
    });
    assert(claimed.claimedCount === 1, `Expected to claim 1 resume, claimed ${claimed.claimedCount}.`);

    await sql`
      insert into account_plan_grants (
        id,
        user_id,
        plan_key,
        source,
        reason,
        starts_at,
        expires_at,
        revoked_at,
        metadata,
        created_at,
        updated_at
      ) values (
        ${grantId},
        ${signedUp.user.id},
        ${"founder"},
        ${"support"},
        ${"Subdomain smoke test"},
        ${new Date()},
        ${null},
        ${null},
        ${sql.json({ run_id: runId })},
        ${new Date()},
        ${new Date()}
      )
    `;
    grantCreated = true;

    const published = await request(`/api/resumes/${bootstrapped.resume.id}/publish`, {
      body: {
        fitScale: bootstrapped.resume.fitScale,
        markdown: bootstrapped.resume.markdown,
      },
      method: "POST",
    });
    assert(published.publicUrl, "Publish did not return a public URL.");

    const primary = await request(`/api/account/resumes/${bootstrapped.resume.id}/primary`, {
      method: "POST",
    });
    assert(primary.primaryResumeId === bootstrapped.resume.id, "Primary resume id did not match.");

    const domain = await request("/api/account/domains/subdomain", {
      body: {
        resumeId: bootstrapped.resume.id,
        subdomain,
      },
      method: "POST",
    });
    assert(domain.hostname === hostname, `Expected ${hostname}, received ${domain.hostname}.`);
    assert(domain.status === "active", `Expected active domain, received ${domain.status}.`);

    const html = await fetchDomainText(hostname);
    assert(html.includes("Download PDF"), "Subdomain did not render a public resume page.");
    assert(!html.includes("Published with Tiny CV"), "Paid subdomain page should not show Tiny CV branding.");

    log(`Created user: ${signedUp.user.id}`);
    log(`Resume: ${bootstrapped.resume.id}`);
    log(`Verified temporary subdomain: https://${hostname}`);
    log("This URL is expected to return 404 after the temporary Founder grant is revoked.");
  } finally {
    if (grantCreated) {
      await sql`
        update account_plan_grants
        set
          revoked_at = ${new Date()},
          updated_at = ${new Date()}
        where id = ${grantId}
      `;
      log("Temporary Founder grant revoked.");
    }

    await sql.end({ timeout: 5 });
  }
}

async function request(path, options = {}) {
  const response = await rawRequest(path, options);
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} returned ${response.status}: ${text}`);
  }

  return json;
}

async function rawRequest(path, options = {}) {
  const response = await fetch(absolutize(path), {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      cookie: jar.header(),
      "content-type": "application/json",
      origin: baseUrl,
      ...(options.headers || {}),
    },
    method: options.method || "GET",
    redirect: options.redirect,
  });

  jar.capture(response.headers);
  return response;
}

async function fetchDomainText(hostname) {
  const base = new URL(baseUrl);
  const isLocal = base.hostname === "localhost" || base.hostname === "127.0.0.1";
  const response = isLocal
    ? await fetchLocalWithHost(base, hostname)
    : await fetchTextResponse(`https://${hostname}`);
  const { status, text } = response;

  if (status < 200 || status >= 300) {
    throw new Error(`GET ${hostname} returned ${status}: ${text}`);
  }

  return text;
}

function fetchLocalWithHost(base, hostname) {
  const client = base.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.request(
      {
        headers: {
          host: hostname,
        },
        hostname: base.hostname,
        method: "GET",
        path: "/",
        port: base.port,
      },
      (response) => {
        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode || 0,
            text,
          });
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
}

async function fetchTextResponse(url) {
  const response = await fetch(url);

  return {
    status: response.status,
    text: await response.text(),
  };
}

function absolutize(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, "");
}

function normalizeHostname(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/:\d+$/, "");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message) {
  console.log(`[subdomain-check] ${message}`);
}

function createCookieJar() {
  const cookies = new Map();

  return {
    capture(headers) {
      const setCookie = headers.getSetCookie?.() || readSetCookieFallback(headers);

      for (const cookie of setCookie) {
        const [pair] = cookie.split(";");
        const separatorIndex = pair.indexOf("=");

        if (separatorIndex === -1) {
          continue;
        }

        cookies.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
      }
    },

    header() {
      return Array.from(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");
    },
  };
}

function readSetCookieFallback(headers) {
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

async function loadEnvFile(fileName) {
  try {
    const contents = await readFile(path.join(repoRoot, fileName), "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

      process.env[key] ??= value;
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

main().catch(async (error) => {
  await sql.end({ timeout: 5 }).catch(() => null);
  console.error(`[subdomain-check] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
