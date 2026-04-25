import { RESUME_JSON_SCHEMA } from "@/app/_lib/developer-resume-input";
import {
  STRONG_AGENT_RESUME_HEADLINE,
  STRONG_AGENT_RESUME_MARKDOWN,
  STRONG_AGENT_RESUME_MARKDOWN_PREVIEW,
  STRONG_AGENT_RESUME_NAME,
  STRONG_AGENT_RESUME_TITLE,
} from "@/app/_lib/resume-examples";

export type DeveloperEndpointDoc = {
  auth: "bearer" | "bootstrap-secret" | "machine-payment" | "none";
  category: "Agent" | "Core" | "Export" | "Getting Started" | "Reference";
  description: string;
  exampleRequestBody?: Record<string, unknown>;
  exampleResponse?: Record<string, unknown>;
  idempotent?: boolean;
  method: "GET" | "PATCH" | "POST";
  path: string;
  pathParams?: Array<{
    key: string;
    placeholder: string;
  }>;
  slug: string;
  summary: string;
};

export const DEVELOPER_QUICKSTART = [
  {
    copy: "Use the documentation page to create a project and reveal your first live API key. This is the best path for durable integrations.",
    title: "Get a key",
  },
  {
    copy: "Send markdown or JSON to create a draft resume.",
    title: "Create a draft",
  },
  {
    copy: "Publish when you want a public URL. Queue a PDF only if you need one.",
    title: "Publish it",
  },
];

