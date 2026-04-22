import "server-only";

import { createHash, randomUUID } from "node:crypto";
import postgres from "postgres";
import { NextResponse, type NextRequest } from "next/server";
import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  type RouteConfig,
} from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { registerExactSvmScheme } from "@x402/svm/exact/server";
import { Receipt } from "mppx";
import { Mppx, tempo } from "mppx/server";
import { DeveloperPlatformConfigurationError, safeEquals } from "@/app/_lib/developer-platform-auth";
import { compileResumeInput } from "@/app/_lib/developer-resume-input";
import {
  DeveloperPlatformConflictError,
  DeveloperPlatformUnavailableError,
  DeveloperPlatformValidationError,
  ensureDeveloperPlatformStorage,
  fulfillIdempotentProjectRequest,
  reserveIdempotentProjectRequest,
} from "@/app/_lib/developer-platform-store";
import type {
  CreateResumeRequest,
  PaidCreatePdfJobRequest,
  PaidCreateResumeRequest,
} from "@/app/_lib/developer-platform-types";

type SqlClient = postgres.Sql;

type EnvLike = Record<string, string | undefined>;

export const MACHINE_PAYMENT_PROJECT_ID = "proj_machine_payments";
export const MACHINE_PAYMENT_PROTOCOLS = ["x402", "mpp"] as const;

export const MACHINE_PAYMENT_ROUTE_KEYS = {
  AGENT_FINISH: "paid.agent_finish",
  CREATE_AND_PUBLISH_RESUME: "paid.resume_create_publish",
  CREATE_PDF_JOB: "paid.pdf_job_create",
} as const;

export type MachinePaymentProtocol = typeof MACHINE_PAYMENT_PROTOCOLS[number];
export type MachinePaymentRouteKey = typeof MACHINE_PAYMENT_ROUTE_KEYS[keyof typeof MACHINE_PAYMENT_ROUTE_KEYS];

export type MachinePaymentConfig = {
  enabled: boolean;
  mpp: {
    intent: string;
    method: string;
    secretKey: string | null;
    tempoCurrency: string | null;
    tempoDecimals: number;
    tempoRecipient: string | null;
    testnet: boolean;
  };
  prices: {
    agentFinishUsd: string;
    createPublishUsd: string;
    pdfUsd: string;
  };
  projectId: string;
  x402: {
    evmAddress: string | null;
    facilitatorUrl: string;
    network: string;
    solanaAddress: string | null;
    solanaNetwork: string;
  };
};

export type MachinePaymentRouteDefinition = {
  description: string;
  operation: string;
  priceUsd: string;
  routeKey: MachinePaymentRouteKey;
};

type PaidIdempotentStore = {
  fulfill: typeof fulfillIdempotentProjectRequest;
  reserve: typeof reserveIdempotentProjectRequest;
};

type PaidMutationOutcome<T> = {
  replay: boolean;
  responseBody: unknown;
  result: T | null;
  statusCode: number;
};

type MppChargeResult =
  | {
      challenge: Response;
      status: 402;
    }
  | {
      status: 200;
      withReceipt: (response: Response) => Response;
    };

type MppChargeServer = {
  tempo: {
    charge: (options: Record<string, unknown>) => (input: Request) => Promise<MppChargeResult>;
  };
};

type X402PaymentOption = {
  extra?: Record<string, unknown>;
  maxTimeoutSeconds?: number;
  network: Network;
  payTo: string;
  price: string;
  scheme: string;
};

type NormalizedReceiptInput = {
  amountUsd: string;
  idempotencyKey: string;
  pdfJobId?: string | null;
  protocol: MachinePaymentProtocol;
  requestHash: string;
  response: Response;
  resumeId?: string | null;
  routeKey: MachinePaymentRouteKey;
};

type MachinePaymentReceiptPayload = {
  amountUsd: string;
  currency: "USD";
  idempotencyKey: string;
  network: string | null;
  payer: string | null;
  paymentMethod: string | null;
  pdfJobId: string | null;
  protocol: MachinePaymentProtocol;
  rawReceipt: Record<string, unknown>;
  reference: string | null;
  requestHash: string;
  resumeId: string | null;
  routeKey: MachinePaymentRouteKey;
};

