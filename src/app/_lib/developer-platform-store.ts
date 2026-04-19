import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import postgres from "postgres";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import {
  buildPdfDownloadToken,
  buildProjectWebhookSecret,
  createOneTimeClaimToken,
  createProjectApiKey,
  safeEquals,
  sha256,
} from "@/app/_lib/developer-platform-auth";
import {
  compileResumeInput,
  createTitleFromMarkdown,
} from "@/app/_lib/developer-resume-input";
import { createLegacyEditorToken, hashToken } from "@/app/_lib/editor-links";
import {
  createFriendlyResumeSlug,
  createFriendlyResumeSlugFallback,
} from "@/app/_lib/resume-slugs";
import type {
  ApiResumeRecord,
  CreatePdfJobRequest,
  CreateResumeRequest,
  PdfJobResponse,
  PdfJobStatus,
  ProjectApiKeyRecord,
  ProjectBootstrapResponse,
  ProjectSummary,
  PublishResumeRequest,
  UpdateResumeRequest,
  ValidationError,
  ValidationWarning,
  WebhookEventEnvelope,
} from "@/app/_lib/developer-platform-types";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";
import {
  buildPublishedResumePrintUrl,
  generateResumePdf,
  getPdfRenderOrigin,
} from "@/app/_lib/resume-pdf";
import {
  recordUsageEvent,
} from "@/app/_lib/usage-events";

type SqlClient = postgres.Sql | postgres.TransactionSql;

type AuthenticatedProject = {
  apiKey: ProjectApiKeyRecord;
  project: ProjectSummary;
};

type IdempotencyReservation =
  | {
      responseBody: unknown;
      status: "replay";
      statusCode: number;
    }
  | {
      recordId: string;
      status: "acquired";
    };

type ClaimConsumptionResult = {
  cleanEditorPath: string;
  resumeId: string;
  workspaceId: string;
};

type EditClaimResult = {
  claimPath: string;
  expiresAt: string;
};

type ProjectResumeRecord = {
  record: ApiResumeRecord;
};

type ProjectResumeRow = {
  client_reference_id: string | null;
  created_at: Date | string;
  created_via: string;
  external_resume_id: string | null;
  fit_scale: number;
  id: string;
  is_published: boolean;
  last_compiler_input_format: "json" | "markdown" | null;
  markdown: string;
  pdf_completed_at: Date | string | null;
  pdf_expires_at: Date | string | null;
  pdf_job_id: string | null;
  project_id: string;
  published_at: Date | string | null;
  published_fit_scale: number | null;
  published_markdown: string | null;
  slug: string;
  template_key: TemplateKey;
  title: string;
  title_is_custom: boolean;
  updated_at: Date | string;
};

type ProjectApiKeyRow = {
  created_at: Date | string;
  id: string;
  key_hash: string;
  key_prefix: string;
  label: string;
  last_used_at: Date | string | null;
  project_id: string;
  revoked_at: Date | string | null;
};

type ProjectMembershipRow = {
  client_reference_id: string | null;
  created_at: Date | string;
  external_resume_id: string | null;
  project_id: string;
  resume_id: string;
  updated_at: Date | string;
};

type PdfJobRow = {
  completed_at: Date | string | null;
  content_type: string | null;
  error_code: string | null;
  error_message: string | null;
  expires_at: Date | string | null;
  file_name: string | null;
  id: string;
  idempotency_key: string | null;
  pdf_blob: Uint8Array | null;
  pdf_storage_key: string | null;
  project_id: string;
  requested_at: Date | string;
  requested_page_size: string | null;
  resume_id: string;
  started_at: Date | string | null;
  status: PdfJobStatus;
  updated_at: Date | string;
};

type EditClaimRow = {
  consumed_at: Date | string | null;
  created_at: Date | string;
  expires_at: Date | string;
  id: string;
  project_id: string | null;
  resume_id: string;
  token_hash: string;
};

type WebhookDeliveryRow = {
  attempt_count: number;
  created_at: Date | string;
  delivered_at: Date | string | null;
  endpoint_url: string;
  event_id: string;
  event_type: WebhookEventEnvelope["type"];
  id: string;
  last_error: string | null;
  next_attempt_at: Date | string | null;
  payload: WebhookEventEnvelope | null;
  project_id: string;
  signature: string | null;
  status_code: number | null;
  updated_at: Date | string;
  webhook_endpoint_id: string;
};

type IdempotencyRow = {
  completed_at: Date | string | null;
  id: string;
  idempotency_key: string;
  operation: string;
  project_id: string;
  request_hash: string;
  response_body: unknown;
  status_code: number | null;
};

type BootstrapProjectInput = {
  apiKeyLabel?: string;
  name: string;
  slug?: string;
};

type DispatchWebhookOptions = {
  data: Record<string, unknown>;
  projectId: string;
  type: WebhookEventEnvelope["type"];
};

export class DeveloperPlatformUnavailableError extends Error {
  constructor(message = "Tiny CV developer platform is not configured.") {
    super(message);
    this.name = "DeveloperPlatformUnavailableError";
  }
}

export class DeveloperPlatformAuthError extends Error {
  code = "unauthorized";

  constructor(message = "Invalid or missing project API key.") {
    super(message);
    this.name = "DeveloperPlatformAuthError";
  }
}

export class DeveloperPlatformConflictError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "DeveloperPlatformConflictError";
    this.code = code;
    this.details = details;
  }
}

export class DeveloperPlatformNotFoundError extends Error {
  code = "not_found";

  constructor(message = "Requested resource was not found.") {
    super(message);
    this.name = "DeveloperPlatformNotFoundError";
  }
}

export class DeveloperPlatformStateError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DeveloperPlatformStateError";
    this.code = code;
  }
}

export class DeveloperPlatformValidationError extends Error {
  code = "invalid_input";
  errors: ValidationError[];
  warnings: ValidationWarning[];

  constructor(message: string, options: {
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
  } = {}) {
    super(message);
    this.name = "DeveloperPlatformValidationError";
    this.errors = options.errors ?? [];
    this.warnings = options.warnings ?? [];
  }
}