export const DEVELOPER_ENDPOINT_DOCS: DeveloperEndpointDoc[] = [
  {
    auth: "bootstrap-secret",
    category: "Getting Started",
    description: "Protected bootstrap flow for managed or internal provisioning. The public documentation experience is the easiest way to create your first project and API key.",
    exampleRequestBody: {
      api_key_label: "Production Agent Key",
      name: "Acme Recruiting Agent",
      slug: "acme-agent",
    },
    exampleResponse: {
      apiKey: {
        key: "tcv_live_xxxxxxxxxxxxxxxxxxxxxxxx",
        keyPrefix: "tcv_live_xxxxxxxxx",
        label: "Production Agent Key",
      },
      project: {
        createdAt: "2026-04-15T10:12:00.000Z",
        id: "proj_123",
        name: "Acme Recruiting Agent",
        slug: "acme-agent",
        updatedAt: "2026-04-15T10:12:00.000Z",
      },
      webhookSecret: "tcv_wsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
    method: "POST",
    path: "/api/v1/projects/bootstrap",
    slug: "bootstrap-project",
    summary: "Bootstrap a project (protected)",
  },
  {
    auth: "none",
    category: "Reference",
    description: "List the built-in Tiny CV starter templates.",
    exampleResponse: {
      templates: [
        { badge: "Technical", description: "Builder-first template.", key: "engineer", label: "Engineer" },
      ],
    },
    method: "GET",
    path: "/api/v1/templates",
    slug: "list-templates",
    summary: "List templates",
  },
  {
    auth: "none",
    category: "Reference",
    description: "Fetch one template and its starter markdown.",
    exampleResponse: {
      badge: "Creative",
      description: "A stronger portfolio-forward structure for designers.",
      key: "designer",
      label: "Designer",
      markdown: "---\nstylePreset: creative\n...\n# Maya Chen",
    },
    method: "GET",
    path: "/api/v1/templates/{key}",
    pathParams: [
      { key: "key", placeholder: "designer" },
    ],
    slug: "get-template",
    summary: "Fetch a single template",
  },
  {
    auth: "none",
    category: "Reference",
    description: "Fetch the canonical markdown guide for Tiny CV resumes.",
    exampleResponse: {
      format: "markdown",
      guide: "# Tiny CV Markdown Guide\n...",
    },
    method: "GET",
    path: "/api/v1/spec/markdown",
    slug: "markdown-guide",
    summary: "Get markdown guide",
  },
  {
    auth: "none",
    category: "Reference",
    description: "Fetch JSON Schema for structured resume input.",
    exampleResponse: RESUME_JSON_SCHEMA as unknown as Record<string, unknown>,
    method: "GET",
    path: "/api/v1/spec/json-schema",
    slug: "json-schema",
    summary: "Get JSON schema",
  },
  {
    auth: "bearer",
    category: "Core",
    description: "Validate markdown or JSON input without persisting anything. Use quality_gate: \"publish\" before publishing or making a paid Agent Finish call. In experience-like sections, use *Location, Remote, or website | Dates* on the italic metadata line.",
    exampleRequestBody: {
      input_format: "json",
      quality_gate: "publish",
      resume: {
        contact: [
          { kind: "email", value: "maya@example.com" },
        ],
        headline: "Product Designer",
        name: "Maya Chen",
        sections: [
          {
            paragraphs: ["Designer with strong systems and product instincts."],
            type: "summary",
          },
          {
            entries: [
              {
                bullets: ["Led product design for a new workflow experience."],
                meta_left: "Remote",
                meta_right: "2022 - Present",
                title: "Senior Product Designer",
                title_extras: ["Northstar"],
              },
            ],
            title: "Experience",
            type: "entries",
          },
        ],
      },
      style: {
        accentTone: "plum",
        stylePreset: "creative",
      },
      template_key: "designer",
    },
    exampleResponse: {
      errors: [],
      inferred_template_key: "designer",
      normalized_markdown: "---\nstylePreset: creative\n...\n# Maya Chen",
      publish_errors: [],
      publish_ready: true,
      quality_warnings: [],
      valid: true,
      warnings: [],
    },
    method: "POST",
    path: "/api/v1/resumes/validate",
    slug: "validate-resume",
    summary: "Validate input",
  },
  {
    auth: "bearer",
    category: "Core",
    description: "Create a Tiny CV draft from markdown or JSON. Returns the canonical markdown that Tiny CV stored. Send Idempotency-Key so retries do not create duplicates.",
    exampleRequestBody: {
      input_format: "markdown",
      markdown: STRONG_AGENT_RESUME_MARKDOWN,
      return_edit_claim_url: true,
      template_key: "founder",
      title: STRONG_AGENT_RESUME_TITLE,
      webhook_url: "https://example.com/tinycv/webhooks",
    },
    exampleResponse: {
      created_at: "2026-04-15T10:14:00.000Z",
      editor_claim_url: "https://tinycv.app/claim/claim_123?token=tcv_claim_xxx",
      external_resume_id: null,
      input_format: "markdown",
      markdown: STRONG_AGENT_RESUME_MARKDOWN_PREVIEW,
      pdf_url: null,
      public_url: null,
      published_at: null,
      resume_id: "res_123",
      status: "draft",
      template_key: "founder",
      title: STRONG_AGENT_RESUME_TITLE,
      updated_at: "2026-04-15T10:14:00.000Z",
    },
    idempotent: true,
    method: "POST",
    path: "/api/v1/resumes",
    slug: "create-resume",
    summary: "Create a draft",
  },
  {
    auth: "machine-payment",
    category: "Agent",
    description: "Lower-level no-account paid path for agents. Submit publish-ready markdown or JSON with Idempotency-Key, receive a 402 challenge, then retry with either x402 PAYMENT-SIGNATURE or MPP Authorization: Payment. Invalid publish-ready markdown returns 400 before any payment challenge. In experience-like sections, use *Location, Remote, or website | Dates* on the italic metadata line. The resume is published immediately with a standard public URL and a claimable edit link by default. Premium *.tiny.cv URL ownership is not included.",
    exampleRequestBody: {
      client_reference_id: "agent-run-2026-04-21",
      input_format: "markdown",
      markdown: STRONG_AGENT_RESUME_MARKDOWN,
      return_edit_claim_url: true,
      template_key: "founder",
      title: STRONG_AGENT_RESUME_TITLE,
    },
    exampleResponse: {
      payment: {
        benefits: ["standard_hosted_url", "claimable_edit_link", "payment_receipt"],
        charged_amount_usd: "0.100000",
        premium_url_included: false,
        product: "agent_publish",
        protocols_supported: ["x402", "mpp"],
      },
      resume: {
        created_at: "2026-04-15T10:20:00.000Z",
        editor_claim_url: "https://tinycv.app/claim/claim_124?token=tcv_claim_xxx",
        external_resume_id: null,
        input_format: "markdown",
        markdown: STRONG_AGENT_RESUME_MARKDOWN_PREVIEW,
        pdf_url: null,
        public_url: "https://tinycv.app/SteadyBlueHeron",
        published_at: "2026-04-15T10:20:00.000Z",
        resume_id: "res_paid_123",
        status: "published",
        template_key: "founder",
        title: STRONG_AGENT_RESUME_TITLE,
        updated_at: "2026-04-15T10:20:00.000Z",
      },
    },
    idempotent: true,
    method: "POST",
    path: "/api/v1/paid/resumes",
    slug: "paid-create-resume",
    summary: "Paid publish with x402 or MPP",
  },
  {
    auth: "machine-payment",
    category: "Agent",
    description: "Recommended one-off paid path for autonomous agents. One x402 or MPP payment turns publish-ready resume markdown or JSON into a Tiny CV package: standard hosted URL, claimable edit link, queued PDF job, and payment receipt. Invalid publish-ready markdown returns 400 before any payment challenge. In experience-like sections, use *Location, Remote, or website | Dates* on the italic metadata line. Agent Finish always creates a claim link. This does not reserve a premium *.tiny.cv URL; that remains a human Founder Pass benefit.",
    exampleRequestBody: {
      client_reference_id: "agent-run-2026-04-21",
      input_format: "markdown",
      markdown: STRONG_AGENT_RESUME_MARKDOWN,
      template_key: "founder",
      title: STRONG_AGENT_RESUME_TITLE,
    },
    exampleResponse: {
      claim: {
        editor_claim_url: "https://tinycv.app/claim/claim_124?token=tcv_claim_xxx",
        founder_pass_required_for_premium_url: true,
        premium_url_included: false,
      },
      payment: {
        benefits: ["standard_hosted_url", "claimable_edit_link", "queued_pdf_export", "payment_receipt"],
        charged_amount_usd: "0.250000",
        premium_url_included: false,
        product: "agent_finish",
        protocols_supported: ["x402", "mpp"],
      },
      pdf_job: {
        completed_at: null,
        error_code: null,
        error_message: null,
        job_id: "job_paid_123",
        pdf_url: null,
        requested_at: "2026-04-15T10:21:00.000Z",
        resume_id: "res_paid_123",
        status: "queued",
      },
      resume: {
        created_at: "2026-04-15T10:20:00.000Z",
        editor_claim_url: "https://tinycv.app/claim/claim_124?token=tcv_claim_xxx",
        external_resume_id: null,
        input_format: "markdown",
        markdown: STRONG_AGENT_RESUME_MARKDOWN_PREVIEW,
        pdf_url: null,
        public_url: "https://tinycv.app/SteadyBlueHeron",
        published_at: "2026-04-15T10:20:00.000Z",
        resume_id: "res_paid_123",
        status: "published",
        template_key: "founder",
        title: STRONG_AGENT_RESUME_TITLE,
        updated_at: "2026-04-15T10:20:00.000Z",
      },
    },
    idempotent: true,
    method: "POST",
    path: "/api/v1/paid/agent-finish",
    slug: "paid-agent-finish",
    summary: "Agent Finish with x402 or MPP",
  },
  {
    auth: "bearer",
    category: "Core",
    description: "Read the current state of one draft or published resume.",
    exampleResponse: {
      created_at: "2026-04-15T10:14:00.000Z",
      input_format: "markdown",
      markdown: STRONG_AGENT_RESUME_MARKDOWN_PREVIEW,
      pdf_url: null,
      public_url: null,
      published_at: null,
      resume_id: "res_123",
      status: "draft",
      template_key: "founder",
      title: STRONG_AGENT_RESUME_TITLE,
      updated_at: "2026-04-15T10:14:00.000Z",
    },
    method: "GET",
    path: "/api/v1/resumes/{resume_id}",
    pathParams: [
      { key: "resume_id", placeholder: "res_123" },
    ],
    slug: "get-resume",
    summary: "Get a resume",
  },
  {
    auth: "bearer",
    category: "Core",
    description: "Update an existing draft using the same input contract as draft creation.",
    exampleRequestBody: {
      input_format: "json",
      resume: {
        headline: STRONG_AGENT_RESUME_HEADLINE,
        name: STRONG_AGENT_RESUME_NAME,
        sections: [
          {
            paragraphs: [
              "Product engineer who turns ambiguous customer problems into reliable, revenue-facing software.",
            ],
            type: "summary",
          },
          {
            entries: [
              {
                bullets: [
                  "Reduced time-to-first-publish from 38 minutes to 7 minutes for new teams.",
                ],
                meta_left: "San Francisco, CA",
                meta_right: "2022 - Present",
                title: "Principal Product Engineer",
                title_extras: ["Northstar Labs"],
              },
            ],
            title: "Experience",
            type: "entries",
          },
        ],
      },
      style: {
        density: "compact",
      },
    },
    exampleResponse: {
      created_at: "2026-04-15T10:14:00.000Z",
      input_format: "json",
      markdown: STRONG_AGENT_RESUME_MARKDOWN_PREVIEW,
      pdf_url: null,
      public_url: null,
      published_at: null,
      resume_id: "res_123",
      status: "draft",
      template_key: "founder",
      title: STRONG_AGENT_RESUME_TITLE,
      updated_at: "2026-04-15T10:18:00.000Z",
    },
    idempotent: true,
    method: "PATCH",
    path: "/api/v1/resumes/{resume_id}",
    pathParams: [
      { key: "resume_id", placeholder: "res_123" },
    ],
    slug: "update-resume",
    summary: "Update a draft",
  },
  {
    auth: "bearer",
    category: "Core",
    description: "Publish the current draft snapshot and get the public URL. Send Idempotency-Key so retries return the same publish result. API publish is strict: validate with quality_gate: \"publish\" first, fix malformed markdown, use *Location, Remote, or website | Dates* for experience metadata, and expect a 503 if browser fit measurement is unavailable.",
    exampleRequestBody: {
      return_edit_claim_url: true,
      webhook_url: "https://example.com/tinycv/webhooks",
    },
    exampleResponse: {
      created_at: "2026-04-15T10:14:00.000Z",
      editor_claim_url: "https://tinycv.app/claim/claim_124?token=tcv_claim_xxx",
      input_format: "markdown",
      markdown: STRONG_AGENT_RESUME_MARKDOWN_PREVIEW,
      pdf_url: null,
      public_url: "https://tinycv.app/SteadyBlueHeron",
      published_at: "2026-04-15T10:20:00.000Z",
      resume_id: "res_123",
      status: "published",
      template_key: "founder",
      title: STRONG_AGENT_RESUME_TITLE,
      updated_at: "2026-04-15T10:20:00.000Z",
    },
    idempotent: true,
    method: "POST",
    path: "/api/v1/resumes/{resume_id}/publish",
    pathParams: [
      { key: "resume_id", placeholder: "res_123" },
    ],
    slug: "publish-resume",
    summary: "Publish a resume",
  },
  {
    auth: "bearer",
    category: "Export",
    description: "Queue durable PDF generation for a published resume. Returns a pollable job immediately; webhooks are delivered from the worker outbox.",
    exampleRequestBody: {
      webhook_url: "https://example.com/tinycv/webhooks",
    },
    exampleResponse: {
      completed_at: null,
      error_code: null,
      error_message: null,
      job_id: "job_123",
      pdf_url: null,
      requested_at: "2026-04-15T10:21:00.000Z",
      resume_id: "res_123",
      status: "queued",
    },
    idempotent: true,
    method: "POST",
    path: "/api/v1/resumes/{resume_id}/pdf-jobs",
    pathParams: [
      { key: "resume_id", placeholder: "res_123" },
    ],
    slug: "create-pdf-job",
    summary: "Queue a PDF job",
  },
  {
    auth: "machine-payment",
    category: "Agent",
    description: "Lower-level no-account paid path for PDF generation. Only resumes created through the paid machine-payment project are accepted. Submit an empty JSON object with Idempotency-Key, receive a 402 challenge, then retry with x402 or MPP payment credentials. Use Agent Finish if you want create, publish, claim link, and queued PDF in one paid operation.",
    exampleRequestBody: {},
    exampleResponse: {
      completed_at: null,
      error_code: null,
      error_message: null,
      job_id: "job_paid_123",
      pdf_url: null,
      requested_at: "2026-04-15T10:21:00.000Z",
      resume_id: "res_paid_123",
      status: "queued",
    },
    idempotent: true,
    method: "POST",
    path: "/api/v1/paid/resumes/{resume_id}/pdf-jobs",
    pathParams: [
      { key: "resume_id", placeholder: "res_paid_123" },
    ],
    slug: "paid-create-pdf-job",
    summary: "Queue a paid PDF job",
  },
  {
    auth: "bearer",
    category: "Export",
    description: "Check PDF generation status and get a signed PDF URL once the artifact is ready.",
    exampleResponse: {
      completed_at: "2026-04-15T10:21:08.000Z",
      error_code: null,
      error_message: null,
      job_id: "job_123",
      pdf_url: "https://tinycv.app/api/v1/pdf-jobs/job_123/file?expires=...",
      requested_at: "2026-04-15T10:21:00.000Z",
      resume_id: "res_123",
      status: "completed",
    },
    method: "GET",
    path: "/api/v1/pdf-jobs/{job_id}",
    pathParams: [
      { key: "job_id", placeholder: "job_123" },
    ],
    slug: "get-pdf-job",
    summary: "Get PDF job status",
  },
  {
    auth: "none",
    category: "Export",
    description: "Consume a one-time edit claim and attach the resume into the current Tiny CV workspace.",
    exampleRequestBody: {
      token: "tcv_claim_xxxxxxxxxxxxxxxxx",
    },
    exampleResponse: {
      cleanEditorUrl: "/studio/res_123",
    },
    method: "POST",
    path: "/api/v1/edit-claims/{claim_id}/consume",
    pathParams: [
      { key: "claim_id", placeholder: "claim_123" },
    ],
    slug: "consume-claim",
    summary: "Consume an edit claim",
  },
  {
    auth: "bearer",
    category: "Agent",
    description: "Remote MCP endpoint for agent tools, resources, and prompts over JSON-RPC. Mutating tools use JSON-RPC ids as idempotency keys when no Idempotency-Key header is present.",
    exampleRequestBody: {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
    },
    exampleResponse: {
      id: 1,
      jsonrpc: "2.0",
      result: {
        tools: [
          { name: "tinycv_create_resume_draft" },
          { name: "tinycv_publish_resume" },
        ],
      },
    },
    method: "POST",
    path: "/api/v1/mcp",
    slug: "mcp-endpoint",
    summary: "Call the MCP server",
  },
];

export const DEVELOPER_DOC_RESOURCES = [
  {
    href: "/agents",
    label: "Agent guide",
    note: "Step-by-step guide for interviewing, template choice, markdown drafting, validation, publishing, and PDF export.",
  },
  {
    href: "/openapi.json",
    label: "Machine-payment OpenAPI 3.1 spec",
    note: "Root discovery document for AgentCash and MPPScan. Focused on paid x402/MPP routes.",
  },
  {
    href: "/api/v1/openapi.json",
    label: "Full OpenAPI 3.1 spec",
    note: "Complete versioned developer API schema for bearer-token integrations and internal tooling.",
  },
  {
    href: "/api/v1/spec/markdown",
    label: "Markdown guide",
    note: "Canonical input contract for Tiny CV markdown.",
  },
  {
    href: "/examples/founder",
    label: "Template examples",
    note: "Canonical full-resume examples. Start at /examples/founder and swap founder for engineer, designer, or sales.",
  },
  {
    href: "/api/v1/spec/json-schema",
    label: "JSON schema",
    note: "Structured input for agents that start from profile data.",
  },
  {
    href: "/api/v1/mcp",
    label: "MCP endpoint",
    note: "Remote JSON-RPC endpoint exposing tools, resources, and prompts.",
  },
  {
    href: "/llms.txt",
    label: "llms.txt",
    note: "Root manifest for AI-friendly discovery.",
  },
  {
    href: "/llms-full.txt",
    label: "llms-full.txt",
    note: "Single-file agent-oriented docs bundle.",
  },
];

export function getEndpointDoc(slug: string) {
  return DEVELOPER_ENDPOINT_DOCS.find((endpoint) => endpoint.slug === slug) ?? null;
}

export function buildCurlExample(endpoint: DeveloperEndpointDoc) {
  const path = endpoint.pathParams?.reduce((value, param) => value.replace(`{${param.key}}`, param.placeholder), endpoint.path) ?? endpoint.path;
  const lines = [
    `curl -X ${endpoint.method} http://localhost:3000${path} \\`,
  ];

  if (endpoint.auth === "bearer") {
    lines.push(`  -H "Authorization: Bearer $TINYCV_API_KEY" \\`);
  }

  if (endpoint.auth === "bootstrap-secret") {
    lines.push(`  -H "x-tinycv-bootstrap-secret: $TINYCV_PLATFORM_BOOTSTRAP_SECRET" \\`);
  }

  if (endpoint.idempotent) {
    lines.push(`  -H "Idempotency-Key: $(uuidgen)" \\`);
  }

  if (endpoint.method !== "GET") {
    lines.push(`  -H "Content-Type: application/json" \\`);
  }

  if (endpoint.exampleRequestBody && endpoint.method !== "GET") {
    lines.push(`  -d '${JSON.stringify(endpoint.exampleRequestBody, null, 2)}'`);
  } else {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, "");
  }

  return lines.join("\n");
}

