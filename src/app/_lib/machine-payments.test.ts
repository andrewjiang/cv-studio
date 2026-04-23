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
import { STRONG_AGENT_RESUME_MARKDOWN } from "@/app/_lib/resume-examples";
import {
  attachX402BazaarSchemaToPaymentRequiredHeader,
  getMachinePaymentConfigurationIssues,
  MACHINE_PAYMENT_ROUTE_KEYS,
  normalizeMachinePaymentReceipt,
  normalizePaidCreateResumeRequest,
  readMachinePaymentConfig,
  runPaidIdempotentMutation,
  usdToAtomicUnits,
  usdToMppAmount,
} from "@/app/_lib/machine-payments";
import { DeveloperPlatformValidationError } from "@/app/_lib/developer-platform-store";

const BAD_PUBLISH_MARKDOWN = `# Andrew Jiang
Builder and founder with deep business development and product management experience, plus generalist design and engineering chops. YC alum.
Los Angeles, CA | [andrew@example.com](mailto:andrew@example.com)

## Experience
### Founder | LockIn
*Los Angeles, CA | Jun 2025 - Present*
- Built LockIn from idea to revenue.

## Additional Experience
Product Manager, Sprig (2015 - 2016) • Cofounder and CEO, Bayes Impact (Apr 2014 - Apr 2015)`;

