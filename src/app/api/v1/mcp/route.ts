import { NextResponse, type NextRequest } from "next/server";
import {
  TINYCV_AGENT_COOKBOOK,
  TINYCV_AGENT_FINISH_GUIDE,
  TINYCV_MARKDOWN_GUIDE,
} from "@/app/_lib/developer-platform-guides";
import { RESUME_JSON_SCHEMA, validateResumeInput } from "@/app/_lib/developer-resume-input";
import {
  DeveloperPlatformConflictError,
  createProjectPdfJob,
  createProjectResumeDraft,
  fulfillIdempotentProjectRequest,
  getProjectPdfJob,
  getProjectResume,
  publishProjectResume,
  reserveIdempotentProjectRequest,
  updateProjectResumeDraft,
} from "@/app/_lib/developer-platform-store";
import { parseIdempotencyKey, sha256 } from "@/app/_lib/developer-platform-auth";
import type {
  CreatePdfJobRequest,
  CreateResumeRequest,
  PublishResumeRequest,
  UpdateResumeRequest,
  ValidateResumeRequest,
} from "@/app/_lib/developer-platform-types";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";
import { getResumeTemplate, RESUME_TEMPLATES, RESUME_TEMPLATE_MAP } from "@/app/_lib/resume-templates";
import {
  assertProjectRateLimit,
  createApiRequestId,
  handleDeveloperPlatformError,
  requireProjectAuth,
  scheduleDeveloperPlatformBackgroundWork,
  withAbsolutePdfJobUrls,
  withAbsoluteResumeUrls,
} from "@/app/api/v1/_lib";

type JsonRpcRequest = {
  id?: string | number | null;
  jsonrpc?: string;
  method?: string;
  params?: Record<string, unknown>;
};

export async function GET() {
  return NextResponse.json({
    name: "tinycv-mcp",
    transport: "http-jsonrpc",
  });
}

