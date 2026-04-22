import { RESUME_JSON_SCHEMA } from "@/app/_lib/developer-resume-input";
import {
  buildMachinePaymentOpenApiInfo,
  MACHINE_PAYMENT_ROUTE_KEYS,
  parseDiscoveryOwnershipProofs,
} from "@/app/_lib/machine-payments";

const resumeIdParam = {
  in: "path",
  name: "resume_id",
  required: true,
  schema: { type: "string" },
};

const jobIdParam = {
  in: "path",
  name: "job_id",
  required: true,
  schema: { type: "string" },
};

const claimIdParam = {
  in: "path",
  name: "claim_id",
  required: true,
  schema: { type: "string" },
};

const idempotencyKeyHeader = {
  in: "header",
  name: "Idempotency-Key",
  required: true,
  schema: { type: "string" },
};

const rateLimitResponse = {
  description: "Rate limited. Retry after the seconds in the Retry-After header.",
  headers: {
    "Retry-After": {
      schema: { type: "integer" },
    },
  },
};

const paymentRequiredResponse = {
  description: "Payment required. Retry with x402 PAYMENT-SIGNATURE or MPP Authorization: Payment.",
  headers: {
    "Cache-Control": {
      schema: { type: "string" },
    },
    "PAYMENT-REQUIRED": {
      schema: { type: "string" },
    },
    "WWW-Authenticate": {
      schema: { type: "string" },
    },
  },
};

const paidPaymentSummarySchema = {
  properties: {
    benefits: {
      items: { type: "string" },
      type: "array",
    },
    charged_amount_usd: { type: "string" },
    premium_url_included: { const: false },
    product: { enum: ["agent_finish", "agent_publish", "pdf_export"], type: "string" },
    protocols_supported: {
      items: { enum: ["x402", "mpp"], type: "string" },
      type: "array",
    },
  },
  required: [
    "benefits",
    "charged_amount_usd",
    "premium_url_included",
    "product",
    "protocols_supported",
  ],
  type: "object",
};

const standardErrors = {
  "401": { description: "Unauthorized" },
  "404": { description: "Not found" },
  "429": rateLimitResponse,
};

const resumeRecordSchema = {
  properties: {
    client_reference_id: { type: ["string", "null"] },
    created_at: { format: "date-time", type: "string" },
    editor_claim_url: { type: "string" },
    external_resume_id: { type: ["string", "null"] },
    input_format: { enum: ["json", "markdown"], type: "string" },
    markdown: { type: "string" },
    pdf_url: { type: ["string", "null"] },
    public_url: { type: ["string", "null"] },
    published_at: { type: ["string", "null"] },
    resume_id: { type: "string" },
    status: { enum: ["draft", "published"], type: "string" },
    template_key: { type: "string" },
    title: { type: "string" },
    updated_at: { format: "date-time", type: "string" },
  },
  required: [
    "client_reference_id",
    "created_at",
    "external_resume_id",
    "input_format",
    "markdown",
    "pdf_url",
    "public_url",
    "published_at",
    "resume_id",
    "status",
    "template_key",
    "title",
    "updated_at",
  ],
  type: "object",
};

const createResumeRequestSchema = {
  oneOf: [
    {
      properties: {
        client_reference_id: { type: "string" },
        external_resume_id: { type: "string" },
        input_format: { const: "markdown" },
        markdown: { type: "string" },
        return_edit_claim_url: { type: "boolean" },
        style_overrides: { type: "object" },
        template_key: { type: "string" },
        title: { type: "string" },
        webhook_url: { format: "uri", type: "string" },
      },
      required: ["input_format", "markdown"],
      type: "object",
    },
    {
      properties: {
        client_reference_id: { type: "string" },
        external_resume_id: { type: "string" },
        input_format: { const: "json" },
        resume: RESUME_JSON_SCHEMA,
        return_edit_claim_url: { type: "boolean" },
        style: { type: "object" },
        template_key: { type: "string" },
        title: { type: "string" },
        webhook_url: { format: "uri", type: "string" },
      },
      required: ["input_format", "resume"],
      type: "object",
    },
  ],
};

