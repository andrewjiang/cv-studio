#!/usr/bin/env node

import { randomUUID } from "node:crypto";

const baseUrl = normalizeOrigin(
  process.env.TINYCV_BILLING_TEST_BASE_URL ||
    process.env.BASE_URL ||
    process.env.TINYCV_APP_URL ||
    `http://localhost:${process.env.PORT || "3101"}`,
);
const jar = createCookieJar();

async function main() {
  await assertCheckoutRejectedWhenSignedOut();

  const runId = randomUUID().slice(0, 8);
  const signedUp = await request("/api/auth/sign-up/email", {
    body: {
      email: `billing-${runId}@example.com`,
      name: "Billing Checkout Test",
      password: "password123",
    },
    method: "POST",
  });

  assert(signedUp.user?.id, "Sign up did not return a user id.");

  await assertInvalidPlanRejected();
  await assertCheckoutCreated("founder");
  await assertCheckoutCreated("pro");

  log(`Created user: ${signedUp.user.id}`);
}

async function assertCheckoutRejectedWhenSignedOut() {
  const response = await rawRequest("/api/billing/checkout", {
    body: {
      planKey: "founder",
    },
    method: "POST",
    useCookies: false,
  });

  assert(response.status === 401, `Expected signed-out checkout to return 401, received ${response.status}.`);
  log("Signed-out checkout rejected.");
}

async function assertInvalidPlanRejected() {
  const response = await rawRequest("/api/billing/checkout", {
    body: {
      planKey: "free",
    },
    method: "POST",
  });

  assert(response.status === 400, `Expected invalid checkout plan to return 400, received ${response.status}.`);
  log("Invalid checkout plan rejected.");
}

async function assertCheckoutCreated(planKey) {
  const checkout = await request("/api/billing/checkout", {
    body: {
      planKey,
    },
    method: "POST",
  });

  assert(checkout.sessionId?.startsWith("cs_"), `${planKey} checkout did not return a Checkout Session id.`);
  assert(
    checkout.checkoutUrl?.startsWith("https://checkout.stripe.com/"),
    `${planKey} checkout did not return a Stripe Checkout URL.`,
  );
  log(`${planKey} checkout session created.`);
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
      ...(options.useCookies === false ? {} : { cookie: jar.header() }),
      "content-type": "application/json",
      origin: baseUrl,
      ...(options.headers || {}),
    },
    method: options.method || "GET",
    redirect: options.redirect,
  });

  if (options.useCookies !== false) {
    jar.capture(response.headers);
  }

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
  console.log(`[billing-check] ${message}`);
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
  console.error(`[billing-check] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