export async function POST(request: NextRequest) {
  const requestId = createApiRequestId();

  try {
    const authenticated = await requireProjectAuth(request);
    await assertProjectRateLimit(request, "api:mcp", authenticated.project.id);
    scheduleDeveloperPlatformBackgroundWork();
    const body = await request.json() as JsonRpcRequest;
    const id = body.id ?? null;
    const method = body.method ?? "";
    const params = body.params ?? {};
    const origin = request.nextUrl.origin;

    if (body.jsonrpc !== "2.0" || !method) {
      return jsonRpcError(id, -32600, "Invalid JSON-RPC request.");
    }

    if (method === "initialize") {
      return jsonRpcResult(id, {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
        protocolVersion: "2025-03-26",
        serverInfo: {
          name: "tinycv-mcp",
          version: "1.0.0",
        },
      });
    }

    if (method === "ping") {
      return jsonRpcResult(id, {});
    }

    if (method === "tools/list") {
      return jsonRpcResult(id, {
        tools: [
          {
            description: "List all Tiny CV starter templates.",
            inputSchema: { properties: {}, type: "object" },
            name: "tinycv_list_templates",
          },
          {
            description: "Fetch a specific Tiny CV template and starter markdown.",
            inputSchema: {
              properties: { key: { type: "string" } },
              required: ["key"],
              type: "object",
            },
            name: "tinycv_get_template",
          },
          {
            description: "Read the Tiny CV markdown guide.",
            inputSchema: { properties: {}, type: "object" },
            name: "tinycv_get_markdown_guide",
          },
          {
            description: "Read the Tiny CV JSON schema for structured resume input.",
            inputSchema: { properties: {}, type: "object" },
            name: "tinycv_get_json_schema",
          },
          {
            description: "Validate Tiny CV markdown or JSON input without persisting it.",
            inputSchema: { type: "object" },
            name: "tinycv_validate_resume",
          },
          {
            description: "Create a Tiny CV draft. This mutates state; send a JSON-RPC id or Idempotency-Key for safe retries.",
            inputSchema: { type: "object" },
            name: "tinycv_create_resume_draft",
          },
          {
            description: "Update an existing Tiny CV draft. This mutates state; send a JSON-RPC id or Idempotency-Key for safe retries.",
            inputSchema: { type: "object" },
            name: "tinycv_update_resume_draft",
          },
          {
            description: "Publish a Tiny CV draft and create a public URL. This mutates state; send a JSON-RPC id or Idempotency-Key for safe retries.",
            inputSchema: {
              properties: {
                resume_id: { type: "string" },
                return_edit_claim_url: { type: "boolean" },
                webhook_url: { type: "string" },
              },
              required: ["resume_id"],
              type: "object",
            },
            name: "tinycv_publish_resume",
          },
          {
            description: "Start PDF generation for a published resume. This mutates state; send a JSON-RPC id or Idempotency-Key for safe retries.",
            inputSchema: {
              properties: {
                resume_id: { type: "string" },
                webhook_url: { type: "string" },
              },
              required: ["resume_id"],
              type: "object",
            },
            name: "tinycv_request_pdf",
          },
          {
            description: "Fetch Tiny CV resume status and URLs.",
            inputSchema: {
              properties: {
                resume_id: { type: "string" },
              },
              required: ["resume_id"],
              type: "object",
            },
            name: "tinycv_get_resume_status",
          },
          {
            description: "Fetch Tiny CV PDF job status.",
            inputSchema: {
              properties: {
                job_id: { type: "string" },
              },
              required: ["job_id"],
              type: "object",
            },
            name: "tinycv_get_pdf_job_status",
          },
        ],
      });
    }

    if (method === "resources/list") {
      return jsonRpcResult(id, {
        resources: [
          { mimeType: "text/markdown", name: "Tiny CV Agent Guide", uri: "tinycv://guides/agent-finish" },
          { mimeType: "text/markdown", name: "Tiny CV Markdown Guide", uri: "tinycv://spec/markdown" },
          { mimeType: "application/schema+json", name: "Tiny CV JSON Schema", uri: "tinycv://spec/json-schema" },
          ...RESUME_TEMPLATES.map((template) => ({
            mimeType: "text/markdown",
            name: template.label,
            uri: `tinycv://templates/${template.key}`,
          })),
        ],
      });
    }

    if (method === "resources/read") {
      const uri = typeof params.uri === "string" ? params.uri : "";
      return jsonRpcResult(id, {
        contents: readMcpResource(uri),
      });
    }

    if (method === "prompts/list") {
      return jsonRpcResult(id, {
        prompts: [
          { name: "convert_profile_to_tinycv_resume" },
          { name: "revise_resume_for_role" },
          { name: "create_founder_resume_from_background" },
        ],
      });
    }

    if (method === "prompts/get") {
      const name = typeof params.name === "string" ? params.name : "";
      return jsonRpcResult(id, {
        messages: buildPromptMessages(name),
      });
    }

    if (method === "tools/call") {
      const name = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;

      const result = await callMcpTool({
        args,
        idempotencyKey: parseIdempotencyKey(request) ?? buildJsonRpcIdempotencyKey(id),
        origin,
        projectId: authenticated.project.id,
        toolName: name,
      });

      return jsonRpcResult(id, {
        content: [
          {
            text: JSON.stringify(result, null, 2),
            type: "text",
          },
        ],
      });
    }

    return jsonRpcError(id, -32601, `Unsupported MCP method: ${method}`);
  } catch (error) {
    try {
      const response = handleDeveloperPlatformError(requestId, error);

      if (response.status >= 400 && response.status < 600) {
        return jsonRpcError(null, -32000, "Tiny CV MCP request failed.", await response.json());
      }
    } catch {
      return jsonRpcError(
        null,
        -32001,
        error instanceof Error ? error.message : "Tiny CV MCP request failed.",
      );
    }
  }
}