const DEFAULT_CREATE_PUBLISH_PRICE_USD = "0.10";
const DEFAULT_PDF_PRICE_USD = "0.25";
const DEFAULT_AGENT_FINISH_PRICE_USD = "0.25";
const DEFAULT_X402_FACILITATOR_URL = "https://x402.org/facilitator";
const DEFAULT_X402_TESTNET_NETWORK = "eip155:84532";
const DEFAULT_SOLANA_DEVNET_NETWORK = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

let machinePaymentSql: SqlClient | null = null;
let machinePaymentStoragePromise: Promise<void> | null = null;
let mppServerCache: { fingerprint: string; server: MppChargeServer } | null = null;
let x402ServerCache: { fingerprint: string; server: x402ResourceServer } | null = null;

export function readMachinePaymentConfig(env: EnvLike = process.env): MachinePaymentConfig {
  return {
    enabled: parseBooleanEnv(env.TINYCV_MACHINE_PAYMENTS_ENABLED, false),
    mpp: {
      intent: env.TINYCV_MPP_INTENT?.trim() || "charge",
      method: env.TINYCV_MPP_METHOD?.trim() || "tempo",
      secretKey: trimOptional(env.MPP_SECRET_KEY),
      tempoCurrency: trimOptional(env.TINYCV_MPP_TEMPO_CURRENCY),
      tempoDecimals: parsePositiveIntegerEnv(env.TINYCV_MPP_TEMPO_DECIMALS, 6),
      tempoRecipient: trimOptional(env.TINYCV_MPP_TEMPO_RECIPIENT),
      testnet: parseBooleanEnv(env.TINYCV_MPP_TEMPO_TESTNET, true),
    },
    prices: {
      agentFinishUsd: parseUsdPrice(
        env.TINYCV_PAID_AGENT_FINISH_PRICE_USD,
        DEFAULT_AGENT_FINISH_PRICE_USD,
        "TINYCV_PAID_AGENT_FINISH_PRICE_USD",
      ),
      createPublishUsd: parseUsdPrice(
        env.TINYCV_PAID_CREATE_PUBLISH_PRICE_USD,
        DEFAULT_CREATE_PUBLISH_PRICE_USD,
        "TINYCV_PAID_CREATE_PUBLISH_PRICE_USD",
      ),
      pdfUsd: parseUsdPrice(
        env.TINYCV_PAID_PDF_PRICE_USD,
        DEFAULT_PDF_PRICE_USD,
        "TINYCV_PAID_PDF_PRICE_USD",
      ),
    },
    projectId: env.TINYCV_MACHINE_PAYMENTS_PROJECT_ID?.trim() || MACHINE_PAYMENT_PROJECT_ID,
    x402: {
      evmAddress: trimOptional(env.TINYCV_X402_EVM_ADDRESS),
      facilitatorUrl: env.TINYCV_X402_FACILITATOR_URL?.trim() || DEFAULT_X402_FACILITATOR_URL,
      network: env.TINYCV_X402_NETWORK?.trim() || DEFAULT_X402_TESTNET_NETWORK,
      solanaAddress: trimOptional(env.TINYCV_X402_SOLANA_ADDRESS),
      solanaNetwork: env.TINYCV_X402_SOLANA_NETWORK?.trim() || DEFAULT_SOLANA_DEVNET_NETWORK,
    },
  };
}