export function buildNodeExample(endpoint: DeveloperEndpointDoc) {
  const path = endpoint.pathParams?.reduce((value, param) => value.replace(`{${param.key}}`, param.placeholder), endpoint.path) ?? endpoint.path;
  const headerLines = [
    endpoint.auth === "bearer" ? `Authorization: \`Bearer \${process.env.TINYCV_API_KEY}\`,` : null,
    endpoint.auth === "bootstrap-secret" ? `"x-tinycv-bootstrap-secret": process.env.TINYCV_PLATFORM_BOOTSTRAP_SECRET!,` : null,
    endpoint.idempotent ? `"Idempotency-Key": crypto.randomUUID(),` : null,
    endpoint.method !== "GET" ? `"Content-Type": "application/json",` : null,
  ].filter(Boolean);
  const bodyLine = endpoint.exampleRequestBody && endpoint.method !== "GET"
    ? `body: JSON.stringify(${JSON.stringify(endpoint.exampleRequestBody, null, 2)}),`
    : null;
  const importLine = endpoint.idempotent ? `import crypto from "node:crypto";\n\n` : "";

  return `${importLine}const response = await fetch("http://localhost:3000${path}", {
  method: "${endpoint.method}",
  headers: {
    ${headerLines.join("\n    ")}
  },
  ${bodyLine ?? ""}
});

const data = await response.json();
console.log(data);`;
}

