#!/usr/bin/env node

import { randomUUID } from "node:crypto";

const baseUrl = normalizeOrigin(
  process.env.TINYCV_ACCOUNT_TEST_BASE_URL ||
    process.env.BASE_URL ||
    process.env.TINYCV_APP_URL ||
    `http://localhost:${process.env.PORT || "3101"}`,
);
const jar = createCookieJar();

async function main() {
  const runId = randomUUID().slice(0, 8);
  const email = `account-${runId}@example.com`;

  const bootstrapped = await request("/api/workspace/bootstrap", {
    body: {
      templateKey: "designer",
    },
    method: "POST",
  });
  assert(bootstrapped.resume?.id, "Workspace bootstrap did not return a resume id.");
  assert(bootstrapped.workspace?.resumes?.length === 1, "Workspace bootstrap did not create one resume.");

  const signedUp = await request("/api/auth/sign-up/email", {
    body: {
      email,
      name: "Account Claim Test",
      password: "password123",
    },
    method: "POST",
  });
  assert(signedUp.user?.id, "Sign up did not return a user id.");

  const claimed = await request("/api/account/claim-workspace", {
    method: "POST",
  });
  assert(claimed.claimedCount === 1, `Expected to claim 1 resume, claimed ${claimed.claimedCount}.`);
  assert(claimed.currentResumeId === bootstrapped.resume.id, "Claimed current resume did not match bootstrapped resume.");

  const opened = await rawRequest(`/account/resumes/${bootstrapped.resume.id}/open`, {
    redirect: "manual",
  });
  assert(opened.status === 307 || opened.status === 308, `Expected open route redirect, received ${opened.status}.`);

  const location = opened.headers.get("location") || "";
  assert(location.endsWith(`/studio/${bootstrapped.resume.id}`), `Open route redirected to unexpected location: ${location}`);

  const studio = await rawRequest(`/studio/${bootstrapped.resume.id}`);
  const html = await studio.text();

  assert(studio.ok, `Studio returned ${studio.status}.`);
  assert(html.includes("Maya Chen"), "Studio did not render the Designer template name.");
  assert(html.includes("Product Designer"), "Studio did not render the Designer template headline.");

  log(`Created user: ${signedUp.user.id}`);
  log(`Claimed resume: ${bootstrapped.resume.id}`);
  log(`Studio URL: ${baseUrl}/studio/${bootstrapped.resume.id}`);
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
  console.log(`[account-check] ${message}`);
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
  console.error(`[account-check] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
