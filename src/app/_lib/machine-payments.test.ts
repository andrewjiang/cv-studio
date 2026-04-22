import { describe, expect, it, vi } from "vitest";
import { Receipt } from "mppx";

vi.mock("@/app/_lib/cv-fit", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/_lib/cv-fit")>();

  return {
    ...original,
    estimateResumeScale: () => 0.92,
  };
});

import { buildOpenApiSpec } from "@/app/_lib/openapi";
import {
  getMachinePaymentConfigurationIssues,
  MACHINE_PAYMENT_ROUTE_KEYS,
  normalizeMachinePaymentReceipt,
  normalizePaidCreateResumeRequest,
  readMachinePaymentConfig,
  runPaidIdempotentMutation,
  usdToAtomicUnits,
} from "@/app/_lib/machine-payments";
import { DeveloperPlatformValidationError } from "@/app/_lib/developer-platform-store";

describe("machine-payments", () => {
  it("parses disabled default config and normalizes fixed USD prices", () => {
    const config = readMachinePaymentConfig({});

    expect(config.enabled).toBe(false);
    expect(config.projectId).toBe("proj_machine_payments");
    expect(config.prices.createPublishUsd).toBe("0.250000");
    expect(config.prices.pdfUsd).toBe("0.500000");
    expect(usdToAtomicUnits(config.prices.createPublishUsd)).toBe("250000");
    expect(usdToAtomicUnits(config.prices.pdfUsd)).toBe("500000");
  });

  it("fails production config when enabled with missing secrets and testnet defaults", () => {
    const config = readMachinePaymentConfig({
      TINYCV_MACHINE_PAYMENTS_ENABLED: "true",
    });
    const issues = getMachinePaymentConfigurationIssues(config, "production");

    expect(issues).toContain("Set TINYCV_X402_EVM_ADDRESS or TINYCV_X402_SOLANA_ADDRESS.");
    expect(issues).toContain("Set MPP_SECRET_KEY.");
    expect(issues).toContain("Set TINYCV_MPP_TEMPO_RECIPIENT.");
    expect(issues).toContain("Set TINYCV_MPP_TEMPO_CURRENCY.");
    expect(issues).toContain("TINYCV_X402_NETWORK must not use the Base Sepolia testnet default in production.");
    expect(issues).toContain("TINYCV_X402_FACILITATOR_URL must use a production facilitator in production.");
  });

  it("validates paid resume bodies before payment", () => {
    expect(() => normalizePaidCreateResumeRequest({
      external_resume_id: "not-supported",
      input_format: "markdown",
      markdown: "# Alex Morgan\nFounder & Product Engineer\nSan Francisco, CA",
    })).toThrow(DeveloperPlatformValidationError);

    const normalized = normalizePaidCreateResumeRequest({
      client_reference_id: "agent-123",
      input_format: "markdown",
      markdown: "# Alex Morgan\nFounder & Product Engineer\nSan Francisco, CA",
      return_edit_claim_url: true,
    });

    expect(normalized.input_format).toBe("markdown");
    expect(normalized.client_reference_id).toBe("agent-123");
  });

  it("replays idempotency without executing the paid mutation again", async () => {
    const execute = vi.fn(async () => ({
      result: { ok: false },
      status: 201,
    }));
    const fulfill = vi.fn();
    const outcome = await runPaidIdempotentMutation({
      buildResponseBody: (result) => result,
      execute,
      idempotencyKey: "idem-123",
      operation: "POST:/api/v1/paid/resumes",
      projectId: "proj_machine_payments",
      requestHash: "hash-123",
      store: {
        fulfill,
        reserve: async () => ({
          responseBody: { ok: true },
          status: "replay",
          statusCode: 201,
        }),
      },
    });

    expect(outcome).toEqual({
      replay: true,
      responseBody: { ok: true },
      result: null,
      statusCode: 201,
    });
    expect(execute).not.toHaveBeenCalled();
    expect(fulfill).not.toHaveBeenCalled();
  });

  it("normalizes MPP payment receipts for persistence", () => {
    const paymentReceipt = Receipt.serialize({
      method: "tempo",
      reference: "0xabc123",
      status: "success",
      timestamp: "2026-04-21T00:00:00.000Z",
    });
    const payload = normalizeMachinePaymentReceipt({
      amountUsd: "0.500000",
      idempotencyKey: "idem-456",
      pdfJobId: "job-123",
      protocol: "mpp",
      requestHash: "hash-456",
      response: new Response("{}", {
        headers: {
          "Payment-Receipt": paymentReceipt,
        },
      }),
      resumeId: "res-123",
      routeKey: MACHINE_PAYMENT_ROUTE_KEYS.CREATE_PDF_JOB,
    });

    expect(payload).toMatchObject({
      amountUsd: "0.500000",
      idempotencyKey: "idem-456",
      paymentMethod: "tempo",
      pdfJobId: "job-123",
      protocol: "mpp",
      reference: "0xabc123",
      resumeId: "res-123",
      routeKey: MACHINE_PAYMENT_ROUTE_KEYS.CREATE_PDF_JOB,
    });
  });

  it("normalizes x402 payment responses for persistence", () => {
    const paymentResponse = Buffer.from(JSON.stringify({
      network: "eip155:8453",
      payer: "0xpayer",
      reference: "0xsettlement",
      scheme: "exact",
    })).toString("base64url");
    const payload = normalizeMachinePaymentReceipt({
      amountUsd: "0.250000",
      idempotencyKey: "idem-789",
      protocol: "x402",
      requestHash: "hash-789",
      response: new Response("{}", {
        headers: {
          "PAYMENT-RESPONSE": paymentResponse,
        },
      }),
      resumeId: "res-789",
      routeKey: MACHINE_PAYMENT_ROUTE_KEYS.CREATE_AND_PUBLISH_RESUME,
    });

    expect(payload).toMatchObject({
      amountUsd: "0.250000",
      network: "eip155:8453",
      payer: "0xpayer",
      paymentMethod: "exact",
      protocol: "x402",
      reference: "0xsettlement",
      resumeId: "res-789",
    });
  });

  it("exposes paid metadata in OpenAPI for AgentCash and MPPScan discovery", () => {
    const spec = buildOpenApiSpec("http://localhost:3000") as {
      info: Record<string, unknown>;
      paths: Record<string, Record<string, Record<string, unknown>>>;
    };
    const paidCreate = spec.paths["/api/v1/paid/resumes"].post;
    const paidPdf = spec.paths["/api/v1/paid/resumes/{resume_id}/pdf-jobs"].post;

    expect(spec.info["x-guidance"]).toEqual(expect.stringContaining("x402 or MPP"));
    expect(paidCreate.responses).toHaveProperty("402");
    expect(paidCreate["x-payment-info"]).toMatchObject({
      price: {
        amount: "0.250000",
        currency: "USD",
        mode: "fixed",
      },
      protocols: [
        { x402: {} },
        { mpp: { currency: "USD", intent: "charge", method: "tempo" } },
      ],
    });
    expect(paidPdf["x-payment-info"]).toMatchObject({
      price: {
        amount: "0.500000",
      },
    });
  });
});