export function buildPythonExample(endpoint: DeveloperEndpointDoc) {
  const path = endpoint.pathParams?.reduce((value, param) => value.replace(`{${param.key}}`, param.placeholder), endpoint.path) ?? endpoint.path;
  const importLines = [
    "import requests",
    endpoint.idempotent ? "import uuid" : null,
  ].filter(Boolean);
  const headerLines = [
    endpoint.auth === "bearer" ? `    "Authorization": f"Bearer {TINYCV_API_KEY}",` : null,
    endpoint.auth === "bootstrap-secret" ? `    "x-tinycv-bootstrap-secret": TINYCV_PLATFORM_BOOTSTRAP_SECRET,` : null,
    endpoint.idempotent ? `    "Idempotency-Key": str(uuid.uuid4()),` : null,
    endpoint.method !== "GET" ? `    "Content-Type": "application/json",` : null,
  ].filter(Boolean);
  const payloadBlock = endpoint.exampleRequestBody && endpoint.method !== "GET"
    ? `payload = ${JSON.stringify(endpoint.exampleRequestBody, null, 2)}\n\n`
    : "";
  const requestLine = endpoint.method === "GET"
    ? `response = requests.get(url, headers=headers)`
    : `response = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=payload)`;

  return `${importLines.join("\n")}

url = "http://localhost:3000${path}"
headers = {
${headerLines.join("\n")}
}

${payloadBlock}${requestLine}
print(response.json())`;
}