let postgresClient: postgres.Sql | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export async function bootstrapDeveloperProject(input: BootstrapProjectInput) {
  const sql = getPostgresClient();
  await ensureSchema(sql);

  const name = input.name.trim();

  if (!name) {
    throw new DeveloperPlatformValidationError("Project name is required.", {
      errors: [{
        code: "invalid_input",
        message: "Project name is required.",
        path: "name",
      }],
    });
  }

  const slug = await createUniqueProjectSlug(sql, input.slug?.trim() || name);
  const now = new Date();
  const projectId = randomUUID();
  const apiKeyId = randomUUID();
  const apiKey = createProjectApiKey();

  await sql.begin(async (tx) => {
    await tx`
      insert into projects (
        id,
        name,
        slug,
        created_at,
        updated_at
      ) values (
        ${projectId},
        ${name},
        ${slug},
        ${now},
        ${now}
      )
    `;

    await tx`
      insert into project_api_keys (
        id,
        project_id,
        label,
        key_prefix,
        key_hash,
        last_used_at,
        revoked_at,
        created_at
      ) values (
        ${apiKeyId},
        ${projectId},
        ${input.apiKeyLabel?.trim() || "Default API Key"},
        ${apiKey.keyPrefix},
        ${apiKey.keyHash},
        ${null},
        ${null},
        ${now}
      )
    `;
  });

  return {
    apiKey: {
      key: apiKey.key,
      keyPrefix: apiKey.keyPrefix,
      label: input.apiKeyLabel?.trim() || "Default API Key",
    },
    project: {
      createdAt: now.toISOString(),
      id: projectId,
      name,
      slug,
      updatedAt: now.toISOString(),
    },
    webhookSecret: buildProjectWebhookSecret(projectId),
  } satisfies ProjectBootstrapResponse;
}

export async function authenticateDeveloperProject(apiKey: string) {
  const sql = getPostgresClient();
  await ensureSchema(sql);

  const tokenHash = sha256(apiKey);
  const [row] = await sql<(ProjectApiKeyRow & { project_name: string; project_slug: string; project_created_at: Date | string; project_updated_at: Date | string })[]>`
    select
      k.*,
      p.name as project_name,
      p.slug as project_slug,
      p.created_at as project_created_at,
      p.updated_at as project_updated_at
    from project_api_keys k
    join projects p on p.id = k.project_id
    where k.key_hash = ${tokenHash}
      and k.revoked_at is null
    limit 1
  `;

  if (!row) {
    return null;
  }

  const now = new Date();
  await sql`
    update project_api_keys
    set last_used_at = ${now}
    where id = ${row.id}
  `;

  return {
    apiKey: toProjectApiKeyRecord({
      ...row,
      last_used_at: now,
    }),
    project: {
      createdAt: formatTimestamp(row.project_created_at),
      id: row.project_id,
      name: row.project_name,
      slug: row.project_slug,
      updatedAt: formatTimestamp(row.project_updated_at),
    },
  } satisfies AuthenticatedProject;
}