const paidCreateResumeRequestSchema = {
  oneOf: [
    {
      additionalProperties: false,
      properties: {
        client_reference_id: { type: "string" },
        input_format: { const: "markdown" },
        markdown: { type: "string" },
        return_edit_claim_url: { type: "boolean" },
        style_overrides: { type: "object" },
        template_key: { type: "string" },
        title: { type: "string" },
      },
      required: ["input_format", "markdown"],
      type: "object",
    },
    {
      additionalProperties: false,
      properties: {
        client_reference_id: { type: "string" },
        input_format: { const: "json" },
        resume: RESUME_JSON_SCHEMA,
        return_edit_claim_url: { type: "boolean" },
        style: { type: "object" },
        template_key: { type: "string" },
        title: { type: "string" },
      },
      required: ["input_format", "resume"],
      type: "object",
    },
  ],
};

const pdfJobResponseSchema = {
  properties: {
    completed_at: { type: ["string", "null"] },
    error_code: { type: ["string", "null"] },
    error_message: { type: ["string", "null"] },
    job_id: { type: "string" },
    pdf_url: { type: ["string", "null"] },
    requested_at: { format: "date-time", type: "string" },
    resume_id: { type: "string" },
    status: { enum: ["cancelled", "completed", "failed", "processing", "queued"], type: "string" },
  },
  required: [
    "completed_at",
    "error_code",
    "error_message",
    "job_id",
    "pdf_url",
    "requested_at",
    "resume_id",
    "status",
  ],
  type: "object",
};