export function buildTypeScriptExample(endpoint: DeveloperEndpointDoc) {
  const path = endpoint.pathParams?.reduce((value, param) => value.replace(`{${param.key}}`, param.placeholder), endpoint.path) ?? endpoint.path;
  const headerLines = [
    endpoint.auth === "bearer" ? `Authorization: \`Bearer \${process.env.TINYCV_API_KEY}\`,` : null,
    endpoint.auth === "bootstrap-secret" ? `"x-tinycv-bootstrap-secret": process.env.TINYCV_PLATFORM_BOOTSTRAP_SECRET!,` : null,
    endpoint.idempotent ? `"Idempotency-Key": crypto.randomUUID(),` : null,
    endpoint.method !== "GET" ? `"Content-Type": "application/json",` : null,
  ].filter(Boolean);

  const bodyLine = endpoint.exampleRequestBody && endpoint.method !== "GET"
    ? `body: JSON.stringify(${JSON.stringify(endpoint.exampleRequestBody, null, 2)}),`
    : null;

  return `const response = await fetch("http://localhost:3000${path}", {
  method: "${endpoint.method}",
  headers: {
    ${headerLines.join("\n    ")}
  },
  ${bodyLine ?? ""}
});

const data = await response.json();
console.log(data);`;
}

export function buildLlmsManifest(origin: string) {
  const lines = [
    "# Tiny CV",
    "",
    "> Agent-friendly docs for the Tiny CV developer platform.",
    "",
    "## Core Docs",
    "",
    `- [Documentation](${origin}/documentation): human-first overview with live playground.`,
    `- [Agent guide](${origin}/agents): instructions for agents that interview a user, choose a template, draft markdown, validate, publish, export, and hand off editing.`,
    `- [Machine-payment OpenAPI 3.1](${origin}/openapi.json): root discovery document for paid x402/MPP routes.`,
    `- [Full OpenAPI 3.1](${origin}/api/v1/openapi.json): complete developer API schema for bearer-token integrations.`,
    `- [Markdown guide](${origin}/api/v1/spec/markdown): canonical Tiny CV markdown format.`,
    `- [JSON schema](${origin}/api/v1/spec/json-schema): structured resume input.`,
    `- [MCP endpoint](${origin}/api/v1/mcp): remote MCP JSON-RPC endpoint.`,
    "",
    "## Agent Resources",
    "",
    `- [Agent guide](${origin}/agents): canonical resume-writing workflow and human edit handoff for agents.`,
    `- [llms-full.txt](${origin}/llms-full.txt): single-file Tiny CV docs bundle.`,
    `- [Templates](${origin}/api/v1/templates): list built-in templates.`,
    `- [Validate](${origin}/api/v1/resumes/validate): use quality_gate="publish" before publishing or paid Agent Finish.`,
    `- [Template examples](${origin}/examples/founder): canonical full-resume examples. Swap founder for engineer, designer, or sales.`,
    `- [Agent Finish](${origin}/api/v1/paid/agent-finish): no-account x402 or MPP endpoint for a standard hosted resume, claim link, queued PDF job, and receipt.`,
    `- [Paid create + publish](${origin}/api/v1/paid/resumes): lower-level no-account x402 or MPP endpoint for creating a standard public resume.`,
    `- [Paid PDF jobs](${origin}/api/v1/paid/resumes/{resume_id}/pdf-jobs): lower-level no-account x402 or MPP endpoint for PDF generation.`,
    `- [MCP tools + resources](${origin}/api/v1/mcp): tools, prompts, and resources for agents.`,
  ];

  return lines.join("\n");
}