async function callMcpTool(input: {
  args: Record<string, unknown>;
  idempotencyKey: string | null;
  origin: string;
  projectId: string;
  toolName: string;
}) {
  if (input.toolName === "tinycv_list_templates") {
    return {
      templates: RESUME_TEMPLATES.map((template) => ({
        badge: template.badge,
        description: template.description,
        key: template.key,
        label: template.label,
      })),
    };
  }

  if (input.toolName === "tinycv_get_template") {
    const key = typeof input.args.key === "string" ? input.args.key : "";

    if (!isTemplateKey(key)) {
      throw new Error("Unknown template key.");
    }

    return getResumeTemplate(key);
  }

  if (input.toolName === "tinycv_get_markdown_guide") {
    return { guide: TINYCV_MARKDOWN_GUIDE };
  }

  if (input.toolName === "tinycv_get_json_schema") {
    return RESUME_JSON_SCHEMA;
  }

  if (input.toolName === "tinycv_validate_resume") {
    return validateResumeInput(input.args as ValidateResumeRequest);
  }

  if (input.toolName === "tinycv_create_resume_draft") {
    return executeIdempotentMcpMutation({
      args: input.args,
      execute: async () => {
        const payload = await createProjectResumeDraft({
          body: input.args as CreateResumeRequest,
          projectId: input.projectId,
        });

        return withAbsoluteResumeUrls(input.origin, payload.record);
      },
      idempotencyKey: input.idempotencyKey,
      projectId: input.projectId,
      toolName: input.toolName,
    });
  }

  if (input.toolName === "tinycv_update_resume_draft") {
    return executeIdempotentMcpMutation({
      args: input.args,
      execute: async () => {
        const resumeId = typeof input.args.resume_id === "string" ? input.args.resume_id : "";

        const payload = await updateProjectResumeDraft({
          body: input.args as UpdateResumeRequest,
          projectId: input.projectId,
          resumeId,
        });

        if (!payload) {
          throw new Error("Resume not found.");
        }

        return withAbsoluteResumeUrls(input.origin, payload.record);
      },
      idempotencyKey: input.idempotencyKey,
      projectId: input.projectId,
      toolName: input.toolName,
    });
  }

  if (input.toolName === "tinycv_publish_resume") {
    return executeIdempotentMcpMutation({
      args: input.args,
      execute: async () => {
        const resumeId = typeof input.args.resume_id === "string" ? input.args.resume_id : "";

        const payload = await publishProjectResume({
          body: input.args as PublishResumeRequest,
          projectId: input.projectId,
          resumeId,
        });

        if (!payload) {
          throw new Error("Resume not found.");
        }

        return withAbsoluteResumeUrls(input.origin, payload.record);
      },
      idempotencyKey: input.idempotencyKey,
      projectId: input.projectId,
      toolName: input.toolName,
    });
  }

  if (input.toolName === "tinycv_request_pdf") {
    return executeIdempotentMcpMutation({
      args: input.args,
      execute: async () => {
        const resumeId = typeof input.args.resume_id === "string" ? input.args.resume_id : "";

        const payload = await createProjectPdfJob({
          body: input.args as CreatePdfJobRequest,
          idempotencyKey: input.idempotencyKey,
          projectId: input.projectId,
          resumeId,
        });

        if (!payload) {
          throw new Error("Resume not found.");
        }

        return withAbsolutePdfJobUrls(input.origin, payload);
      },
      idempotencyKey: input.idempotencyKey,
      projectId: input.projectId,
      toolName: input.toolName,
    });
  }

  if (input.toolName === "tinycv_get_resume_status") {
    const resumeId = typeof input.args.resume_id === "string" ? input.args.resume_id : "";
    const payload = await getProjectResume({
      projectId: input.projectId,
      resumeId,
    });

    if (!payload) {
      throw new Error("Resume not found.");
    }

    return withAbsoluteResumeUrls(input.origin, payload.record);
  }

  if (input.toolName === "tinycv_get_pdf_job_status") {
    const jobId = typeof input.args.job_id === "string" ? input.args.job_id : "";
    const payload = await getProjectPdfJob({
      jobId,
      projectId: input.projectId,
    });

    if (!payload) {
      throw new Error("PDF job not found.");
    }

    return withAbsolutePdfJobUrls(input.origin, payload);
  }

  throw new Error(`Unknown Tiny CV tool: ${input.toolName}`);
}

