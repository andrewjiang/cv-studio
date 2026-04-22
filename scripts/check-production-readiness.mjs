#!/usr/bin/env node

const checks = [];
const warnings = [];

const requiredSecrets = [
  "DATABASE_URL",
  "TINYCV_APP_URL",
  "TINYCV_EDITOR_SECRET",
  "TINYCV_PLATFORM_SECRET",
  "TINYCV_PLATFORM_BOOTSTRAP_SECRET",
];
const workerSecret = env("TINYCV_WORKER_SECRET");
const cronSecret = env("CRON_SECRET");
const browserWsEndpoint = env("TINYCV_BROWSER_WS_ENDPOINT") || env("BROWSERLESS_WS_ENDPOINT");
const chromeExecutablePath = env("TINYCV_CHROME_EXECUTABLE_PATH");

for (const name of requiredSecrets) {
  requireEnv(name);
}

requireStrongSecret("TINYCV_EDITOR_SECRET", 32);
requireStrongSecret("TINYCV_PLATFORM_SECRET", 32);
requireStrongSecret("TINYCV_PLATFORM_BOOTSTRAP_SECRET", 24);

if (env("BETTER_AUTH_SECRET")) {
  requireStrongSecret("BETTER_AUTH_SECRET", 32);
} else {
  warn("better-auth-secret", "BETTER_AUTH_SECRET is not set. Tiny CV will fall back to TINYCV_PLATFORM_SECRET for account sessions.");
}

if (!env("BETTER_AUTH_URL")) {
  warn("better-auth-url", "BETTER_AUTH_URL is not set. Tiny CV will fall back to TINYCV_APP_URL.");
}

if (!workerSecret && !cronSecret) {
  fail("worker-secret", "Set TINYCV_WORKER_SECRET or CRON_SECRET so /api/v1/jobs/process is protected.");
} else {
  pass("worker-secret", "Worker endpoint has a configured secret.");
}

if (workerSecret) {
  requireStrongSecret("TINYCV_WORKER_SECRET", 24);
}

if (cronSecret) {
  requireStrongSecret("CRON_SECRET", 24);
}

if (!browserWsEndpoint && !chromeExecutablePath) {
  fail(
    "pdf-browser",
    "Set TINYCV_BROWSER_WS_ENDPOINT for Browserless/CDP or TINYCV_CHROME_EXECUTABLE_PATH for a dedicated Chrome binary.",
  );
} else if (browserWsEndpoint) {
  pass("pdf-browser", "PDF rendering is configured for a remote browser endpoint.");
} else {
  warn(
    "pdf-browser",
    "PDF rendering is configured with TINYCV_CHROME_EXECUTABLE_PATH. This is fine for a server/worker, but remote Browserless/CDP is preferred on Vercel.",
  );
}

if (env("TINYCV_RUNTIME_SCHEMA_SYNC") === "true") {
  fail("schema-sync", "TINYCV_RUNTIME_SCHEMA_SYNC must be false in production. Run pnpm db:migrate before deploy instead.");
} else {
  pass("schema-sync", "Runtime schema sync is disabled.");
}

const appUrl = env("TINYCV_APP_URL");

if (appUrl) {
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      warn("app-url", "TINYCV_APP_URL is not HTTPS. Production should use the public HTTPS origin.");
    } else {
      pass("app-url", "TINYCV_APP_URL is a valid origin.");
    }
  } catch {
    fail("app-url", "TINYCV_APP_URL must be a valid URL, for example https://tiny.cv.");
  }
}

if (!env("NEXT_PUBLIC_TINYCV_TURNSTILE_SITE_KEY") || !env("TINYCV_TURNSTILE_SECRET_KEY")) {
  warn("turnstile", "Turnstile is not configured. Self-serve API project creation may be easier to abuse.");
} else {
  pass("turnstile", "Turnstile is configured.");
}

if (env("TINYCV_RATE_LIMIT_DISABLED") === "true") {
  fail("rate-limit", "TINYCV_RATE_LIMIT_DISABLED must not be true in production.");
} else {
  pass("rate-limit", "Rate limiting is enabled.");
}

if (isEnabled("TINYCV_MACHINE_PAYMENTS_ENABLED")) {
  checkMachinePayments();
} else {
  pass("machine-payments", "Machine payments are disabled.");
}

printReport();

const failed = checks.filter((check) => check.status === "fail");
process.exitCode = failed.length > 0 ? 1 : 0;

function requireEnv(name) {
  if (!env(name)) {
    fail(name, `Missing ${name}.`);
    return;
  }

  pass(name, `${name} is set.`);
}

function requireStrongSecret(name, minLength) {
  const value = env(name);

  if (!value) {
    return;
  }

  if (value.length < minLength || /^(change-me|replace-with|secret|password)$/i.test(value)) {
    fail(name, `${name} must be at least ${minLength} characters and not a placeholder.`);
    return;
  }

  pass(name, `${name} length looks production-safe.`);
}

