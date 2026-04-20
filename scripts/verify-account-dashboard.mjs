#!/usr/bin/env node

import { randomUUID } from "node:crypto";

const baseUrl = normalizeOrigin(
  process.env.TINYCV_DASHBOARD_TEST_BASE_URL ||
    process.env.BASE_URL ||
    process.env.TINYCV_APP_URL ||
    `http://localhost:${process.env.PORT || "3101"}`,
);
const jar = createCookieJar();

async function main() {
  const runId = randomUUID().slice(0, 8);
  const email = `dashboard-${runId}@example.com`;

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
      email,
      name: "Dashboard Smoke Test",
      password: "password123",
    },
    method: "POST",
  });
  assert(signedUp.user?.id, "Sign up did not return a user id.");

  const claimed = await request("/api/account/claim-workspace", {
    method: "POST",
  });
  assert(claimed.claimedCount === 1, `Expected to claim 1 resume, claimed ${claimed.claimedCount}.`);

  const rejectedPrimary = await rawRequest(`/api/account/resumes/${bootstrapped.resume.id}/primary`, {
    method: "POST",
  });
  const rejectedText = await rejectedPrimary.text();
  assert(
    rejectedPrimary.status === 400,
    `Expected draft primary selection to return 400, received ${rejectedPrimary.status}: ${rejectedText}`,
  );

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
  assert(primary.primaryResumeId === bootstrapped.resume.id, "Primary resume id did not match the published resume.");
  assert(primary.publicUrl, "Primary response did not return a public URL.");

  const accountHtml = await fetchText("/account");
  assert(accountHtml.includes("Your resume library"), "Dashboard did not render the resume library.");
  assert(accountHtml.includes("Public identity"), "Dashboard did not render the publishing section.");
  assert(accountHtml.includes("Primary"), "Dashboard did not mark the primary resume.");
  assert(accountHtml.includes(bootstrapped.resume.title), "Dashboard did not include the resume title.");

  const publicHtml = await fetchText(published.publicUrl);
  assert(publicHtml.includes("Download PDF"), "Public resume did not render the public footer.");

  log(`Created user: ${signedUp.user.id}`);
  log(`Primary resume: ${bootstrapped.resume.id}`);
  log(`Public URL: ${published.publicUrl}`);
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
  const response = await rawRequest(pathOrUrl);
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
  console.log(`[dashboard-check] ${message}`);
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

main().catch((error) => {
  console.error(`[dashboard-check] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
