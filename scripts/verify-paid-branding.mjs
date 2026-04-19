#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import postgres from "postgres";

const baseUrl = normalizeOrigin(
  process.env.TINYCV_BRANDING_TEST_BASE_URL ||
    process.env.BASE_URL ||
    process.env.TINYCV_APP_URL ||
    `http://localhost:${process.env.PORT || "3101"}`,
);
const jar = createCookieJar();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[branding-check] DATABASE_URL is required for paid branding verification.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});

async function main() {
  const runId = randomUUID().slice(0, 8);
  const grantId = `branding_check:${runId}`;
  let grantCreated = false;

  try {
    const bootstrapped = await request("/api/workspace/bootstrap", {
      body: {
        templateKey: "engineer",
      },
      method: "POST",
    });
    assert(bootstrapped.resume?.id, "Workspace bootstrap did not return a resume id.");
    assert(bootstrapped.resume?.markdown, "Workspace bootstrap did not return markdown.");

    const signedUp = await request("/api/auth/sign-up/email", {
      body: {
        email: `branding-${runId}@example.com`,
        name: "Paid Branding Test",
        password: "password123",
      },
      method: "POST",
    });
    assert(signedUp.user?.id, "Sign up did not return a user id.");

    const claimed = await request("/api/account/claim-workspace", {
      method: "POST",
    });
    assert(claimed.claimedCount === 1, `Expected to claim 1 resume, claimed ${claimed.claimedCount}.`);

    const published = await request(`/api/resumes/${bootstrapped.resume.id}/publish`, {
      body: {
        fitScale: bootstrapped.resume.fitScale,
        markdown: bootstrapped.resume.markdown,
      },
      method: "POST",
    });
    assert(published.publicUrl, "Publish did not return a public URL.");

    const freeHtml = await fetchText(published.publicUrl);
    assert(freeHtml.includes("Published with Tiny CV"), "Free public page did not show Tiny CV branding.");
    assert(freeHtml.includes("Create your own"), "Free public page did not show Tiny CV creation link.");
    log("Free branding is visible.");

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
        ${"Paid branding smoke test"},
        ${new Date()},
        ${null},
        ${null},
        ${sql.json({ run_id: runId })},
        ${new Date()},
        ${new Date()}
      )
    `;
    grantCreated = true;

    const paidHtml = await fetchText(published.publicUrl);
    assert(!paidHtml.includes("Published with Tiny CV"), "Paid public page still showed Tiny CV branding.");
    assert(!paidHtml.includes("Create your own"), "Paid public page still showed Tiny CV creation link.");
    assert(paidHtml.includes("Download PDF"), "Paid public page should still expose PDF download.");
    log("Paid branding is hidden.");

    log(`Public URL: ${published.publicUrl}`);
    log(`User: ${signedUp.user.id}`);
    log(`Resume: ${bootstrapped.resume.id}`);
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

async function fetchText(pathOrUrl) {
  const response = await fetch(absolutize(pathOrUrl), {
    headers: {
      cookie: jar.header(),
    },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`GET ${pathOrUrl} returned ${response.status}: ${text}`);
  }

  return text;
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message) {
  console.log(`[branding-check] ${message}`);
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

main().catch(async (error) => {
  await sql.end({ timeout: 5 }).catch(() => null);
  console.error(`[branding-check] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