export function getMachinePaymentConfigurationIssues(
  config: MachinePaymentConfig,
  nodeEnv = process.env.NODE_ENV ?? "development",
) {
  const issues: string[] = [];

  if (!config.enabled) {
    return issues;
  }

  if (!config.x402.evmAddress && !config.x402.solanaAddress) {
    issues.push("Set TINYCV_X402_EVM_ADDRESS or TINYCV_X402_SOLANA_ADDRESS.");
  }

  if (isPlaceholder(config.x402.evmAddress) || isPlaceholder(config.x402.solanaAddress)) {
    issues.push("x402 payment addresses must not be placeholders.");
  }

  if (!config.mpp.secretKey) {
    issues.push("Set MPP_SECRET_KEY.");
  } else if (isPlaceholder(config.mpp.secretKey)) {
    issues.push("MPP_SECRET_KEY must not be a placeholder.");
  }

  if (config.mpp.method !== "tempo") {
    issues.push("TINYCV_MPP_METHOD must be tempo.");
  }

  if (config.mpp.intent !== "charge") {
    issues.push("TINYCV_MPP_INTENT must be charge.");
  }

  if (!config.mpp.tempoRecipient) {
    issues.push("Set TINYCV_MPP_TEMPO_RECIPIENT.");
  }

  if (!config.mpp.tempoCurrency) {
    issues.push("Set TINYCV_MPP_TEMPO_CURRENCY.");
  }

  if (
    nodeEnv === "production"
    && config.x402.evmAddress
    && config.x402.network === DEFAULT_X402_TESTNET_NETWORK
  ) {
    issues.push("TINYCV_X402_NETWORK must not use the Base Sepolia testnet default in production.");
  }

  if (nodeEnv === "production" && config.x402.facilitatorUrl === DEFAULT_X402_FACILITATOR_URL) {
    issues.push("TINYCV_X402_FACILITATOR_URL must use a production facilitator in production.");
  }

  if (
    nodeEnv === "production"
    && config.x402.solanaAddress
    && config.x402.solanaNetwork === DEFAULT_SOLANA_DEVNET_NETWORK
  ) {
    issues.push("TINYCV_X402_SOLANA_NETWORK must not use the Solana devnet default in production.");
  }

  if (nodeEnv === "production" && config.mpp.testnet) {
    issues.push("TINYCV_MPP_TEMPO_TESTNET must be false in production.");
  }

  return issues;
}

export function assertMachinePaymentsConfigured() {
  const config = readMachinePaymentConfig();

  if (!config.enabled) {
    throw new DeveloperPlatformConfigurationError("Machine payments are disabled.");
  }

  const issues = getMachinePaymentConfigurationIssues(config);

  if (issues.length > 0) {
    throw new DeveloperPlatformConfigurationError(
      `Machine payments are not configured. ${issues.join(" ")}`,
    );
  }

  return config;
}

export function getMachinePaymentRouteDefinition(
  routeKey: MachinePaymentRouteKey,
  config = readMachinePaymentConfig(),
): MachinePaymentRouteDefinition {
  if (routeKey === MACHINE_PAYMENT_ROUTE_KEYS.AGENT_FINISH) {
    return {
      description: "Create a claimable Tiny CV resume artifact with a hosted link and queued PDF export.",
      operation: "POST:/api/v1/paid/agent-finish",
      priceUsd: config.prices.agentFinishUsd,
      routeKey,
    };
  }

  if (routeKey === MACHINE_PAYMENT_ROUTE_KEYS.CREATE_AND_PUBLISH_RESUME) {
    return {
      description: "Create and publish a Tiny CV resume from markdown or JSON.",
      operation: "POST:/api/v1/paid/resumes",
      priceUsd: config.prices.createPublishUsd,
      routeKey,
    };
  }

  return {
    description: "Queue a PDF export job for a machine-payment Tiny CV resume.",
    operation: "POST:/api/v1/paid/resumes/{resume_id}/pdf-jobs",
    priceUsd: config.prices.pdfUsd,
    routeKey,
  };
}

export function buildMachinePaymentOpenApiInfo(
  routeKey: MachinePaymentRouteKey,
  config = readMachinePaymentConfig(),
) {
  const route = getMachinePaymentRouteDefinition(routeKey, config);

  return {
    price: {
      amount: route.priceUsd,
      currency: "USD",
      mode: "fixed",
    },
    protocols: [
      { x402: {} },
      {
        mpp: {
          currency: "USD",
          intent: "charge",
          method: "tempo",
        },
      },
    ],
  };
}