async function executeIdempotentMcpMutation(input: {
  args: Record<string, unknown>;
  execute: () => Promise<object>;
  idempotencyKey: string | null;
  projectId: string;
  toolName: string;
}) {
  if (!input.idempotencyKey) {
    throw new DeveloperPlatformConflictError(
      "missing_idempotency_key",
      "Mutating MCP tool calls require an Idempotency-Key header or JSON-RPC id.",
    );
  }

  const operation = `MCP:${input.toolName}`;
  const requestHash = sha256(JSON.stringify(input.args));
  const reservation = await reserveIdempotentProjectRequest({
    idempotencyKey: input.idempotencyKey,
    operation,
    projectId: input.projectId,
    requestHash,
  });

  if (reservation.status === "replay") {
    return reservation.responseBody as object;
  }

  const result = await input.execute();

  await fulfillIdempotentProjectRequest({
    idempotencyKey: input.idempotencyKey,
    operation,
    projectId: input.projectId,
    responseBody: result,
    statusCode: 200,
  });

  return result;
}

function buildJsonRpcIdempotencyKey(id: JsonRpcRequest["id"]) {
  if (id === null || id === undefined) {
    return null;
  }

  return `jsonrpc:${String(id)}`;
}

function readMcpResource(uri: string) {
  if (uri === "tinycv://guides/agent-finish") {
    return [{
      mimeType: "text/markdown",
      text: TINYCV_AGENT_FINISH_GUIDE,
      uri,
    }];
  }

  if (uri === "tinycv://spec/markdown") {
    return [{
      mimeType: "text/markdown",
      text: TINYCV_MARKDOWN_GUIDE,
      uri,
    }];
  }

  if (uri === "tinycv://spec/json-schema") {
    return [{
      mimeType: "application/schema+json",
      text: JSON.stringify(RESUME_JSON_SCHEMA, null, 2),
      uri,
    }];
  }

  const match = uri.match(/^tinycv:\/\/templates\/([a-z]+)$/);

  if (!match) {
    throw new Error("Unknown Tiny CV resource.");
  }

  const key = match[1];

  if (!isTemplateKey(key)) {
    throw new Error("Unknown Tiny CV template resource.");
  }

  const template = getResumeTemplate(key);

  return [{
    mimeType: "text/markdown",
    text: template.markdown,
    uri,
  }];
}

function buildPromptMessages(name: string) {
  if (name === "convert_profile_to_tinycv_resume") {
    return [{
      content: {
        text: `${TINYCV_AGENT_FINISH_GUIDE}\n\n${TINYCV_AGENT_COOKBOOK}\n\nUse the JSON schema or markdown guide to produce a complete Tiny CV resume.`,
        type: "text",
      },
      role: "user",
    }];
  }

  if (name === "revise_resume_for_role") {
    return [{
      content: {
        text: "Revise the existing Tiny CV resume for a specific role, keeping the markdown valid and concise.",
        type: "text",
      },
      role: "user",
    }];
  }

  if (name === "create_founder_resume_from_background") {
    return [{
      content: {
        text: "Create a founder/operator Tiny CV resume from a background summary using the founder template.",
        type: "text",
      },
      role: "user",
    }];
  }

  throw new Error("Unknown Tiny CV prompt.");
}

function jsonRpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({
    id,
    jsonrpc: "2.0",
    result,
  });
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
) {
  return NextResponse.json({
    error: {
      code,
      data,
      message,
    },
    id,
    jsonrpc: "2.0",
  });
}

function isTemplateKey(value: string): value is TemplateKey {
  return RESUME_TEMPLATE_MAP.has(value as TemplateKey);
}
