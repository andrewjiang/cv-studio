import { NextResponse } from "next/server";
import { RESUME_JSON_SCHEMA } from "@/app/_lib/developer-resume-input";

export const dynamic = "force-static";

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

const standardErrors = {
  "401": { description: "Unauthorized" },
  "404": { description: "Not found" },
  "429": rateLimitResponse,
};

export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Tiny CV Developer API",
      version: "1.0.0",
      description: "Create, validate, publish, and export Tiny CV resumes for users and agents.",
    },
    servers: [
      { url: "https://tinycv.app" },
      { url: "http://localhost:3000" },
    ],
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
  });
}