function env(name) {
  return process.env[name]?.trim() || "";
}

function isEnabled(name) {
  return /^(1|true|yes|on)$/i.test(env(name));
}

function pass(id, message) {
  checks.push({
    id,
    message,
    status: "pass",
  });
}

function fail(id, message) {
  checks.push({
    id,
    message,
    status: "fail",
  });
}

function warn(id, message) {
  warnings.push({
    id,
    message,
    status: "warn",
  });
}

function printReport() {
  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.filter((check) => check.status === "fail").length;

  console.log(`Tiny CV production readiness: ${passed} passed, ${failed} failed, ${warnings.length} warnings`);

  for (const check of checks) {
    const marker = check.status === "pass" ? "PASS" : "FAIL";
    console.log(`[${marker}] ${check.message}`);
  }

  for (const warning of warnings) {
    console.log(`[WARN] ${warning.message}`);
  }
}

function checkMachinePayments() {
  const evmAddress = env("TINYCV_X402_EVM_ADDRESS");
  const solanaAddress = env("TINYCV_X402_SOLANA_ADDRESS");
  const x402FacilitatorUrl = env("TINYCV_X402_FACILITATOR_URL") || "https://x402.org/facilitator";
  const x402Network = env("TINYCV_X402_NETWORK") || "eip155:84532";
  const mppMethod = env("TINYCV_MPP_METHOD") || "tempo";
  const mppIntent = env("TINYCV_MPP_INTENT") || "charge";
  const mppTestnet = env("TINYCV_MPP_TEMPO_TESTNET") || "true";

  if (!evmAddress && !solanaAddress) {
    fail("machine-payments-x402-address", "Set TINYCV_X402_EVM_ADDRESS or TINYCV_X402_SOLANA_ADDRESS before enabling machine payments.");
  } else if (isPlaceholder(evmAddress) || isPlaceholder(solanaAddress)) {
    fail("machine-payments-x402-address", "Machine payment x402 addresses must not be placeholders.");
  } else {
    pass("machine-payments-x402-address", "Machine payment x402 address is configured.");
  }

  if (x402Network === "eip155:84532") {
    fail("machine-payments-x402-network", "TINYCV_X402_NETWORK must not use the Base Sepolia testnet default in production.");
  } else {
    pass("machine-payments-x402-network", "Machine payment x402 network is production-configured.");
  }

  if (x402FacilitatorUrl === "https://x402.org/facilitator") {
    fail("machine-payments-x402-facilitator", "TINYCV_X402_FACILITATOR_URL must use a production facilitator in production.");
  } else {
    pass("machine-payments-x402-facilitator", "Machine payment x402 facilitator is production-configured.");
  }

  if (!env("MPP_SECRET_KEY")) {
    fail("machine-payments-mpp-secret", "Set MPP_SECRET_KEY before enabling machine payments.");
  } else {
    requireStrongSecret("MPP_SECRET_KEY", 32);
  }

  if (mppMethod !== "tempo") {
    fail("machine-payments-mpp-method", "TINYCV_MPP_METHOD must be tempo.");
  } else {
    pass("machine-payments-mpp-method", "MPP method is tempo.");
  }

  if (mppIntent !== "charge") {
    fail("machine-payments-mpp-intent", "TINYCV_MPP_INTENT must be charge.");
  } else {
    pass("machine-payments-mpp-intent", "MPP intent is charge.");
  }

  if (!env("TINYCV_MPP_TEMPO_RECIPIENT")) {
    fail("machine-payments-mpp-recipient", "Set TINYCV_MPP_TEMPO_RECIPIENT before enabling machine payments.");
  } else if (isPlaceholder(env("TINYCV_MPP_TEMPO_RECIPIENT"))) {
    fail("machine-payments-mpp-recipient", "TINYCV_MPP_TEMPO_RECIPIENT must not be a placeholder.");
  } else {
    pass("machine-payments-mpp-recipient", "MPP Tempo recipient is configured.");
  }

  if (!env("TINYCV_MPP_TEMPO_CURRENCY")) {
    fail("machine-payments-mpp-currency", "Set TINYCV_MPP_TEMPO_CURRENCY before enabling machine payments.");
  } else {
    pass("machine-payments-mpp-currency", "MPP Tempo currency is configured.");
  }

  if (/^(1|true|yes|on)$/i.test(mppTestnet)) {
    fail("machine-payments-mpp-testnet", "TINYCV_MPP_TEMPO_TESTNET must be false in production.");
  } else {
    pass("machine-payments-mpp-testnet", "MPP Tempo testnet mode is disabled.");
  }
}

function isPlaceholder(value) {
  return value && /^(change-me|replace-me|todo|placeholder|0x0+)$/i.test(value);
}