export function buildOpenApiSpec(origin?: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Tiny CV Developer API",
      version: "1.0.0",
      description: "Create, validate, publish, and export Tiny CV resumes for users and agents.",
      "x-guidance": "Agents can use bearer-token /api/v1 endpoints for project-owned workflows, or no-account paid /api/v1/paid endpoints with x402 or MPP. Bearer API keys are for developers and integrations that want durable projects, webhooks, and usage history. x402/MPP is for one-off agent execution with no account or API key. Before publishing or making a paid Agent Finish call, show the selected template, final markdown, unverified facts, and next action; ask for approval unless the user explicitly authorized autonomous publishing/payment. Use /api/v1/paid/agent-finish when an agent needs to turn resume markdown or JSON into a claimable hosted Tiny CV plus a queued PDF job. If a human wants to keep editing the markdown, return the editor_claim_url from Agent Finish, from paid create, or from bearer create/publish with return_edit_claim_url=true. Machine-payment calls do not include premium *.tiny.cv namespace ownership, Pro entitlements, or paid webhooks; a human Founder Pass is required for permanent premium URL identity.",
    },
    "x-discovery": {
      ownershipProofs: parseDiscoveryOwnershipProofs(),
    },
    "x-service-info": {
      categories: ["developer-tools", "media"],
    },
    servers: buildServers(origin),
    components: {
      securitySchemes: {
        bearerAuth: {
          scheme: "bearer",
          type: "http",
        },
        bootstrapSecret: {
          in: "header",
          name: "x-tinycv-bootstrap-secret",
          type: "apiKey",
        },
        workerSecret: {
          in: "header",
          name: "x-tinycv-worker-secret",
          type: "apiKey",
        },
      },
      schemas: {
        ApiError: {
          properties: {
            error: {
              properties: {
                code: { type: "string" },
                details: { type: "object" },
                message: { type: "string" },
                request_id: { type: "string" },
              },
              required: ["code", "message", "request_id"],
              type: "object",
            },
          },
          required: ["error"],
          type: "object",
        },
        ApiResumeRecord: resumeRecordSchema,
        CreateResumeRequest: createResumeRequestSchema,
        PaidCreatePdfJobRequest: {
          additionalProperties: false,
          properties: {},
          type: "object",
        },
        PaidCreateResumeRequest: paidCreateResumeRequestSchema,
        PaidCreateResumeResponse: {
          properties: {
            payment: paidPaymentSummarySchema,
            resume: resumeRecordSchema,
          },
          required: ["payment", "resume"],
          type: "object",
        },
        PaidAgentFinishResponse: {
          properties: {
            claim: {
              properties: {
                editor_claim_url: { type: ["string", "null"] },
                founder_pass_required_for_premium_url: { const: true },
                premium_url_included: { const: false },
              },
              required: [
                "editor_claim_url",
                "founder_pass_required_for_premium_url",
                "premium_url_included",
              ],
              type: "object",
            },
            payment: paidPaymentSummarySchema,
            pdf_job: pdfJobResponseSchema,
            resume: resumeRecordSchema,
          },
          required: ["claim", "payment", "pdf_job", "resume"],
          type: "object",
        },
        PdfJobResponse: pdfJobResponseSchema,
        ResumeJsonInput: RESUME_JSON_SCHEMA,
      },
    },
    paths: {
      "/api/v1/projects/bootstrap": {
        post: {
          description: "Create a project and its first API key. Protected by the platform bootstrap secret.",
          responses: {
            "201": { description: "Project created" },
            "401": { description: "Invalid bootstrap secret" },
            "429": rateLimitResponse,
          },
          security: [{ bootstrapSecret: [] }],
        },
      },
      "/api/v1/templates": {
        get: {
          description: "List Tiny CV templates.",
          responses: {
            "200": { description: "Template list" },
          },
        },
      },
      "/api/v1/templates/{key}": {
        get: {
          description: "Fetch one Tiny CV template.",
          parameters: [{ in: "path", name: "key", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Template detail" },
            "404": { description: "Template not found" },
          },
        },
      },
      "/api/v1/spec/markdown": {
        get: {
          description: "Fetch the Tiny CV markdown guide.",
          responses: {
            "200": { description: "Markdown guide" },
          },
        },
      },
      "/api/v1/spec/json-schema": {
        get: {
          description: "Fetch JSON schema for structured resume input.",
          responses: {
            "200": { description: "JSON schema" },
          },
        },
      },
      "/api/v1/resumes/validate": {
        post: {
          description: "Validate markdown or JSON resume input without persisting it.",
          responses: {
            "200": { description: "Validation result" },
            ...standardErrors,
          },
          security: [{ bearerAuth: [] }],
        },
      },
      "/api/v1/resumes": {
        post: {
          description: "Create a Tiny CV draft from markdown or JSON. Requires Idempotency-Key for safe retries.",
          parameters: [idempotencyKeyHeader],
          requestBody: jsonRequestBody("#/components/schemas/CreateResumeRequest"),
          responses: {
            "201": { description: "Draft created" },
            "400": { description: "Invalid input or missing idempotency key" },
            ...standardErrors,
          },
          security: [{ bearerAuth: [] }],
        },
      },
      "/api/v1/resumes/{resume_id}": {
        get: {
          description: "Read a draft or published resume.",
          parameters: [resumeIdParam],
          responses: {
            "200": { description: "Resume detail" },
            ...standardErrors,
          },
          security: [{ bearerAuth: [] }],
        },
        patch: {
          description: "Update a draft resume. Requires Idempotency-Key for safe retries.",
          parameters: [resumeIdParam, idempotencyKeyHeader],
          requestBody: jsonRequestBody("#/components/schemas/CreateResumeRequest"),
          responses: {
            "200": { description: "Resume updated" },
            "400": { description: "Invalid input or missing idempotency key" },
            ...standardErrors,
          },
          security: [{ bearerAuth: [] }],
        },
      },
      "/api/v1/resumes/{resume_id}/publish": {
        post: {
          description: "Publish the current draft snapshot and return a public URL. Requires Idempotency-Key.",
          parameters: [resumeIdParam, idempotencyKeyHeader],
          responses: {
            "200": { description: "Resume published" },
            "400": { description: "Missing idempotency key" },
            ...standardErrors,
          },
          security: [{ bearerAuth: [] }],
        },
      },
      "/api/v1/resumes/{resume_id}/pdf-jobs": {
        post: {
          description: "Queue a durable PDF generation job for a published resume. Requires Idempotency-Key.",
          parameters: [resumeIdParam, idempotencyKeyHeader],
          responses: {
            "202": { description: "PDF job queued" },
            "400": { description: "Missing idempotency key" },
            "409": { description: "Resume is not published" },
            ...standardErrors,
          },
          security: [{ bearerAuth: [] }],
        },
      },
      "/api/v1/paid/resumes": {
        post: {
          description: "No-account machine-payment endpoint that creates, publishes, and returns a standard public Tiny CV resume URL. The response includes a claimable edit link by default, but does not reserve a premium *.tiny.cv URL.",
          parameters: [idempotencyKeyHeader],
          requestBody: jsonRequestBody("#/components/schemas/PaidCreateResumeRequest"),
          responses: {
            "201": jsonResponse("Created and published paid resume", "#/components/schemas/PaidCreateResumeResponse"),
            "400": { description: "Invalid input or missing idempotency key" },
            "402": paymentRequiredResponse,
            "429": rateLimitResponse,
            "503": { description: "Machine payments are disabled or not configured" },
          },
          "x-payment-info": buildMachinePaymentOpenApiInfo(
            MACHINE_PAYMENT_ROUTE_KEYS.CREATE_AND_PUBLISH_RESUME,
          ),
        },
      },
      "/api/v1/paid/agent-finish": {
        post: {
          description: "No-account x402/MPP endpoint for agents that need a finished Tiny CV package in one paid operation: standard hosted URL, claimable edit link, queued PDF job, and payment receipt. Agent Finish always creates a claim link. It does not include premium *.tiny.cv namespace ownership.",
          parameters: [idempotencyKeyHeader],
          requestBody: jsonRequestBody("#/components/schemas/PaidCreateResumeRequest"),
          responses: {
            "202": jsonResponse("Agent Finish package queued", "#/components/schemas/PaidAgentFinishResponse"),
            "400": { description: "Invalid input or missing idempotency key" },
            "402": paymentRequiredResponse,
            "429": rateLimitResponse,
            "503": { description: "Machine payments are disabled or not configured" },
          },
          "x-payment-info": buildMachinePaymentOpenApiInfo(
            MACHINE_PAYMENT_ROUTE_KEYS.AGENT_FINISH,
          ),
        },
      },
      "/api/v1/paid/resumes/{resume_id}/pdf-jobs": {
        post: {
          description: "No-account machine-payment endpoint that queues a PDF job for a paid, published resume.",
          parameters: [resumeIdParam, idempotencyKeyHeader],
          requestBody: jsonRequestBody("#/components/schemas/PaidCreatePdfJobRequest"),
          responses: {
            "202": jsonResponse("Paid PDF job queued", "#/components/schemas/PdfJobResponse"),
            "400": { description: "Invalid input or missing idempotency key" },
            "402": paymentRequiredResponse,
            "404": { description: "Resume not found or not owned by the machine-payment project" },
            "409": { description: "Resume is not published" },
            "429": rateLimitResponse,
            "503": { description: "Machine payments are disabled or not configured" },
          },
          "x-payment-info": buildMachinePaymentOpenApiInfo(MACHINE_PAYMENT_ROUTE_KEYS.CREATE_PDF_JOB),
        },
      },
      "/api/v1/pdf-jobs/{job_id}": {
        get: {
          description: "Get PDF job status and a signed PDF URL when complete.",
          parameters: [jobIdParam],
          responses: {
            "200": { description: "PDF job detail" },
            ...standardErrors,
          },
          security: [{ bearerAuth: [] }],
        },
      },
      "/api/v1/edit-claims/{claim_id}/consume": {
        post: {
          description: "Consume a one-time edit claim and attach the resume to the current browser workspace.",
          parameters: [claimIdParam],
          responses: {
            "200": { description: "Claim consumed" },
            "404": { description: "Claim not found" },
            "409": { description: "Claim expired or already consumed" },
            "429": rateLimitResponse,
          },
        },
      },
      "/api/v1/mcp": {
        get: {
          description: "Describe the Tiny CV MCP endpoint.",
          responses: {
            "200": { description: "MCP server metadata" },
          },
        },
        post: {
          description: "Remote MCP endpoint for Tiny CV tools over JSON-RPC.",
          responses: {
            "200": { description: "MCP JSON-RPC response" },
            ...standardErrors,
          },
          security: [{ bearerAuth: [] }],
        },
      },
      "/api/v1/jobs/process": {
        post: {
          description: "Internal worker endpoint for durable PDF and webhook processing.",
          responses: {
            "200": { description: "Worker batch processed" },
            "401": { description: "Invalid worker secret" },
            "503": { description: "Worker not configured" },
          },
          security: [{ workerSecret: [] }],
        },
      },
    },
  };
}

function buildServers(origin?: string) {
  const servers = [
    origin ? { url: origin } : null,
    { url: "https://tinycv.app" },
    { url: "http://localhost:3000" },
  ].filter((server): server is { url: string } => Boolean(server));
  const seen = new Set<string>();

  return servers.filter((server) => {
    if (seen.has(server.url)) {
      return false;
    }

    seen.add(server.url);
    return true;
  });
}

function jsonRequestBody(schemaRef: string) {
  return {
    content: {
      "application/json": {
        schema: { $ref: schemaRef },
      },
    },
    required: true,
  };
}

function jsonResponse(description: string, schemaRef: string) {
  return {
    content: {
      "application/json": {
        schema: { $ref: schemaRef },
      },
    },
    description,
  };
}