export async function reserveIdempotentProjectRequest(input: {
  idempotencyKey: string;
  operation: string;
  projectId: string;
  requestHash: string;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const now = new Date();
  const recordId = randomUUID();

  const inserted = await sql<Pick<IdempotencyRow, "id">[]>`
    insert into api_idempotency_keys (
      id,
      project_id,
      operation,
      idempotency_key,
      request_hash,
      response_body,
      status_code,
      completed_at,
      created_at,
      updated_at
    ) values (
      ${recordId},
      ${input.projectId},
      ${input.operation},
      ${input.idempotencyKey},
      ${input.requestHash},
      ${null},
      ${null},
      ${null},
      ${now},
      ${now}
    )
    on conflict (project_id, operation, idempotency_key)
    do nothing
    returning id
  `;

  if (inserted[0]?.id) {
    return {
      recordId,
      status: "acquired",
    } satisfies IdempotencyReservation;
  }

  const [existing] = await sql<IdempotencyRow[]>`
    select *
    from api_idempotency_keys
    where project_id = ${input.projectId}
      and operation = ${input.operation}
      and idempotency_key = ${input.idempotencyKey}
    limit 1
  `;

  if (!existing) {
    throw new DeveloperPlatformConflictError(
      "idempotency_conflict",
      "The idempotency key could not be reserved.",
    );
  }

  if (!safeEquals(existing.request_hash, input.requestHash)) {
    throw new DeveloperPlatformConflictError(
      "idempotency_conflict",
      "This idempotency key has already been used with a different request payload.",
    );
  }

  if (existing.response_body !== null && existing.status_code !== null) {
    return {
      responseBody: existing.response_body,
      status: "replay",
      statusCode: existing.status_code,
    } satisfies IdempotencyReservation;
  }

  throw new DeveloperPlatformConflictError(
    "idempotency_conflict",
    "A request with this idempotency key is already in progress.",
  );
}

export async function fulfillIdempotentProjectRequest(input: {
  idempotencyKey: string;
  operation: string;
  projectId: string;
  responseBody: unknown;
  statusCode: number;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const now = new Date();

  await sql`
    update api_idempotency_keys
    set
      response_body = ${sql.json(input.responseBody as postgres.JSONValue)},
      status_code = ${input.statusCode},
      completed_at = ${now},
      updated_at = ${now}
    where project_id = ${input.projectId}
      and operation = ${input.operation}
      and idempotency_key = ${input.idempotencyKey}
      and completed_at is null
  `;
}

export async function createProjectResumeDraft(input: {
  body: CreateResumeRequest;
  projectId: string;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const compiled = compileResumeInput(input.body);

  if (!compiled.valid) {
    throw new DeveloperPlatformValidationError("Resume payload did not pass validation.", {
      errors: compiled.errors,
      warnings: compiled.warnings,
    });
  }

  const titleInfo = createTitleFromMarkdown(compiled.markdown, input.body.title);
  const now = new Date();
  const resumeId = randomUUID();
  const slug = await createUniqueResumeSlug(sql);
  const templateKey = compiled.inferredTemplateKey ?? input.body.template_key ?? "engineer";

  await sql.begin(async (tx) => {
    if (input.body.webhook_url) {
      await upsertWebhookEndpoint(tx, input.projectId, input.body.webhook_url);
    }

    if (input.body.external_resume_id) {
      const [existing] = await tx<ProjectMembershipRow[]>`
        select *
        from project_resume_memberships
        where project_id = ${input.projectId}
          and external_resume_id = ${input.body.external_resume_id}
        limit 1
      `;

      if (existing) {
        throw new DeveloperPlatformConflictError(
          "conflict",
          "A resume with this external_resume_id already exists in this project.",
          { external_resume_id: input.body.external_resume_id },
        );
      }
    }

    await tx`
      insert into resumes (
        id,
        slug,
        title,
        title_is_custom,
        markdown,
        fit_scale,
        published_markdown,
        published_fit_scale,
        is_published,
        editor_token_hash,
        template_key,
        created_via,
        last_compiler_input_format,
        source_project_id,
        public_metadata,
        created_at,
        updated_at,
        published_at
      ) values (
        ${resumeId},
        ${slug},
        ${titleInfo.title},
        ${titleInfo.titleIsCustom},
        ${compiled.markdown},
        ${compiled.fitScale},
        ${null},
        ${null},
        false,
        ${hashToken(createLegacyEditorToken())},
        ${templateKey},
        ${"api"},
        ${compiled.inputFormat},
        ${input.projectId},
        ${sql.json({ warnings: compiled.warnings })},
        ${now},
        ${now},
        ${null}
      )
    `;

    await tx`
      insert into project_resume_memberships (
        project_id,
        resume_id,
        attached_via,
        external_resume_id,
        client_reference_id,
        created_at,
        updated_at
      ) values (
        ${input.projectId},
        ${resumeId},
        ${"api_create"},
        ${input.body.external_resume_id ?? null},
        ${input.body.client_reference_id ?? null},
        ${now},
        ${now}
      )
    `;
  });

  const payload = await getProjectResume({ projectId: input.projectId, resumeId });

  if (!payload) {
    throw new DeveloperPlatformNotFoundError("Created resume could not be loaded.");
  }

  if (input.body.return_edit_claim_url) {
    payload.record.editor_claim_url = (await createEditClaim({
      projectId: input.projectId,
      resumeId,
    })).claimPath;
  }

  await dispatchWebhookEvent({
    data: {
      resume_id: payload.record.resume_id,
      status: payload.record.status,
      template_key: payload.record.template_key,
      title: payload.record.title,
    },
    projectId: input.projectId,
    type: "resume.created",
  });
  await recordUsageEvent({
    action: "api.resume_created",
    metadata: {
      input_format: payload.record.input_format,
      resume_id: payload.record.resume_id,
      template_key: payload.record.template_key,
    },
    projectId: input.projectId,
  });

  return payload;
}

export async function getProjectResume(input: {
  projectId: string;
  resumeId: string;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);

  const [row] = await sql<ProjectResumeRow[]>`
    select
      r.id,
      r.title,
      r.title_is_custom,
      r.slug,
      r.markdown,
      r.fit_scale,
      r.published_markdown,
      r.published_fit_scale,
      r.is_published,
      r.template_key,
      r.created_at,
      r.updated_at,
      r.published_at,
      r.created_via,
      r.last_compiler_input_format,
      m.project_id,
      m.external_resume_id,
      m.client_reference_id,
      j.id as pdf_job_id,
      j.completed_at as pdf_completed_at,
      j.expires_at as pdf_expires_at
    from project_resume_memberships m
    join resumes r on r.id = m.resume_id
    left join lateral (
      select id, completed_at, expires_at
      from pdf_jobs
      where project_id = ${input.projectId}
        and resume_id = r.id
        and status = 'completed'
      order by completed_at desc
      limit 1
    ) j on true
    where m.project_id = ${input.projectId}
      and r.id = ${input.resumeId}
    limit 1
  `;

  if (!row) {
    return null;
  }

  return {
    record: toApiResumeRecord(row),
  } satisfies ProjectResumeRecord;
}

export async function updateProjectResumeDraft(input: {
  body: UpdateResumeRequest;
  projectId: string;
  resumeId: string;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const existing = await getProjectResumeRow(sql, input.projectId, input.resumeId);

  if (!existing) {
    return null;
  }

  const compiled = compileResumeInput(input.body);

  if (!compiled.valid) {
    throw new DeveloperPlatformValidationError("Resume payload did not pass validation.", {
      errors: compiled.errors,
      warnings: compiled.warnings,
    });
  }

  const titleInfo = input.body.title
    ? createTitleFromMarkdown(compiled.markdown, input.body.title)
    : existing.title_is_custom
      ? { title: existing.title, titleIsCustom: true }
      : createTitleFromMarkdown(compiled.markdown);
  const now = new Date();
  const templateKey = compiled.inferredTemplateKey ?? input.body.template_key ?? existing.template_key;

  await sql.begin(async (tx) => {
    if (input.body.webhook_url) {
      await upsertWebhookEndpoint(tx, input.projectId, input.body.webhook_url);
    }

    await tx`
      update resumes
      set
        title = ${titleInfo.title},
        title_is_custom = ${titleInfo.titleIsCustom},
        markdown = ${compiled.markdown},
        fit_scale = ${compiled.fitScale},
        template_key = ${templateKey},
        last_compiler_input_format = ${compiled.inputFormat},
        public_metadata = ${sql.json({ warnings: compiled.warnings })},
        updated_at = ${now}
      where id = ${input.resumeId}
    `;

    await tx`
      update project_resume_memberships
      set
        client_reference_id = ${input.body.client_reference_id ?? existing.client_reference_id},
        external_resume_id = ${input.body.external_resume_id ?? existing.external_resume_id},
        updated_at = ${now}
      where project_id = ${input.projectId}
        and resume_id = ${input.resumeId}
    `;
  });

  const payload = await getProjectResume({
    projectId: input.projectId,
    resumeId: input.resumeId,
  });

  if (!payload) {
    return null;
  }

  await dispatchWebhookEvent({
    data: {
      resume_id: payload.record.resume_id,
      status: payload.record.status,
      template_key: payload.record.template_key,
      title: payload.record.title,
    },
    projectId: input.projectId,
    type: "resume.updated",
  });
  await recordUsageEvent({
    action: "api.resume_updated",
    metadata: {
      input_format: payload.record.input_format,
      resume_id: payload.record.resume_id,
      template_key: payload.record.template_key,
    },
    projectId: input.projectId,
  });

  return payload;
}

export async function publishProjectResume(input: {
  body: PublishResumeRequest;
  projectId: string;
  resumeId: string;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const existing = await getProjectResumeRow(sql, input.projectId, input.resumeId);

  if (!existing) {
    return null;
  }

  const now = new Date();
  await sql.begin(async (tx) => {
    if (input.body.webhook_url) {
      await upsertWebhookEndpoint(tx, input.projectId, input.body.webhook_url);
    }

    await tx`
      update resumes
      set
        published_markdown = ${existing.markdown},
        published_fit_scale = ${existing.fit_scale},
        is_published = true,
        published_at = ${now},
        updated_at = ${now}
      where id = ${input.resumeId}
    `;
  });

  const payload = await getProjectResume({
    projectId: input.projectId,
    resumeId: input.resumeId,
  });

  if (!payload) {
    return null;
  }

  if (input.body.return_edit_claim_url) {
    payload.record.editor_claim_url = (await createEditClaim({
      projectId: input.projectId,
      resumeId: input.resumeId,
    })).claimPath;
  }

  await dispatchWebhookEvent({
    data: {
      public_url: payload.record.public_url,
      published_at: payload.record.published_at,
      resume_id: payload.record.resume_id,
      title: payload.record.title,
    },
    projectId: input.projectId,
    type: "resume.published",
  });
  await recordUsageEvent({
    action: "api.resume_published",
    metadata: {
      public_url: payload.record.public_url,
      resume_id: payload.record.resume_id,
      template_key: payload.record.template_key,
    },
    projectId: input.projectId,
  });

  return payload;
}

export async function createProjectPdfJob(input: {
  body: CreatePdfJobRequest;
  idempotencyKey?: string | null;
  projectId: string;
  resumeId: string;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const existing = await getProjectResumeRow(sql, input.projectId, input.resumeId);

  if (!existing) {
    return null;
  }

  if (!existing.is_published || !existing.published_markdown) {
    throw new DeveloperPlatformStateError(
      "not_published",
      "Only published resumes can generate PDFs.",
    );
  }

  const now = new Date();
  const jobId = randomUUID();
  const requestedPageSize = parseCvMarkdown(existing.published_markdown).style.pageSize;

  await sql.begin(async (tx) => {
    if (input.body.webhook_url) {
      await upsertWebhookEndpoint(tx, input.projectId, input.body.webhook_url);
    }

    await tx`
      insert into pdf_jobs (
        id,
        project_id,
        resume_id,
        status,
        error_code,
        error_message,
        pdf_storage_key,
        pdf_blob,
        content_type,
        file_name,
        requested_page_size,
        requested_at,
        started_at,
        completed_at,
        expires_at,
        idempotency_key,
        updated_at
      ) values (
        ${jobId},
        ${input.projectId},
        ${input.resumeId},
        ${"queued"},
        ${null},
        ${null},
        ${null},
        ${null},
        ${null},
        ${null},
        ${requestedPageSize},
        ${now},
        ${null},
        ${null},
        ${null},
        ${input.idempotencyKey ?? null},
        ${now}
      )
    `;

  });

  await recordUsageEvent({
    action: "api.pdf_job_requested",
    idempotencyKey: input.idempotencyKey ?? null,
    metadata: {
      job_id: jobId,
      requested_page_size: requestedPageSize,
      resume_id: input.resumeId,
    },
    projectId: input.projectId,
  });

  return {
    completed_at: null,
    error_code: null,
    error_message: null,
    job_id: jobId,
    pdf_url: null,
    requested_at: now.toISOString(),
    resume_id: input.resumeId,
    status: "queued",
  } satisfies PdfJobResponse;
}

export async function getProjectPdfJob(input: {
  jobId: string;
  projectId: string;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  let row = await getProjectPdfJobRow(sql, input.projectId, input.jobId);

  if (!row) {
    return null;
  }

  if (row.status === "queued" || row.status === "processing") {
    row = await processPdfJob(row);
  }

  return toPdfJobResponse(row);
}

export async function processDeveloperPlatformBackgroundWork(input: {
  pdfJobLimit?: number;
  webhookLimit?: number;
} = {}) {
  const pdfJobs = [];
  const pdfJobLimit = input.pdfJobLimit ?? 1;

  for (let index = 0; index < pdfJobLimit; index += 1) {
    const job = await processNextQueuedPdfJob();

    if (!job) {
      break;
    }

    pdfJobs.push(job);
  }

  const webhooks = await processDueWebhookDeliveries({
    limit: input.webhookLimit ?? 10,
  });

  return {
    pdfJobs,
    webhooks,
  };
}

export async function getProjectPdfArtifact(input: {
  expiresAt: string;
  jobId: string;
  token: string;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const [row] = await sql<PdfJobRow[]>`
    select *
    from pdf_jobs
    where id = ${input.jobId}
      and status = 'completed'
    limit 1
  `;

  if (!row || !row.pdf_blob || !row.content_type || !row.file_name) {
    return null;
  }

  const rowExpiresAt = formatTimestamp(row.expires_at);

  if (!rowExpiresAt || !safeEquals(rowExpiresAt, input.expiresAt)) {
    return null;
  }

  const expectedToken = buildPdfDownloadToken(input.jobId, input.expiresAt);

  if (!safeEquals(expectedToken, input.token)) {
    return null;
  }

  return {
    content: row.pdf_blob,
    contentType: row.content_type,
    fileName: row.file_name,
  };
}

export async function consumeProjectEditClaim(input: {
  claimId: string;
  token: string;
  workspaceId?: string | null;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const now = new Date();

  return sql.begin(async (tx) => {
    const [claim] = await tx<EditClaimRow[]>`
      select *
      from resume_edit_claims
      where id = ${input.claimId}
      limit 1
      for update
    `;

    if (!claim) {
      return null;
    }

    if (!safeEquals(claim.token_hash, sha256(input.token))) {
      return null;
    }

    if (claim.consumed_at) {
      throw new DeveloperPlatformConflictError(
        "forbidden",
        "This edit claim has already been consumed.",
      );
    }

    const expiresAt = new Date(claim.expires_at);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      throw new DeveloperPlatformConflictError(
        "forbidden",
        "This edit claim has expired.",
      );
    }

    const workspaceId = input.workspaceId?.trim() || randomUUID();
    await ensureWorkspaceRow(tx, workspaceId, now);
    await upsertWorkspaceMembership(tx, {
      attachedVia: "api_claim",
      resumeId: claim.resume_id,
      timestamp: now,
      workspaceId,
    });
    await setWorkspaceCurrentResume(tx, workspaceId, claim.resume_id, now);

    const consumed = await tx<Pick<EditClaimRow, "id">[]>`
      update resume_edit_claims
      set consumed_at = ${now}
      where id = ${claim.id}
        and consumed_at is null
      returning id
    `;

    if (!consumed[0]) {
      throw new DeveloperPlatformConflictError(
        "forbidden",
        "This edit claim has already been consumed.",
      );
    }

    return {
      cleanEditorPath: `/studio/${claim.resume_id}`,
      resumeId: claim.resume_id,
      workspaceId,
    } satisfies ClaimConsumptionResult;
  });
}

async function createEditClaim(input: {
  projectId: string;
  resumeId: string;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  const claimId = randomUUID();
  const token = createOneTimeClaimToken();

  await sql`
    insert into resume_edit_claims (
      id,
      resume_id,
      project_id,
      token_hash,
      expires_at,
      consumed_at,
      created_at
    ) values (
      ${claimId},
      ${input.resumeId},
      ${input.projectId},
      ${token.tokenHash},
      ${expiresAt},
      ${null},
      ${now}
    )
  `;

  return {
    claimPath: `/claim/${claimId}?token=${encodeURIComponent(token.token)}`,
    expiresAt: expiresAt.toISOString(),
  } satisfies EditClaimResult;
}

async function processNextQueuedPdfJob() {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const staleBefore = new Date(Date.now() - 1000 * 60 * 10);
  const now = new Date();
  const [row] = await sql<PdfJobRow[]>`
    with next_job as (
      select id
      from pdf_jobs
      where status = 'queued'
        or (
          status = 'processing'
          and started_at is not null
          and started_at < ${staleBefore}
        )
      order by requested_at asc
      limit 1
      for update skip locked
    )
    update pdf_jobs
    set
      status = ${"processing"},
      started_at = ${now},
      updated_at = ${now}
    from next_job
    where pdf_jobs.id = next_job.id
    returning pdf_jobs.*
  `;

  return row ? toPdfJobResponse(await renderClaimedPdfJob(row)) : null;
}

async function processPdfJob(row: PdfJobRow) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const staleBefore = new Date(Date.now() - 1000 * 60 * 10);
  const now = new Date();
  const [claimed] = await sql<PdfJobRow[]>`
    update pdf_jobs
    set
      status = ${"processing"},
      started_at = coalesce(started_at, ${now}),
      updated_at = ${now}
    where id = ${row.id}
      and (
        status = 'queued'
        or (
          status = 'processing'
          and started_at is not null
          and started_at < ${staleBefore}
        )
      )
    returning *
  `;

  if (!claimed) {
    const [latestRow] = await sql<PdfJobRow[]>`
      select *
      from pdf_jobs
      where id = ${row.id}
      limit 1
    `;
    return latestRow ?? row;
  }

  return renderClaimedPdfJob(claimed);
}

async function renderClaimedPdfJob(row: PdfJobRow) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const resume = await getProjectResumeRow(sql, row.project_id, row.resume_id);

  if (!resume || !resume.is_published || !resume.published_markdown) {
    const failedAt = new Date();
    await sql`
      update pdf_jobs
      set
        status = ${"failed"},
        error_code = ${"not_published"},
        error_message = ${"Only published resumes can generate PDFs."},
        updated_at = ${failedAt}
      where id = ${row.id}
    `;

    const [failedRow] = await sql<PdfJobRow[]>`
      select *
      from pdf_jobs
      where id = ${row.id}
      limit 1
    `;

    if (failedRow) {
      await dispatchWebhookEvent({
        data: {
          error_code: failedRow.error_code,
          error_message: failedRow.error_message,
          job_id: failedRow.id,
          resume_id: failedRow.resume_id,
        },
        projectId: row.project_id,
        type: "resume.pdf.failed",
      });
      await recordUsageEvent({
        action: "api.pdf_job_failed",
        metadata: {
          error_code: failedRow.error_code,
          job_id: failedRow.id,
          resume_id: failedRow.resume_id,
        },
        projectId: row.project_id,
      });
    }

    return failedRow ?? row;
  }

  try {
    const pdf = await generateResumePdf({
      markdown: resume.published_markdown,
      publicUrl: buildPublishedResumePrintUrl(getPdfRenderOrigin(), resume.slug),
    });
    const completedAt = new Date();
    const expiresAt = new Date(completedAt.getTime() + 1000 * 60 * 60 * 24);
    await sql`
      update pdf_jobs
      set
        status = ${"completed"},
        pdf_blob = ${pdf.data},
        content_type = ${pdf.contentType},
        file_name = ${pdf.fileName},
        error_code = ${null},
        error_message = ${null},
        completed_at = ${completedAt},
        expires_at = ${expiresAt},
        updated_at = ${completedAt}
      where id = ${row.id}
    `;

    const [completedRow] = await sql<PdfJobRow[]>`
      select *
      from pdf_jobs
      where id = ${row.id}
      limit 1
    `;

    if (completedRow) {
      await dispatchWebhookEvent({
        data: {
          job_id: completedRow.id,
          pdf_url: buildPdfDownloadPath(completedRow),
          resume_id: completedRow.resume_id,
          status: completedRow.status,
        },
        projectId: row.project_id,
        type: "resume.pdf.ready",
      });
      await recordUsageEvent({
        action: "api.pdf_job_completed",
        metadata: {
          job_id: completedRow.id,
          resume_id: completedRow.resume_id,
        },
        projectId: row.project_id,
      });
    }

    return completedRow ?? row;
  } catch (error) {
    const failedAt = new Date();
    const message = error instanceof Error ? error.message : "PDF generation failed.";
    await sql`
      update pdf_jobs
      set
        status = ${"failed"},
        error_code = ${"pdf_generation_failed"},
        error_message = ${message},
        updated_at = ${failedAt}
      where id = ${row.id}
    `;

    const [failedRow] = await sql<PdfJobRow[]>`
      select *
      from pdf_jobs
      where id = ${row.id}
      limit 1
    `;

    if (failedRow) {
      await dispatchWebhookEvent({
        data: {
          error_code: failedRow.error_code,
          error_message: failedRow.error_message,
          job_id: failedRow.id,
          resume_id: failedRow.resume_id,
        },
        projectId: row.project_id,
        type: "resume.pdf.failed",
      });
      await recordUsageEvent({
        action: "api.pdf_job_failed",
        metadata: {
          error_code: failedRow.error_code,
          job_id: failedRow.id,
          resume_id: failedRow.resume_id,
        },
        projectId: row.project_id,
      });
    }

    return failedRow ?? row;
  }
}

async function dispatchWebhookEvent(input: DispatchWebhookOptions) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const event: WebhookEventEnvelope = {
    created_at: new Date().toISOString(),
    data: input.data,
    id: randomUUID(),
    project_id: input.projectId,
    type: input.type,
  };
  const payload = JSON.stringify(event);
  const signature = buildWebhookSignature(input.projectId, payload);
  const now = new Date();

  await sql`
    insert into webhook_deliveries (
      id,
      webhook_endpoint_id,
      event_type,
      event_id,
      payload,
      signature,
      status_code,
      attempt_count,
      last_error,
      next_attempt_at,
      delivered_at,
      created_at,
      updated_at
    )
    select
      ${event.id} || '-' || endpoint.id,
      endpoint.id,
      ${event.type},
      ${event.id},
      ${sql.json(event as postgres.JSONValue)},
      ${signature},
      ${null},
      ${0},
      ${null},
      ${now},
      ${null},
      ${now},
      ${now}
    from webhook_endpoints endpoint
    where endpoint.project_id = ${input.projectId}
      and endpoint.active = true
  `;
}

export function getWebhookRetryDelaySeconds(attemptCount: number) {
  const normalizedAttempt = Math.max(1, Math.floor(attemptCount));
  return Math.min(60 * 60 * 6, 60 * 5 * 2 ** (normalizedAttempt - 1));
}

async function processDueWebhookDeliveries(input: {
  limit: number;
}) {
  const sql = getPostgresClient();
  await ensureSchema(sql);
  const now = new Date();
  const deliveries = await sql<WebhookDeliveryRow[]>`
    with due as (
      select d.id
      from webhook_deliveries d
      join webhook_endpoints e on e.id = d.webhook_endpoint_id
      where d.delivered_at is null
        and e.active = true
        and d.payload is not null
        and d.signature is not null
        and d.attempt_count < 8
        and (
          d.next_attempt_at is null
          or d.next_attempt_at <= ${now}
        )
      order by d.created_at asc
      limit ${input.limit}
      for update skip locked
    )
    update webhook_deliveries d
    set
      next_attempt_at = ${new Date(now.getTime() + 1000 * 60 * 10)},
      updated_at = ${now}
    from due, webhook_endpoints e
    where d.id = due.id
      and e.id = d.webhook_endpoint_id
    returning
      d.id,
      d.webhook_endpoint_id,
      d.event_type,
      d.event_id,
      d.payload,
      d.signature,
      d.status_code,
      d.attempt_count,
      d.last_error,
      d.next_attempt_at,
      d.delivered_at,
      d.created_at,
      d.updated_at,
      e.url as endpoint_url,
      e.project_id as project_id
  `;

  const processed = [];

  for (const delivery of deliveries) {
    processed.push(await deliverWebhook(delivery));
  }

  return processed;
}

async function deliverWebhook(delivery: WebhookDeliveryRow) {
  const sql = getPostgresClient();
  const now = new Date();
  const payload = JSON.stringify(delivery.payload);

  try {
    const response = await fetch(delivery.endpoint_url, {
      body: payload,
      headers: {
        "Content-Type": "application/json",
        "X-TinyCV-Signature": delivery.signature ?? "",
      },
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });

    await sql`
      update webhook_deliveries
      set
        status_code = ${response.status},
        attempt_count = attempt_count + 1,
        delivered_at = ${response.ok ? now : null},
        last_error = ${response.ok ? null : `HTTP ${response.status}`},
        next_attempt_at = ${response.ok ? null : new Date(now.getTime() + getWebhookRetryDelaySeconds(delivery.attempt_count + 1) * 1000)},
        updated_at = ${now}
      where id = ${delivery.id}
    `;

    return {
      delivered: response.ok,
      deliveryId: delivery.id,
      statusCode: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook delivery failed.";

    await sql`
      update webhook_deliveries
      set
        attempt_count = attempt_count + 1,
        last_error = ${message},
        next_attempt_at = ${new Date(now.getTime() + getWebhookRetryDelaySeconds(delivery.attempt_count + 1) * 1000)},
        updated_at = ${now}
      where id = ${delivery.id}
    `;

    return {
      delivered: false,
      deliveryId: delivery.id,
      error: message,
    };
  }
}

function buildWebhookSignature(projectId: string, payload: string) {
  const secret = buildProjectWebhookSecret(projectId);
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

async function upsertWebhookEndpoint(sql: SqlClient, projectId: string, url: string) {
  const now = new Date();
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    return;
  }

  await sql`
    insert into webhook_endpoints (
      id,
      project_id,
      url,
      description,
      secret_hash,
      active,
      created_at,
      updated_at
    ) values (
      ${randomUUID()},
      ${projectId},
      ${normalizedUrl},
      ${null},
      ${sha256(buildProjectWebhookSecret(projectId))},
      true,
      ${now},
      ${now}
    )
    on conflict (project_id, url)
    do update set
      active = true,
      updated_at = excluded.updated_at
  `;
}

async function getProjectResumeRow(sql: SqlClient, projectId: string, resumeId: string) {
  const [row] = await sql<(ProjectResumeRow & { title_is_custom: boolean })[]>`
    select
      r.id,
      r.title,
      r.title_is_custom,
      r.slug,
      r.markdown,
      r.fit_scale,
      r.published_markdown,
      r.published_fit_scale,
      r.is_published,
      r.template_key,
      r.created_at,
      r.updated_at,
      r.published_at,
      r.created_via,
      r.last_compiler_input_format,
      m.project_id,
      m.external_resume_id,
      m.client_reference_id,
      ${null}::text as pdf_job_id,
      ${null}::timestamptz as pdf_completed_at,
      ${null}::timestamptz as pdf_expires_at
    from project_resume_memberships m
    join resumes r on r.id = m.resume_id
    where m.project_id = ${projectId}
      and m.resume_id = ${resumeId}
    limit 1
  `;

  return row ?? null;
}

async function getProjectPdfJobRow(sql: SqlClient, projectId: string, jobId: string) {
  const [row] = await sql<PdfJobRow[]>`
    select *
    from pdf_jobs
    where id = ${jobId}
      and project_id = ${projectId}
    limit 1
  `;

  return row ?? null;
}

async function ensureWorkspaceRow(sql: SqlClient, workspaceId: string, now: Date) {
  await sql`
    insert into workspaces (
      id,
      current_resume_id,
      created_at,
      updated_at
    ) values (
      ${workspaceId},
      ${null},
      ${now},
      ${now}
    )
    on conflict (id)
    do nothing
  `;
}

async function upsertWorkspaceMembership(sql: SqlClient, input: {
  attachedVia: string;
  resumeId: string;
  timestamp: Date;
  workspaceId: string;
}) {
  await sql`
    insert into workspace_resume_memberships (
      workspace_id,
      resume_id,
      attached_via,
      last_opened_at,
      deleted_at,
      created_at,
      updated_at
    ) values (
      ${input.workspaceId},
      ${input.resumeId},
      ${input.attachedVia},
      ${input.timestamp},
      ${null},
      ${input.timestamp},
      ${input.timestamp}
    )
    on conflict (workspace_id, resume_id)
    do update set
      attached_via = excluded.attached_via,
      last_opened_at = excluded.last_opened_at,
      deleted_at = null,
      updated_at = excluded.updated_at
  `;
}

async function setWorkspaceCurrentResume(
  sql: SqlClient,
  workspaceId: string,
  resumeId: string | null,
  timestamp: Date,
) {
  await sql`
    update workspaces
    set
      current_resume_id = ${resumeId},
      updated_at = ${timestamp}
    where id = ${workspaceId}
  `;
}

function toApiResumeRecord(row: ProjectResumeRow): ApiResumeRecord {
  return {
    client_reference_id: row.client_reference_id,
    created_at: formatTimestamp(row.created_at),
    external_resume_id: row.external_resume_id,
    input_format: row.last_compiler_input_format ?? "markdown",
    markdown: row.markdown,
    pdf_url: buildPdfUrl(row.pdf_job_id, row.pdf_expires_at),
    public_url: row.is_published ? `/${row.slug}` : null,
    published_at: formatNullableTimestamp(row.published_at),
    resume_id: row.id,
    status: row.is_published ? "published" : "draft",
    template_key: row.template_key,
    title: row.title,
    updated_at: formatTimestamp(row.updated_at),
  };
}

function toPdfJobResponse(row: PdfJobRow): PdfJobResponse {
  return {
    completed_at: formatNullableTimestamp(row.completed_at),
    error_code: row.error_code,
    error_message: row.error_message,
    job_id: row.id,
    pdf_url: buildPdfDownloadPath(row),
    requested_at: formatTimestamp(row.requested_at),
    resume_id: row.resume_id,
    status: row.status,
  };
}

function buildPdfUrl(jobId: string | null, expiresAt: Date | string | null) {
  if (!jobId || !expiresAt) {
    return null;
  }

  return buildPdfDownloadPath({
    expires_at: expiresAt,
    id: jobId,
    status: "completed",
  });
}

function buildPdfDownloadPath(row: Pick<PdfJobRow, "expires_at" | "id" | "status">) {
  if (row.status !== "completed" || !row.expires_at) {
    return null;
  }

  const expiresAt = formatTimestamp(row.expires_at);
  const token = buildPdfDownloadToken(row.id, expiresAt);

  return `/api/v1/pdf-jobs/${row.id}/file?expires=${encodeURIComponent(expiresAt)}&token=${encodeURIComponent(token)}`;
}

function toProjectApiKeyRecord(row: ProjectApiKeyRow): ProjectApiKeyRecord {
  return {
    createdAt: formatTimestamp(row.created_at),
    id: row.id,
    keyPrefix: row.key_prefix,
    label: row.label,
    lastUsedAt: formatNullableTimestamp(row.last_used_at),
    revokedAt: formatNullableTimestamp(row.revoked_at),
  };
}

function formatTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function formatNullableTimestamp(value: Date | string | null | undefined) {
  return value ? formatTimestamp(value) : null;
}

async function createUniqueProjectSlug(sql: SqlClient, value: string) {
  const baseSlug = slugify(value);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${randomUUID().slice(0, 4)}`;
    const [row] = await sql<{ exists: boolean }[]>`
      select exists(select 1 from projects where slug = ${candidate}) as exists
    `;

    if (!row?.exists) {
      return candidate;
    }
  }

  return `${baseSlug}-${randomUUID().slice(0, 8)}`;
}

async function createUniqueResumeSlug(sql: SqlClient) {
  let latestCandidate = createFriendlyResumeSlug();

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = attempt === 0 ? latestCandidate : createFriendlyResumeSlug();
    latestCandidate = candidate;
    const [row] = await sql<{ exists: boolean }[]>`
      select exists(select 1 from resumes where lower(slug) = lower(${candidate})) as exists
    `;

    if (!row?.exists) {
      return candidate;
    }
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = createFriendlyResumeSlugFallback(latestCandidate);
    const [row] = await sql<{ exists: boolean }[]>`
      select exists(select 1 from resumes where lower(slug) = lower(${candidate})) as exists
    `;

    if (!row?.exists) {
      return candidate;
    }
  }

  return createFriendlyResumeSlugFallback(latestCandidate);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "resource";
}

function getPostgresClient() {
  if (!process.env.DATABASE_URL) {
    throw new DeveloperPlatformUnavailableError(
      "Set DATABASE_URL to enable the Tiny CV developer platform.",
    );
  }

  postgresClient ??= postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
  });

  return postgresClient;
}

async function ensureSchema(sql: SqlClient) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      if (!shouldRunRuntimeSchemaSync()) {
        await verifyDeveloperPlatformSchema(sql);
        return;
      }

      await sql`
        create table if not exists resumes (
          id text primary key,
          slug text not null unique,
          title text not null,
          title_is_custom boolean not null default false,
          markdown text not null,
          fit_scale double precision not null default 1,
          published_markdown text,
          published_fit_scale double precision,
          is_published boolean not null default false,
          editor_token_hash text not null,
          template_key text not null default 'engineer',
          created_via text not null default 'workspace',
          last_compiler_input_format text,
          source_project_id text,
          public_metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          published_at timestamptz
        )
      `;

      await sql`
        create table if not exists workspaces (
          id text primary key,
          current_resume_id text references resumes(id),
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists workspace_resume_memberships (
          workspace_id text not null references workspaces(id),
          resume_id text not null references resumes(id),
          attached_via text not null,
          last_opened_at timestamptz not null default now(),
          deleted_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          primary key (workspace_id, resume_id)
        )
      `;

      await sql`
        create table if not exists projects (
          id text primary key,
          name text not null,
          slug text not null unique,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists project_api_keys (
          id text primary key,
          project_id text not null references projects(id),
          label text not null,
          key_prefix text not null,
          key_hash text not null,
          last_used_at timestamptz,
          revoked_at timestamptz,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists project_resume_memberships (
          project_id text not null references projects(id),
          resume_id text not null references resumes(id),
          attached_via text not null,
          external_resume_id text,
          client_reference_id text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          primary key (project_id, resume_id)
        )
      `;

      await sql`
        create table if not exists resume_edit_claims (
          id text primary key,
          resume_id text not null references resumes(id),
          project_id text references projects(id),
          token_hash text not null,
          expires_at timestamptz not null,
          consumed_at timestamptz,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists pdf_jobs (
          id text primary key,
          project_id text not null references projects(id),
          resume_id text not null references resumes(id),
          status text not null,
          error_code text,
          error_message text,
          pdf_storage_key text,
          pdf_blob bytea,
          content_type text,
          file_name text,
          requested_page_size text,
          requested_at timestamptz not null default now(),
          started_at timestamptz,
          completed_at timestamptz,
          expires_at timestamptz,
          idempotency_key text,
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists webhook_endpoints (
          id text primary key,
          project_id text not null references projects(id),
          url text not null,
          description text,
          secret_hash text not null,
          active boolean not null default true,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists webhook_deliveries (
          id text primary key,
          webhook_endpoint_id text not null references webhook_endpoints(id),
          event_type text not null,
          event_id text not null,
          payload jsonb,
          signature text,
          status_code integer,
          attempt_count integer not null default 0,
          last_error text,
          next_attempt_at timestamptz,
          delivered_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists api_idempotency_keys (
          id text primary key,
          project_id text not null references projects(id),
          operation text not null,
          idempotency_key text not null,
          request_hash text not null,
          response_body jsonb,
          status_code integer,
          completed_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        alter table resumes
        add column if not exists created_via text not null default 'workspace'
      `;

      await sql`
        alter table resumes
        add column if not exists last_compiler_input_format text
      `;

      await sql`
        alter table resumes
        add column if not exists source_project_id text
      `;

      await sql`
        alter table resumes
        add column if not exists public_metadata jsonb not null default '{}'::jsonb
      `;

      await sql`
        alter table webhook_deliveries
        add column if not exists payload jsonb
      `;

      await sql`
        alter table webhook_deliveries
        add column if not exists signature text
      `;

      await sql`
        alter table webhook_deliveries
        add column if not exists updated_at timestamptz not null default now()
      `;

      await sql`
        create unique index if not exists project_api_keys_key_hash_idx
        on project_api_keys(key_hash)
      `;

      await sql`
        create unique index if not exists project_resume_memberships_external_resume_idx
        on project_resume_memberships(project_id, external_resume_id)
        where external_resume_id is not null
      `;

      await sql`
        create unique index if not exists webhook_endpoints_project_url_idx
        on webhook_endpoints(project_id, url)
      `;

      await sql`
        create unique index if not exists api_idempotency_keys_unique_idx
        on api_idempotency_keys(project_id, operation, idempotency_key)
      `;

      await sql`
        create index if not exists resumes_slug_lower_idx
        on resumes(lower(slug))
      `;

      await sql`
        create index if not exists pdf_jobs_project_lookup_idx
        on pdf_jobs(project_id, resume_id, requested_at desc)
      `;

      await sql`
        create index if not exists workspace_resume_memberships_lookup_idx
        on workspace_resume_memberships(workspace_id, deleted_at, last_opened_at desc)
      `;

      await sql`
        create index if not exists webhook_deliveries_due_idx
        on webhook_deliveries(delivered_at, next_attempt_at, attempt_count, created_at)
      `;
    })();
  }

  await schemaReadyPromise;
}

async function verifyDeveloperPlatformSchema(sql: SqlClient) {
  const requiredTables = [
    "api_idempotency_keys",
    "pdf_jobs",
    "project_api_keys",
    "project_resume_memberships",
    "projects",
    "resume_edit_claims",
    "resumes",
    "webhook_deliveries",
    "webhook_endpoints",
    "workspace_resume_memberships",
    "workspaces",
  ];

  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any(${requiredTables})
  `;
  const existingTables = new Set(rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !existingTables.has(table));

  if (missingTables.length > 0) {
    throw new DeveloperPlatformUnavailableError(
      `Tiny CV developer platform schema is not migrated. Run \`pnpm db:migrate\` before enabling /api/v1. Missing: ${missingTables.join(", ")}.`,
    );
  }

  const requiredResumeColumns = [
    "created_via",
    "last_compiler_input_format",
    "public_metadata",
    "source_project_id",
  ];
  const columnRows = await sql<{ column_name: string }[]>`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'resumes'
      and column_name = any(${requiredResumeColumns})
  `;
  const existingColumns = new Set(columnRows.map((row) => row.column_name));
  const missingColumns = requiredResumeColumns.filter((column) => !existingColumns.has(column));

  if (missingColumns.length > 0) {
    throw new DeveloperPlatformUnavailableError(
      `Tiny CV developer platform schema is not migrated. Run \`pnpm db:migrate\` before enabling /api/v1. Missing resumes columns: ${missingColumns.join(", ")}.`,
    );
  }

  const requiredWebhookDeliveryColumns = [
    "payload",
    "signature",
    "updated_at",
  ];
  const webhookColumnRows = await sql<{ column_name: string }[]>`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'webhook_deliveries'
      and column_name = any(${requiredWebhookDeliveryColumns})
  `;
  const existingWebhookColumns = new Set(webhookColumnRows.map((row) => row.column_name));
  const missingWebhookColumns = requiredWebhookDeliveryColumns.filter((column) => !existingWebhookColumns.has(column));

  if (missingWebhookColumns.length > 0) {
    throw new DeveloperPlatformUnavailableError(
      `Tiny CV developer platform schema is not migrated. Run \`pnpm db:migrate\` before enabling /api/v1. Missing webhook_deliveries columns: ${missingWebhookColumns.join(", ")}.`,
    );
  }
}

function shouldRunRuntimeSchemaSync() {
  const configured = process.env.TINYCV_RUNTIME_SCHEMA_SYNC?.trim().toLowerCase();

  if (configured === "1" || configured === "true" || configured === "yes") {
    return true;
  }

  if (configured === "0" || configured === "false" || configured === "no") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}