describe("machine-payments", () => {
  it("parses disabled default config and normalizes fixed USD prices", () => {
    const config = readMachinePaymentConfig({});

    expect(config.enabled).toBe(false);
    expect(config.projectId).toBe("proj_machine_payments");
    expect(config.prices.agentFinishUsd).toBe("0.250000");
    expect(config.prices.createPublishUsd).toBe("0.100000");
    expect(config.prices.pdfUsd).toBe("0.250000");
    expect(config.mpp.realm).toBeNull();
    expect(usdToAtomicUnits(config.prices.agentFinishUsd)).toBe("250000");
    expect(usdToAtomicUnits(config.prices.createPublishUsd)).toBe("100000");
    expect(usdToAtomicUnits(config.prices.pdfUsd)).toBe("250000");
    expect(usdToMppAmount(config.prices.agentFinishUsd)).toBe("0.25");
    expect(usdToMppAmount(config.prices.createPublishUsd)).toBe("0.1");
    expect(usdToMppAmount(config.prices.pdfUsd)).toBe("0.25");
  });

  it("fails production config when enabled with missing secrets and testnet defaults", () => {
    const config = readMachinePaymentConfig({
      TINYCV_MACHINE_PAYMENTS_ENABLED: "true",
    });
    const issues = getMachinePaymentConfigurationIssues(config, "production");

    expect(issues).toContain("Set TINYCV_X402_EVM_ADDRESS or TINYCV_X402_SOLANA_ADDRESS.");
    expect(issues).toContain("Set MPP_SECRET_KEY.");
    expect(issues).toContain("Set TINYCV_MPP_REALM, MPP_REALM, or TINYCV_APP_URL so MPP challenges use the public service host.");
    expect(issues).toContain("Set TINYCV_MPP_TEMPO_RECIPIENT.");
    expect(issues).toContain("Set TINYCV_MPP_TEMPO_CURRENCY.");
    expect(issues).toContain("TINYCV_X402_FACILITATOR_URL must use a production facilitator in production.");
  });

  it("fails production config when an EVM x402 address uses the testnet default network", () => {
    const config = readMachinePaymentConfig({
      MPP_SECRET_KEY: "prod-secret-prod-secret-prod-secret",
      TINYCV_MACHINE_PAYMENTS_ENABLED: "true",
      TINYCV_MPP_REALM: "tiny.cv",
      TINYCV_MPP_TEMPO_CURRENCY: "0x20C000000000000000000000b9537d11c60E8b50",
      TINYCV_MPP_TEMPO_RECIPIENT: "0x742d35Cc6634c0532925a3b844bC9e7595F8fE00",
      TINYCV_MPP_TEMPO_TESTNET: "false",
      TINYCV_X402_EVM_ADDRESS: "0x742d35Cc6634c0532925a3b844bC9e7595F8fE00",
      TINYCV_X402_FACILITATOR_URL: "https://facilitator.example.com",
    });

    expect(getMachinePaymentConfigurationIssues(config, "production")).toContain(
      "TINYCV_X402_NETWORK must not use the Base Sepolia testnet default in production.",
    );
  });

  it("allows EVM-only production config without requiring Solana mainnet", () => {
    const config = readMachinePaymentConfig({
      MPP_SECRET_KEY: "prod-secret-prod-secret-prod-secret",
      TINYCV_MACHINE_PAYMENTS_ENABLED: "true",
      TINYCV_APP_URL: "https://tiny.cv",
      TINYCV_MPP_TEMPO_CURRENCY: "0x20C000000000000000000000b9537d11c60E8b50",
      TINYCV_MPP_TEMPO_RECIPIENT: "0x742d35Cc6634c0532925a3b844bC9e7595F8fE00",
      TINYCV_MPP_TEMPO_TESTNET: "false",
      TINYCV_X402_EVM_ADDRESS: "0x742d35Cc6634c0532925a3b844bC9e7595F8fE00",
      TINYCV_X402_FACILITATOR_URL: "https://facilitator.example.com",
      TINYCV_X402_NETWORK: "eip155:8453",
    });

    expect(getMachinePaymentConfigurationIssues(config, "production")).toEqual([]);
  });

  it("resolves MPP realm from explicit realm or public app URL instead of Vercel URL", () => {
    expect(readMachinePaymentConfig({
      TINYCV_MPP_REALM: "tiny.cv",
      VERCEL_URL: "cvstudio-preview.vercel.app",
    }).mpp.realm).toBe("tiny.cv");

    expect(readMachinePaymentConfig({
      TINYCV_APP_URL: "https://tiny.cv",
      VERCEL_URL: "cvstudio-preview.vercel.app",
    }).mpp.realm).toBe("tiny.cv");

    const config = readMachinePaymentConfig({
      MPP_SECRET_KEY: "prod-secret-prod-secret-prod-secret",
      TINYCV_MACHINE_PAYMENTS_ENABLED: "true",
      TINYCV_MPP_REALM: "cvstudio-preview.vercel.app",
      TINYCV_MPP_TEMPO_CURRENCY: "0x20C000000000000000000000b9537d11c60E8b50",
      TINYCV_MPP_TEMPO_RECIPIENT: "0x742d35Cc6634c0532925a3b844bC9e7595F8fE00",
      TINYCV_MPP_TEMPO_TESTNET: "false",
      TINYCV_X402_EVM_ADDRESS: "0x742d35Cc6634c0532925a3b844bC9e7595F8fE00",
      TINYCV_X402_FACILITATOR_URL: "https://facilitator.example.com",
      TINYCV_X402_NETWORK: "eip155:8453",
    });

    expect(getMachinePaymentConfigurationIssues(config, "production")).toContain(
      "MPP realm must be the public service host, not a Vercel deployment host.",
    );
  });

  it("validates paid resume bodies before payment", () => {
    expect(() => normalizePaidCreateResumeRequest({
      external_resume_id: "not-supported",
      input_format: "markdown",
      markdown: STRONG_AGENT_RESUME_MARKDOWN,
    })).toThrow(DeveloperPlatformValidationError);

    const normalized = normalizePaidCreateResumeRequest({
      client_reference_id: "agent-123",
      input_format: "markdown",
      markdown: STRONG_AGENT_RESUME_MARKDOWN,
      return_edit_claim_url: true,
    });

    expect(normalized.input_format).toBe("markdown");
    expect(normalized.client_reference_id).toBe("agent-123");
    expect(normalized.markdown).toContain("Northstar Labs");
  });

  it("rejects bad paid publish markdown before payment", () => {
    expect(() => normalizePaidCreateResumeRequest({
      input_format: "markdown",
      markdown: BAD_PUBLISH_MARKDOWN,
    })).toThrow(DeveloperPlatformValidationError);

    try {
      normalizePaidCreateResumeRequest({
        input_format: "markdown",
        markdown: BAD_PUBLISH_MARKDOWN,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(DeveloperPlatformValidationError);
      expect((error as DeveloperPlatformValidationError).errors.map((issue) => issue.code)).toEqual(
        expect.arrayContaining([
          "missing_summary",
          "headline_too_long",
          "inline_bullet_separator",
        ]),
      );
    }
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
      amountUsd: "0.250000",
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
      amountUsd: "0.250000",
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
      amountUsd: "0.100000",
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
      amountUsd: "0.100000",
      network: "eip155:8453",
      payer: "0xpayer",
      paymentMethod: "exact",
      protocol: "x402",
      reference: "0xsettlement",
      resumeId: "res-789",
    });
  });

  it("adds Bazaar schemas to x402 payment-required headers for runtime discovery", () => {
    const header = Buffer.from(JSON.stringify({
      accepts: [],
      resource: {
        url: "https://tiny.cv/api/v1/paid/agent-finish",
      },
      x402Version: 2,
    })).toString("base64url");
    const enriched = attachX402BazaarSchemaToPaymentRequiredHeader(
      header,
      MACHINE_PAYMENT_ROUTE_KEYS.AGENT_FINISH,
    );
    const decoded = JSON.parse(Buffer.from(enriched, "base64url").toString("utf8"));

    expect(decoded.extensions.bazaar.schema.properties.input.properties.body).toMatchObject({
      oneOf: expect.any(Array),
    });
    expect(decoded.extensions.bazaar.schema.properties.output.properties.example).toMatchObject({
      properties: {
        claim: expect.any(Object),
        pdf_job: expect.any(Object),
        resume: expect.any(Object),
      },
    });
  });

  it("exposes paid metadata in OpenAPI for AgentCash and MPPScan discovery", () => {
    const spec = buildOpenApiSpec("http://localhost:3000") as {
      components: Record<string, Record<string, Record<string, unknown>>>;
      info: Record<string, unknown>;
      paths: Record<string, Record<string, Record<string, unknown>>>;
    };
    const paidCreate = spec.paths["/api/v1/paid/resumes"].post;
    const paidAgentFinish = spec.paths["/api/v1/paid/agent-finish"].post;
    const paidPdf = spec.paths["/api/v1/paid/resumes/{resume_id}/pdf-jobs"].post;

    expect(spec.components.securitySchemes.developerApiKey).toMatchObject({
      in: "header",
      name: "Authorization",
      type: "apiKey",
    });
    expect(spec.info["x-guidance"]).toEqual(expect.stringContaining("x402 or MPP"));
    expect(spec.info["x-guidance"]).toEqual(expect.stringContaining("Founder Pass"));
    expect(spec.info["x-guidance"]).toEqual(expect.stringContaining("quality_gate"));
    expect(spec.paths["/api/v1/templates"].get.security).toEqual([]);
    expect(spec.paths["/api/v1/resumes"].post.security).toEqual([{ developerApiKey: [] }]);
    expect(spec.paths["/api/v1/mcp"].post.security).toEqual([{ developerApiKey: [] }]);
    expect(spec.paths["/api/v1/resumes/validate"].post.requestBody).toMatchObject({
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ValidateResumeRequest" },
        },
      },
    });
    expect(paidCreate.responses).toHaveProperty("402");
    expect(paidCreate["x-payment-info"]).toMatchObject({
      price: {
        amount: "0.100000",
        currency: "USD",
        mode: "fixed",
      },
      protocols: [
        { x402: {} },
        { mpp: { currency: "USD", intent: "charge", method: "tempo" } },
      ],
    });
    expect(paidAgentFinish.responses).toHaveProperty("402");
    expect(paidAgentFinish.description).toEqual(expect.stringContaining("claimable edit link"));
    expect(paidAgentFinish["x-payment-info"]).toMatchObject({
      price: {
        amount: "0.250000",
      },
    });
    expect(paidPdf["x-payment-info"]).toMatchObject({
      price: {
        amount: "0.250000",
      },
    });

    const discoverySpec = buildOpenApiSpec("http://localhost:3000", {
      audience: "discovery",
    }) as {
      paths: Record<string, unknown>;
    };

    expect(Object.keys(discoverySpec.paths)).toEqual([
      "/api/v1/paid/resumes",
      "/api/v1/paid/agent-finish",
      "/api/v1/paid/resumes/{resume_id}/pdf-jobs",
    ]);
  });
});
