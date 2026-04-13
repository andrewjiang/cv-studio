import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { normalizeCvMarkdown, parseCvMarkdown } from "@/app/_lib/cv-markdown";
import type {
  HostedResumeEditorRecord,
  HostedResumePublicRecord,
  HostedResumeSummary,
} from "@/app/_lib/hosted-resume-types";

const LOCAL_STORE_PATH = path.join(process.cwd(), ".data", "hosted-resumes.json");

type HostedResumeRecord = HostedResumeSummary & {
  editorTokenHash: string;
  fitScale: number;
  publishedFitScale: number | null;
  publishedMarkdown: string | null;
};

type HostedResumeStoreShape = {
  resumes: HostedResumeRecord[];
};

export class HostedResumeStoreUnavailableError extends Error {
  constructor(message = "Hosted resume storage is not configured.") {
    super(message);
    this.name = "HostedResumeStoreUnavailableError";
  }
}

type HostedResumeStore = {
  create(input: { fitScale: number; markdown: string }): Promise<HostedResumeEditorRecord>;
  getForEdit(input: {
    editorToken: string;
    resumeId: string;
  }): Promise<HostedResumeEditorRecord | null>;
  getPublishedBySlug(slug: string): Promise<HostedResumePublicRecord | null>;
  publish(input: {
    editorToken: string;
    fitScale: number;
    markdown: string;
    resumeId: string;
  }): Promise<HostedResumeEditorRecord | null>;
  save(input: {
    editorToken: string;
    fitScale: number;
    markdown: string;
    resumeId: string;
  }): Promise<HostedResumeEditorRecord | null>;
};

let postgresClient: postgres.Sql | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export async function createHostedResume(input: {
  fitScale: number;
  markdown: string;
}) {
  return getHostedResumeStore().create(input);
}

export async function getHostedResumeForEdit(input: {
  editorToken: string;
  resumeId: string;
}) {
  return getHostedResumeStore().getForEdit(input);
}

export async function saveHostedResume(input: {
  editorToken: string;
  fitScale: number;
  markdown: string;
  resumeId: string;
}) {
  return getHostedResumeStore().save(input);
}

export async function publishHostedResume(input: {
  editorToken: string;
  fitScale: number;
  markdown: string;
  resumeId: string;
}) {
  return getHostedResumeStore().publish(input);
}

export async function getPublishedResumeBySlug(slug: string) {
  return getHostedResumeStore().getPublishedBySlug(slug);
}

function getHostedResumeStore(): HostedResumeStore {
  if (process.env.DATABASE_URL) {
    return createPostgresStore();
  }

  if (process.env.VERCEL) {
    throw new HostedResumeStoreUnavailableError(
      "Set DATABASE_URL to enable hosted resume save and publish in production.",
    );
  }

  return createLocalFileStore();
}

function createLocalFileStore(): HostedResumeStore {
  return {
    async create({ fitScale, markdown }) {
      const normalizedMarkdown = normalizeCvMarkdown(markdown);
      const token = createEditorToken();
      const now = new Date().toISOString();
      const store = await readLocalStore();
      const title = deriveResumeTitle(normalizedMarkdown);
      const slug = createUniqueSlug(store.resumes, title);
      const record: HostedResumeRecord = {
        createdAt: now,
        editorTokenHash: hashToken(token),
        fitScale,
        id: randomUUID(),
        isPublished: false,
        markdown: normalizedMarkdown,
        publishedFitScale: null,
        publishedMarkdown: null,
        publishedAt: null,
        slug,
        title,
        updatedAt: now,
      };

      store.resumes.push(record);
      await writeLocalStore(store);

      return toEditorRecord(record, token);
    },

    async getForEdit({ editorToken, resumeId }) {
      const store = await readLocalStore();
      const record = store.resumes.find((resume) => resume.id === resumeId);

      if (!record || record.editorTokenHash !== hashToken(editorToken)) {
        return null;
      }

      return toEditorRecord(record, editorToken);
    },

    async getPublishedBySlug(slug) {
      const store = await readLocalStore();
      const record = store.resumes.find(
        (resume) => resume.slug === slug && resume.isPublished && Boolean(resume.publishedMarkdown),
      );

      return record ? toPublicRecord(record) : null;
    },

    async publish({ editorToken, fitScale, markdown, resumeId }) {
      return mutateLocalResume({
        editorToken,
        fitScale,
        markdown,
        publish: true,
        resumeId,
      });
    },

    async save({ editorToken, fitScale, markdown, resumeId }) {
      return mutateLocalResume({
        editorToken,
        fitScale,
        markdown,
        publish: false,
        resumeId,
      });
    },
  };
}