export function parseDiscoveryOwnershipProofs(env: EnvLike = process.env) {
  const raw = env.TINYCV_DISCOVERY_OWNERSHIP_PROOFS?.trim();

  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    }
  } catch {
    // Fall back to comma-separated env values below.
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function normalizePaidCreateResumeRequest(body: unknown): PaidCreateResumeRequest {
  const record = assertObjectBody(body);
  const allowedKeys = getAllowedPaidResumeRequestKeys(record.input_format);
  const disallowedKeys = allowedKeys
    ? Object.keys(record).filter((key) => !allowedKeys.has(key))
    : ["external_resume_id", "webhook_url"].filter((key) => key in record);

  if (disallowedKeys.length > 0) {
    throw new DeveloperPlatformValidationError("Paid resume creation received unsupported fields.", {
      errors: disallowedKeys.map((key) => ({
        code: "unsupported_paid_field",
        message: `${key} is not supported for paid no-account resume creation.`,
        path: key,
      })),
    });
  }

  const candidate = record as unknown as PaidCreateResumeRequest;
  const compiled = compileResumeInput({
    ...candidate,
    quality_gate: "publish",
  } as CreateResumeRequest & { quality_gate: "publish" });

  if (!compiled.valid) {
    throw new DeveloperPlatformValidationError("Resume is not ready to publish.", {
      errors: compiled.errors,
      warnings: compiled.warnings,
    });
  }

  return candidate;
}

export function normalizePaidCreatePdfJobRequest(body: unknown): PaidCreatePdfJobRequest {
  const record = body === undefined || body === null ? {} : assertObjectBody(body);
  const keys = Object.keys(record);

  if (keys.length > 0) {
    throw new DeveloperPlatformValidationError("Paid PDF job creation does not accept request body fields.", {
      errors: keys.map((key) => ({
        code: "unsupported_paid_field",
        message: `${key} is not supported for paid PDF job creation.`,
        path: key,
      })),
    });
  }

  return {};
}

export async function ensureMachinePaymentStorage(config = readMachinePaymentConfig()) {
  if (!config.enabled) {
    return;
  }

  if (!machinePaymentStoragePromise) {
    machinePaymentStoragePromise = (async () => {
      await ensureDeveloperPlatformStorage();

      const sql = getMachinePaymentSql();

      if (shouldRunRuntimeSchemaSync()) {
        await syncMachinePaymentSchema(sql);
      } else {
        await verifyMachinePaymentSchema(sql);
      }

      await ensureMachinePaymentProject(sql, config.projectId);
    })();
  }

  await machinePaymentStoragePromise;
}

export async function runPaidIdempotentMutation<T>(input: {
  buildResponseBody: (result: T) => unknown;
  execute: () => Promise<{ result: T; status: number }>;
  idempotencyKey: string;
  operation: string;
  projectId: string;
  requestHash: string;
  store?: PaidIdempotentStore;
}): Promise<PaidMutationOutcome<T>> {
  const store = input.store ?? {
    fulfill: fulfillIdempotentProjectRequest,
    reserve: reserveIdempotentProjectRequest,
  };
  const reservation = await store.reserve({
    idempotencyKey: input.idempotencyKey,
    operation: input.operation,
    projectId: input.projectId,
    requestHash: input.requestHash,
  });

  if (reservation.status === "replay") {
    return {
      replay: true,
      responseBody: reservation.responseBody,
      result: null,
      statusCode: reservation.statusCode,
    };
  }

  const executed = await input.execute();
  const responseBody = input.buildResponseBody(executed.result);

  await store.fulfill({
    idempotencyKey: input.idempotencyKey,
    operation: input.operation,
    projectId: input.projectId,
    responseBody,
    statusCode: executed.status,
  });

  return {
    replay: false,
    responseBody,
    result: executed.result,
    statusCode: executed.status,
  };
}

export async function requireMachinePayment(input: {
  handler: () => Promise<NextResponse>;
  idempotencyKey: string;
  pdfJobId?: string | null;
  receiptResourceIds?: () => { pdfJobId?: string | null; resumeId?: string | null };
  request: NextRequest;
  requestHash: string;
  resumeId?: string | null;
  route: MachinePaymentRouteDefinition;
}) {
  const config = assertMachinePaymentsConfigured();
  await ensureMachinePaymentStorage(config);

  if (hasMppPaymentAuthorization(input.request)) {
    return handleMppPayment({
      ...input,
      config,
    });
  }

  return handleX402Payment({
    ...input,
    config,
  });
}

export function normalizeMachinePaymentReceipt(input: NormalizedReceiptInput): MachinePaymentReceiptPayload | null {
  if (input.protocol === "mpp") {
    return normalizeMppReceipt(input);
  }

  return normalizeX402Receipt(input);
}

export async function persistMachinePaymentReceipt(input: MachinePaymentReceiptPayload) {
  const sql = getMachinePaymentSql();

  await sql`
    insert into machine_payment_receipts (
      id,
      protocol,
      route_key,
      amount_usd,
      currency,
      network,
      payment_method,
      payer,
      reference,
      idempotency_key,
      request_hash,
      resume_id,
      pdf_job_id,
      raw_receipt,
      created_at
    ) values (
      ${randomUUID()},
      ${input.protocol},
      ${input.routeKey},
      ${input.amountUsd},
      ${input.currency},
      ${input.network},
      ${input.paymentMethod},
      ${input.payer},
      ${input.reference},
      ${input.idempotencyKey},
      ${input.requestHash},
      ${input.resumeId},
      ${input.pdfJobId},
      ${sql.json(input.rawReceipt as postgres.JSONValue)},
      ${new Date()}
    )
    on conflict (protocol, reference) where reference is not null
    do nothing
  `;
}

export function usdToAtomicUnits(priceUsd: string, decimals = 6) {
  const [wholePart, fractionalPart = ""] = priceUsd.split(".");
  const normalizedFraction = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
  const whole = BigInt(wholePart || "0") * (BigInt(10) ** BigInt(decimals));
  const fractional = BigInt(normalizedFraction || "0");

  return (whole + fractional).toString();
}

export function usdToMppAmount(priceUsd: string) {
  return trimFixedAmount(priceUsd);
}

export function stableRequestHash(body: unknown) {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

async function handleMppPayment(input: {
  config: MachinePaymentConfig;
  handler: () => Promise<NextResponse>;
  idempotencyKey: string;
  pdfJobId?: string | null;
  receiptResourceIds?: () => { pdfJobId?: string | null; resumeId?: string | null };
  request: NextRequest;
  requestHash: string;
  resumeId?: string | null;
  route: MachinePaymentRouteDefinition;
}) {
  const mpp = getMppServer(input.config);
  const result = await mpp.tempo.charge(buildMppChargeOptions(input))(
    input.request.clone(),
  );

  if (result.status === 402) {
    return withNoStore(result.challenge);
  }

  const response = result.withReceipt(await input.handler());

  if (response.status < 400) {
    const receiptResourceIds = input.receiptResourceIds?.();
    await recordReceiptFromResponse({
      amountUsd: input.route.priceUsd,
      idempotencyKey: input.idempotencyKey,
      pdfJobId: receiptResourceIds?.pdfJobId ?? input.pdfJobId ?? null,
      protocol: "mpp",
      requestHash: input.requestHash,
      response,
      resumeId: receiptResourceIds?.resumeId ?? input.resumeId ?? null,
      routeKey: input.route.routeKey,
    });
  }

  return response;
}

async function handleX402Payment(input: {
  config: MachinePaymentConfig;
  handler: () => Promise<NextResponse>;
  idempotencyKey: string;
  pdfJobId?: string | null;
  receiptResourceIds?: () => { pdfJobId?: string | null; resumeId?: string | null };
  request: NextRequest;
  requestHash: string;
  resumeId?: string | null;
  route: MachinePaymentRouteDefinition;
}) {
  const { withX402 } = await import("@x402/next");
  const protectedHandler = withX402(
    input.handler,
    buildX402RouteConfig(input),
    getX402Server(input.config),
  );
  let response = await protectedHandler(input.request);

  if (response.status === 402) {
    response = await appendMppChallenge(response, input);
  }

  if (response.status < 400) {
    const receiptResourceIds = input.receiptResourceIds?.();
    await recordReceiptFromResponse({
      amountUsd: input.route.priceUsd,
      idempotencyKey: input.idempotencyKey,
      pdfJobId: receiptResourceIds?.pdfJobId ?? input.pdfJobId ?? null,
      protocol: "x402",
      requestHash: input.requestHash,
      response,
      resumeId: receiptResourceIds?.resumeId ?? input.resumeId ?? null,
      routeKey: input.route.routeKey,
    });
  }

  return response;
}

async function appendMppChallenge(
  response: NextResponse,
  input: {
    config: MachinePaymentConfig;
    idempotencyKey: string;
    request: NextRequest;
    route: MachinePaymentRouteDefinition;
  },
) {
  const result = await getMppServer(input.config).tempo.charge(buildMppChargeOptions(input))(
    input.request.clone(),
  );

  if (result.status !== 402) {
    return response;
  }

  const headers = new Headers(response.headers);
  const mppAuthenticate = result.challenge.headers.get("www-authenticate");

  if (mppAuthenticate) {
    headers.append("WWW-Authenticate", mppAuthenticate);
  }

  headers.set("Cache-Control", "no-store");

  return new NextResponse(await response.text(), {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function recordReceiptFromResponse(input: NormalizedReceiptInput) {
  const payload = normalizeMachinePaymentReceipt(input);

  if (!payload) {
    return;
  }

  try {
    await persistMachinePaymentReceipt(payload);
  } catch (error) {
    console.error("Tiny CV machine payment receipt persistence failed.", error);
  }
}

function normalizeMppReceipt(input: NormalizedReceiptInput): MachinePaymentReceiptPayload | null {
  const header = input.response.headers.get("payment-receipt");

  if (!header) {
    return null;
  }

  try {
    const receipt = Receipt.deserialize(header);

    return {
      amountUsd: input.amountUsd,
      currency: "USD",
      idempotencyKey: input.idempotencyKey,
      network: null,
      payer: null,
      paymentMethod: receipt.method,
      pdfJobId: input.pdfJobId ?? null,
      protocol: "mpp",
      rawReceipt: receipt,
      reference: receipt.reference,
      requestHash: input.requestHash,
      resumeId: input.resumeId ?? null,
      routeKey: input.routeKey,
    };
  } catch {
    return {
      amountUsd: input.amountUsd,
      currency: "USD",
      idempotencyKey: input.idempotencyKey,
      network: null,
      payer: null,
      paymentMethod: "tempo",
      pdfJobId: input.pdfJobId ?? null,
      protocol: "mpp",
      rawReceipt: { header },
      reference: receiptReferenceFromHeader(header),
      requestHash: input.requestHash,
      resumeId: input.resumeId ?? null,
      routeKey: input.routeKey,
    };
  }
}

function normalizeX402Receipt(input: NormalizedReceiptInput): MachinePaymentReceiptPayload | null {
  const header = input.response.headers.get("payment-response");

  if (!header) {
    return null;
  }

  const decoded = decodeMaybeJson(header);
  const rawReceipt = isRecord(decoded) ? decoded : { header };

  return {
    amountUsd: input.amountUsd,
    currency: "USD",
    idempotencyKey: input.idempotencyKey,
    network: pickString(rawReceipt, ["network"], ["paymentRequirements", "network"]),
    payer: pickString(rawReceipt, ["payer"], ["from"], ["payment", "payload", "authorization", "from"]),
    paymentMethod: pickString(rawReceipt, ["scheme"]) ?? "exact",
    pdfJobId: input.pdfJobId ?? null,
    protocol: "x402",
    rawReceipt,
    reference: pickString(
      rawReceipt,
      ["reference"],
      ["transaction"],
      ["txHash"],
      ["settlement", "transaction"],
      ["settlement", "txHash"],
    ) ?? receiptReferenceFromHeader(header),
    requestHash: input.requestHash,
    resumeId: input.resumeId ?? null,
    routeKey: input.routeKey,
  };
}

function buildMppChargeOptions(input: {
  config: MachinePaymentConfig;
  idempotencyKey: string;
  route: MachinePaymentRouteDefinition;
}) {
  return {
    amount: usdToMppAmount(input.route.priceUsd),
    description: input.route.description,
    externalId: `${input.route.routeKey}:${input.idempotencyKey}`,
    meta: {
      idempotency_key: input.idempotencyKey,
      route_key: input.route.routeKey,
    },
  };
}

function buildX402RouteConfig(input: {
  config: MachinePaymentConfig;
  request: NextRequest;
  route: MachinePaymentRouteDefinition;
}): RouteConfig {
  const accepts: X402PaymentOption[] = [];

  if (input.config.x402.evmAddress) {
    accepts.push({
      network: input.config.x402.network as Network,
      payTo: input.config.x402.evmAddress,
      price: `$${trimFixedAmount(input.route.priceUsd)}`,
      scheme: "exact",
    });
  }

  if (input.config.x402.solanaAddress) {
    accepts.push({
      network: input.config.x402.solanaNetwork as Network,
      payTo: input.config.x402.solanaAddress,
      price: `$${trimFixedAmount(input.route.priceUsd)}`,
      scheme: "exact",
    });
  }

  return {
    accepts: accepts.length === 1 ? accepts[0] : accepts,
    description: input.route.description,
    mimeType: "application/json",
    resource: new URL(input.request.nextUrl.pathname, input.request.nextUrl.origin).toString(),
    unpaidResponseBody: () => ({
      body: {
        error: {
          code: "payment_required",
          message: "Payment required. Retry with x402 PAYMENT-SIGNATURE or MPP Authorization: Payment.",
          protocols: MACHINE_PAYMENT_PROTOCOLS,
        },
      },
      contentType: "application/json",
    }),
  };
}

function getX402Server(config: MachinePaymentConfig) {
  const fingerprint = [
    config.x402.facilitatorUrl,
    config.x402.network,
    config.x402.solanaNetwork,
    config.x402.evmAddress ? "evm" : "",
    config.x402.solanaAddress ? "svm" : "",
  ].join("|");

  if (x402ServerCache?.fingerprint === fingerprint) {
    return x402ServerCache.server;
  }

  const server = new x402ResourceServer(
    new HTTPFacilitatorClient({ url: config.x402.facilitatorUrl }),
  );

  if (config.x402.evmAddress) {
    registerExactEvmScheme(server, { networks: [config.x402.network as Network] });
  }

  if (config.x402.solanaAddress) {
    registerExactSvmScheme(server, { networks: [config.x402.solanaNetwork as Network] });
  }

  x402ServerCache = { fingerprint, server };

  return server;
}

function getMppServer(config: MachinePaymentConfig) {
  const fingerprint = [
    config.mpp.secretKey,
    config.mpp.tempoCurrency,
    config.mpp.tempoDecimals,
    config.mpp.tempoRecipient,
    config.mpp.testnet,
  ].join("|");

  if (mppServerCache?.fingerprint === fingerprint) {
    return mppServerCache.server;
  }

  const server = Mppx.create({
    methods: [
      tempo.charge({
        currency: config.mpp.tempoCurrency ?? "",
        decimals: config.mpp.tempoDecimals,
        recipient: (config.mpp.tempoRecipient ?? "0x") as `0x${string}`,
        testnet: config.mpp.testnet,
      }),
    ],
    secretKey: config.mpp.secretKey ?? undefined,
  }) as unknown as MppChargeServer;

  mppServerCache = { fingerprint, server };

  return server;
}

function getMachinePaymentSql() {
  if (!process.env.DATABASE_URL) {
    throw new DeveloperPlatformUnavailableError(
      "Set DATABASE_URL to enable Tiny CV machine payment receipts.",
    );
  }

  machinePaymentSql ??= postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
  });

  return machinePaymentSql;
}

async function ensureMachinePaymentProject(sql: SqlClient, projectId: string) {
  await sql`
    insert into projects (id, name, slug)
    values (${projectId}, ${"Machine Payments"}, ${machinePaymentProjectSlug(projectId)})
    on conflict (id) do nothing
  `;
}

async function verifyMachinePaymentSchema(sql: SqlClient) {
  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'machine_payment_receipts'
  `;

  if (rows.length === 0) {
    throw new DeveloperPlatformUnavailableError(
      "Tiny CV machine payment schema is not migrated. Run `pnpm db:migrate` before enabling machine payments.",
    );
  }
}

async function syncMachinePaymentSchema(sql: SqlClient) {
  await sql`
    create table if not exists machine_payment_receipts (
      id text primary key,
      protocol text not null check (protocol in ('x402', 'mpp')),
      route_key text not null,
      amount_usd text not null,
      currency text not null default 'USD',
      network text,
      payment_method text,
      payer text,
      reference text,
      idempotency_key text,
      request_hash text not null,
      resume_id text references resumes(id),
      pdf_job_id text references pdf_jobs(id),
      raw_receipt jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create unique index if not exists machine_payment_receipts_protocol_reference_idx
    on machine_payment_receipts(protocol, reference)
    where reference is not null
  `;

  await sql`
    create index if not exists machine_payment_receipts_route_lookup_idx
    on machine_payment_receipts(route_key, created_at desc)
  `;

  await sql`
    create index if not exists machine_payment_receipts_resume_lookup_idx
    on machine_payment_receipts(resume_id)
  `;

  await sql`
    create index if not exists machine_payment_receipts_pdf_job_lookup_idx
    on machine_payment_receipts(pdf_job_id)
  `;
}

function withNoStore(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function hasMppPaymentAuthorization(request: NextRequest) {
  return /^Payment\s+/i.test(request.headers.get("authorization") ?? "");
}

function assertObjectBody(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    throw new DeveloperPlatformValidationError("Request body must be a JSON object.", {
      errors: [{
        code: "invalid_input",
        message: "Request body must be a JSON object.",
      }],
    });
  }

  return body;
}

function getAllowedPaidResumeRequestKeys(inputFormat: unknown) {
  if (inputFormat === "markdown") {
    return new Set([
      "client_reference_id",
      "input_format",
      "markdown",
      "return_edit_claim_url",
      "style_overrides",
      "template_key",
      "title",
    ]);
  }

  if (inputFormat === "json") {
    return new Set([
      "client_reference_id",
      "input_format",
      "resume",
      "return_edit_claim_url",
      "style",
      "template_key",
      "title",
    ]);
  }

  return null;
}

function parseUsdPrice(value: string | undefined, fallback: string, envName: string) {
  const raw = value?.trim() || fallback;

  if (!/^\d+(\.\d{1,6})?$/.test(raw)) {
    throw new DeveloperPlatformConfigurationError(`${envName} must be a positive USD amount with up to 6 decimals.`);
  }

  const amount = Number(raw);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DeveloperPlatformConfigurationError(`${envName} must be greater than zero.`);
  }

  return formatUsdAmount(raw);
}

function formatUsdAmount(raw: string) {
  const [wholePart, fractionalPart = ""] = raw.split(".");
  return `${wholePart}.${fractionalPart.padEnd(6, "0").slice(0, 6)}`;
}

function trimFixedAmount(raw: string) {
  return raw.replace(/\.?0+$/, "");
}

function parsePositiveIntegerEnv(value: string | undefined, fallback: number) {
  const raw = value?.trim();

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new DeveloperPlatformConfigurationError("TINYCV_MPP_TEMPO_DECIMALS must be a positive integer.");
  }

  return parsed;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  const raw = value?.trim().toLowerCase();

  if (!raw) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(raw)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(raw)) {
    return false;
  }

  return fallback;
}

function trimOptional(value: string | undefined) {
  return value?.trim() || null;
}

function isPlaceholder(value: string | null) {
  if (!value) {
    return false;
  }

  return /^(change-me|replace-me|todo|placeholder|0x0+)$/i.test(value);
}

function shouldRunRuntimeSchemaSync() {
  const configured = process.env.TINYCV_RUNTIME_SCHEMA_SYNC?.trim().toLowerCase();

  if (configured && ["1", "true", "yes"].includes(configured)) {
    return true;
  }

  if (configured && ["0", "false", "no"].includes(configured)) {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

function machinePaymentProjectSlug(projectId: string) {
  if (projectId === MACHINE_PAYMENT_PROJECT_ID) {
    return "machine-payments";
  }

  return `machine-payments-${createHash("sha256").update(projectId).digest("hex").slice(0, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeMaybeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    // Continue to base64/base64url decoding.
  }

  for (const encoding of ["base64url", "base64"] as const) {
    try {
      return JSON.parse(Buffer.from(value, encoding).toString("utf8"));
    } catch {
      // Try the next encoding.
    }
  }

  return null;
}

function pickString(record: Record<string, unknown>, ...paths: string[][]) {
  for (const path of paths) {
    let current: unknown = record;

    for (const key of path) {
      if (!isRecord(current)) {
        current = null;
        break;
      }

      current = current[key];
    }

    if (typeof current === "string" && current.trim()) {
      return current;
    }
  }

  return null;
}

function receiptReferenceFromHeader(header: string) {
  return createHash("sha256").update(header).digest("hex");
}

export function assertMatchingRequestHash(left: string, right: string) {
  if (!safeEquals(left, right)) {
    throw new DeveloperPlatformConflictError(
      "idempotency_conflict",
      "This idempotency key has already been used with a different request payload.",
    );
  }
}