function createPostgresStore(): HostedResumeStore {
  return {
    async create({ fitScale, markdown }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);

      const normalizedMarkdown = normalizeCvMarkdown(markdown);
      const title = deriveResumeTitle(normalizedMarkdown);
      const token = createEditorToken();
      const id = randomUUID();
      const slug = await createUniqueSlugInPostgres(sql, title);

      const [row] = await sql<ResumeRow[]>`
        insert into resumes (
          id,
          slug,
          title,
          markdown,
          fit_scale,
          published_markdown,
          published_fit_scale,
          is_published,
          editor_token_hash
        ) values (
          ${id},
          ${slug},
          ${title},
          ${normalizedMarkdown},
          ${fitScale},
          ${null},
          ${null},
          false,
          ${hashToken(token)}
        )
        returning id, slug, title, markdown, fit_scale, is_published, created_at, updated_at, published_at
      `;

      return toEditorRecordFromRow(row, token);
    },

    async getForEdit({ editorToken, resumeId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);

      const [row] = await sql<ResumeRow[]>`
        select id, slug, title, markdown, fit_scale, is_published, created_at, updated_at, published_at
        from resumes
        where id = ${resumeId}
          and editor_token_hash = ${hashToken(editorToken)}
        limit 1
      `;

      return row ? toEditorRecordFromRow(row, editorToken) : null;
    },

    async getPublishedBySlug(slug) {
      const sql = getPostgresClient();
      await ensureSchema(sql);

      const [row] = await sql<ResumeRow[]>`
        select
          id,
          slug,
          title,
          coalesce(published_markdown, markdown) as markdown,
          coalesce(published_fit_scale, fit_scale) as fit_scale,
          is_published,
          created_at,
          updated_at,
          published_at
        from resumes
        where slug = ${slug}
          and is_published = true
          and published_markdown is not null
        limit 1
      `;

      return row ? toPublicRecordFromRow(row) : null;
    },

    async publish({ editorToken, fitScale, markdown, resumeId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const normalizedMarkdown = normalizeCvMarkdown(markdown);

      const [row] = await sql<ResumeRow[]>`
        update resumes
        set
          markdown = ${normalizedMarkdown},
          title = ${deriveResumeTitle(normalizedMarkdown)},
          fit_scale = ${fitScale},
          published_markdown = ${normalizedMarkdown},
          published_fit_scale = ${fitScale},
          is_published = true,
          published_at = coalesce(published_at, now()),
          updated_at = now()
        where id = ${resumeId}
          and editor_token_hash = ${hashToken(editorToken)}
        returning id, slug, title, markdown, fit_scale, is_published, created_at, updated_at, published_at
      `;

      return row ? toEditorRecordFromRow(row, editorToken) : null;
    },

    async save({ editorToken, fitScale, markdown, resumeId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);

      const normalizedMarkdown = normalizeCvMarkdown(markdown);
      const [row] = await sql<ResumeRow[]>`
        update resumes
        set
          markdown = ${normalizedMarkdown},
          title = ${deriveResumeTitle(normalizedMarkdown)},
          fit_scale = ${fitScale},
          updated_at = now()
        where id = ${resumeId}
          and editor_token_hash = ${hashToken(editorToken)}
        returning id, slug, title, markdown, fit_scale, is_published, created_at, updated_at, published_at
      `;

      return row ? toEditorRecordFromRow(row, editorToken) : null;
    },
  };
}

async function mutateLocalResume(input: {
  editorToken: string;
  fitScale: number;
  markdown: string;
  publish: boolean;
  resumeId: string;
}) {
  const store = await readLocalStore();
  const record = store.resumes.find((resume) => resume.id === input.resumeId);

  if (!record || record.editorTokenHash !== hashToken(input.editorToken)) {
    return null;
  }

  const normalizedMarkdown = normalizeCvMarkdown(input.markdown);
  const now = new Date().toISOString();

  record.markdown = normalizedMarkdown;
  record.title = deriveResumeTitle(normalizedMarkdown);
  record.fitScale = input.fitScale;
  record.updatedAt = now;

  if (input.publish) {
    record.isPublished = true;
    record.publishedFitScale = input.fitScale;
    record.publishedMarkdown = normalizedMarkdown;
    record.publishedAt = record.publishedAt ?? now;
  }

  await writeLocalStore(store);

  return toEditorRecord(record, input.editorToken);
}

async function readLocalStore(): Promise<HostedResumeStoreShape> {
  try {
    const raw = await readFile(LOCAL_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<HostedResumeStoreShape>;

    return {
      resumes: Array.isArray(parsed.resumes)
        ? parsed.resumes.filter(isHostedResumeRecord)
        : [],
    };
  } catch {
    return { resumes: [] };
  }
}

async function writeLocalStore(store: HostedResumeStoreShape) {
  await mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  await writeFile(LOCAL_STORE_PATH, JSON.stringify(store, null, 2));
}

function getPostgresClient() {
  if (!process.env.DATABASE_URL) {
    throw new HostedResumeStoreUnavailableError(
      "Set DATABASE_URL to enable hosted resume save and publish.",
    );
  }

  postgresClient ??= postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
  });

  return postgresClient;
}

async function ensureSchema(sql: postgres.Sql) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await sql`
        create table if not exists resumes (
          id text primary key,
          slug text not null unique,
          title text not null,
          markdown text not null,
          fit_scale double precision not null default 1,
          published_markdown text,
          published_fit_scale double precision,
          is_published boolean not null default false,
          editor_token_hash text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          published_at timestamptz
        )
      `;

      await sql`
        alter table resumes
        add column if not exists published_markdown text
      `;

      await sql`
        alter table resumes
        add column if not exists published_fit_scale double precision
      `;

      await sql`
        create unique index if not exists resumes_editor_token_hash_idx
        on resumes(editor_token_hash)
      `;
    })();
  }

  await schemaReadyPromise;
}

async function createUniqueSlugInPostgres(sql: postgres.Sql, title: string) {
  const baseSlug = slugify(title);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${randomSlugSuffix()}`;
    const [row] = await sql<{ exists: boolean }[]>`
      select exists(select 1 from resumes where slug = ${candidate}) as exists
    `;

    if (!row?.exists) {
      return candidate;
    }
  }

  return `${baseSlug}-${randomSlugSuffix()}-${randomSlugSuffix()}`;
}

function createUniqueSlug(resumes: HostedResumeRecord[], title: string) {
  const baseSlug = slugify(title);
  let candidate = baseSlug;
  let attempt = 1;

  while (resumes.some((resume) => resume.slug === candidate)) {
    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
  }

  return candidate;
}

function deriveResumeTitle(markdown: string) {
  return parseCvMarkdown(normalizeCvMarkdown(markdown)).name || "Untitled Resume";
}

function createEditorToken() {
  return `${randomUUID()}-${randomBytes(16).toString("hex")}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function randomSlugSuffix() {
  return randomBytes(2).toString("hex");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "resume";
}

function toEditorRecord(record: HostedResumeRecord, editorToken: string): HostedResumeEditorRecord {
  return {
    createdAt: record.createdAt,
    editorToken,
    fitScale: record.fitScale,
    id: record.id,
    isPublished: record.isPublished,
    markdown: record.markdown,
    publishedAt: record.publishedAt,
    slug: record.slug,
    title: record.title,
    updatedAt: record.updatedAt,
  };
}

function toPublicRecord(record: HostedResumeRecord): HostedResumePublicRecord {
  return {
    createdAt: record.createdAt,
    fitScale: record.publishedFitScale ?? record.fitScale,
    id: record.id,
    isPublished: record.isPublished,
    markdown: record.publishedMarkdown ?? record.markdown,
    publishedAt: record.publishedAt,
    slug: record.slug,
    title: record.title,
    updatedAt: record.updatedAt,
  };
}

function toEditorRecordFromRow(row: ResumeRow, editorToken: string): HostedResumeEditorRecord {
  return {
    createdAt: formatTimestamp(row.created_at),
    editorToken,
    fitScale: row.fit_scale,
    id: row.id,
    isPublished: row.is_published,
    markdown: row.markdown,
    publishedAt: row.published_at ? formatTimestamp(row.published_at) : null,
    slug: row.slug,
    title: row.title,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function toPublicRecordFromRow(row: ResumeRow): HostedResumePublicRecord {
  return {
    createdAt: formatTimestamp(row.created_at),
    fitScale: row.fit_scale,
    id: row.id,
    isPublished: row.is_published,
    markdown: row.markdown,
    publishedAt: row.published_at ? formatTimestamp(row.published_at) : null,
    slug: row.slug,
    title: row.title,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function isHostedResumeRecord(value: unknown): value is HostedResumeRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<HostedResumeRecord>;

  return (
    typeof record.createdAt === "string" &&
    typeof record.editorTokenHash === "string" &&
    typeof record.fitScale === "number" &&
    typeof record.id === "string" &&
    typeof record.isPublished === "boolean" &&
    typeof record.markdown === "string" &&
    (typeof record.publishedFitScale === "number" || record.publishedFitScale === null) &&
    (typeof record.publishedMarkdown === "string" || record.publishedMarkdown === null) &&
    (typeof record.publishedAt === "string" || record.publishedAt === null) &&
    typeof record.slug === "string" &&
    typeof record.title === "string" &&
    typeof record.updatedAt === "string"
  );
}

type ResumeRow = {
  created_at: Date | string;
  fit_scale: number;
  id: string;
  is_published: boolean;
  markdown: string;
  published_at: Date | string | null;
  slug: string;
  title: string;
  updated_at: Date | string;
};

function formatTimestamp(value: Date | string) {
  return new Date(value).toISOString();
}
