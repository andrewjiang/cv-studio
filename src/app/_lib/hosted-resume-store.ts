import "server-only";

import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { normalizeCvMarkdown, parseCvMarkdown } from "@/app/_lib/cv-markdown";
import {
  buildEditorPath,
  createLegacyEditorToken,
  hashToken,
  isEditorAccessTokenValid,
} from "@/app/_lib/editor-links";
import { getResumeTemplate } from "@/app/_lib/resume-templates";
import {
  createFriendlyResumeSlug,
  createFriendlyResumeSlugFallback,
  normalizeSlugForComparison,
} from "@/app/_lib/resume-slugs";
import type {
  HostedResumeEditorRecord,
  HostedResumePublicRecord,
  StudioBootstrapPayload,
  TemplateKey,
  WorkspacePayload,
  WorkspaceResumeSummary,
} from "@/app/_lib/hosted-resume-types";

type AttachedVia = "bootstrap" | "new_resume" | "edit_link" | "legacy_import";

export type LegacyResumeDraftInput = {
  editorToken?: string;
  markdown: string;
  name: string;
  remoteResumeId?: string;
  updatedAt: string;
};

type HostedResumeStore = {
  attachResumeByToken(input: {
    resumeId: string;
    token: string;
    workspaceId?: string | null;
  }): Promise<StudioBootstrapPayload | null>;
  bootstrapWorkspace(input: {
    templateKey: TemplateKey;
    workspaceId?: string | null;
  }): Promise<StudioBootstrapPayload>;
  createResumeInWorkspace(input: {
    markdown?: string;
    templateKey: TemplateKey;
    title?: string;
    workspaceId: string;
  }): Promise<StudioBootstrapPayload | null>;
  deleteResumeFromWorkspace(input: {
    resumeId: string;
    workspaceId: string;
  }): Promise<{ currentResumeId: string | null; workspace: WorkspacePayload } | null>;
  getPublishedBySlug(slug: string): Promise<HostedResumePublicRecord | null>;
  getStudioBootstrap(input: {
    resumeId: string;
    workspaceId: string;
  }): Promise<StudioBootstrapPayload | null>;
  getWorkspace(workspaceId: string): Promise<WorkspacePayload | null>;
  importLegacyDrafts(input: {
    activeDraftName?: string | null;
    drafts: LegacyResumeDraftInput[];
    workspaceId?: string | null;
  }): Promise<{ currentResumeId: string | null; workspace: WorkspacePayload }>;
  publishResume(input: {
    fitScale: number;
    markdown: string;
    resumeId: string;
    workspaceId: string;
  }): Promise<StudioBootstrapPayload | null>;
  renameResume(input: {
    resumeId: string;
    title: string;
    workspaceId: string;
  }): Promise<StudioBootstrapPayload | null>;
  saveResume(input: {
    fitScale: number;
    markdown: string;
    resumeId: string;
    workspaceId: string;
  }): Promise<StudioBootstrapPayload | null>;
  switchCurrentResume(input: {
    resumeId: string;
    workspaceId: string;
  }): Promise<StudioBootstrapPayload | null>;
  validateEditLink(input: {
    resumeId: string;
    token: string;
  }): Promise<HostedResumeEditorRecord | null>;
};

type LocalStoredResume = {
  createdAt: string;
  editorTokenHash: string;
  fitScale: number;
  id: string;
  isPublished: boolean;
  markdown: string;
  publishedAt: string | null;
  publishedFitScale: number | null;
  publishedMarkdown: string | null;
  slug: string;
  templateKey: TemplateKey;
  title: string;
  titleIsCustom: boolean;
  updatedAt: string;
};

type LocalStoredWorkspace = {
  createdAt: string;
  currentResumeId: string | null;
  id: string;
  updatedAt: string;
};

type LocalStoredMembership = {
  attachedVia: AttachedVia;
  createdAt: string;
  deletedAt: string | null;
  lastOpenedAt: string;
  resumeId: string;
  updatedAt: string;
  workspaceId: string;
};

type LocalStoreShape = {
  memberships: LocalStoredMembership[];
  resumes: LocalStoredResume[];
  workspaces: LocalStoredWorkspace[];
};

export class HostedResumeStoreUnavailableError extends Error {
  constructor(message = "Hosted resume storage is not configured.") {
    super(message);
    this.name = "HostedResumeStoreUnavailableError";
  }
}

export class HostedResumeStoreConnectionError extends Error {
  constructor(message = "Hosted resume storage is unreachable.") {
    super(message);
    this.name = "HostedResumeStoreConnectionError";
  }
}

let postgresClient: postgres.Sql | null = null;
let schemaReadyPromise: Promise<void> | null = null;
type SqlClient = postgres.Sql | postgres.TransactionSql;

export async function createWorkspaceBootstrap(input: {
  templateKey: TemplateKey;
  workspaceId?: string | null;
}) {
  try {
    return await getHostedResumeStore().bootstrapWorkspace(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function importLegacyWorkspaceDrafts(input: {
  activeDraftName?: string | null;
  drafts: LegacyResumeDraftInput[];
  workspaceId?: string | null;
}) {
  try {
    return await getHostedResumeStore().importLegacyDrafts(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function getWorkspace(workspaceId: string) {
  try {
    return await getHostedResumeStore().getWorkspace(workspaceId);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function getStudioBootstrap(input: {
  resumeId: string;
  workspaceId: string;
}) {
  try {
    return await getHostedResumeStore().getStudioBootstrap(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function validateHostedResumeEditLink(input: {
  resumeId: string;
  token: string;
}) {
  try {
    return await getHostedResumeStore().validateEditLink(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function attachHostedResume(input: {
  resumeId: string;
  token: string;
  workspaceId?: string | null;
}) {
  try {
    return await getHostedResumeStore().attachResumeByToken(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function switchWorkspaceResume(input: {
  resumeId: string;
  workspaceId: string;
}) {
  try {
    return await getHostedResumeStore().switchCurrentResume(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function createWorkspaceResume(input: {
  markdown?: string;
  templateKey: TemplateKey;
  title?: string;
  workspaceId: string;
}) {
  try {
    return await getHostedResumeStore().createResumeInWorkspace(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function saveWorkspaceResume(input: {
  fitScale: number;
  markdown: string;
  resumeId: string;
  workspaceId: string;
}) {
  try {
    return await getHostedResumeStore().saveResume(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function publishWorkspaceResume(input: {
  fitScale: number;
  markdown: string;
  resumeId: string;
  workspaceId: string;
}) {
  try {
    return await getHostedResumeStore().publishResume(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function renameWorkspaceResume(input: {
  resumeId: string;
  title: string;
  workspaceId: string;
}) {
  try {
    return await getHostedResumeStore().renameResume(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function deleteWorkspaceResume(input: {
  resumeId: string;
  workspaceId: string;
}) {
  try {
    return await getHostedResumeStore().deleteResumeFromWorkspace(input);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
}

export async function getPublishedResumeBySlug(slug: string) {
  try {
    return await getHostedResumeStore().getPublishedBySlug(slug);
  } catch (error) {
    throw mapHostedResumeStoreError(error);
  }
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
    async attachResumeByToken({ resumeId, token, workspaceId }) {
      const store = await readLocalStore();
      const resume = store.resumes.find((candidate) => candidate.id === resumeId);

      if (!resume || !isTokenValidForResume(resume, token)) {
        return null;
      }

      const workspace = ensureLocalWorkspace(store, workspaceId);
      const now = new Date().toISOString();
      attachLocalMembership(store, workspace.id, resume.id, "edit_link", now);
      setWorkspaceCurrentResume(store, workspace.id, resume.id, now);
      await writeLocalStore(store);

      return buildLocalStudioPayload(store, workspace.id, resume.id);
    },

    async bootstrapWorkspace({ templateKey, workspaceId }) {
      const store = await readLocalStore();
      const workspace = ensureLocalWorkspace(store, workspaceId);
      const now = new Date().toISOString();
      const resume = createLocalResumeRecord(store, {
        markdown: getResumeTemplate(templateKey).markdown,
        templateKey,
      });

      store.resumes.push(resume);
      attachLocalMembership(store, workspace.id, resume.id, "bootstrap", now);
      setWorkspaceCurrentResume(store, workspace.id, resume.id, now);
      await writeLocalStore(store);

      return buildLocalStudioPayload(store, workspace.id, resume.id)!;
    },

    async createResumeInWorkspace({ markdown, templateKey, title, workspaceId }) {
      const store = await readLocalStore();

      if (!store.workspaces.some((workspace) => workspace.id === workspaceId)) {
        return null;
      }

      const now = new Date().toISOString();
      const resume = createLocalResumeRecord(store, {
        markdown: markdown ?? getResumeTemplate(templateKey).markdown,
        templateKey,
        ...resolveImportedTitle(title ?? "", markdown ?? getResumeTemplate(templateKey).markdown),
      });

      store.resumes.push(resume);
      attachLocalMembership(store, workspaceId, resume.id, "new_resume", now);
      setWorkspaceCurrentResume(store, workspaceId, resume.id, now);
      await writeLocalStore(store);

      return buildLocalStudioPayload(store, workspaceId, resume.id);
    },

    async deleteResumeFromWorkspace({ resumeId, workspaceId }) {
      const store = await readLocalStore();
      const membership = findActiveLocalMembership(store, workspaceId, resumeId);

      if (!membership) {
        return null;
      }

      const now = new Date().toISOString();
      membership.deletedAt = now;
      membership.updatedAt = now;

      const nextResumeId = findNextLocalResumeId(store, workspaceId);
      setWorkspaceCurrentResume(store, workspaceId, nextResumeId, now);
      await writeLocalStore(store);

      return {
        currentResumeId: nextResumeId,
        workspace: buildLocalWorkspacePayload(store, workspaceId)!,
      };
    },

    async getPublishedBySlug(slug) {
      const store = await readLocalStore();
      const normalizedSlug = normalizeSlugForComparison(slug);
      const resume = store.resumes.find((candidate) =>
        normalizeSlugForComparison(candidate.slug) === normalizedSlug &&
        candidate.isPublished &&
        Boolean(candidate.publishedMarkdown)
      );

      return resume ? toPublicRecord(resume) : null;
    },

    async getStudioBootstrap({ resumeId, workspaceId }) {
      const store = await readLocalStore();
      return buildLocalStudioPayload(store, workspaceId, resumeId);
    },

    async getWorkspace(workspaceId) {
      const store = await readLocalStore();
      return buildLocalWorkspacePayload(store, workspaceId, false);
    },

    async importLegacyDrafts({ activeDraftName, drafts, workspaceId }) {
      const store = await readLocalStore();
      const workspace = ensureLocalWorkspace(store, workspaceId);
      const now = new Date().toISOString();
      const importedIdsByName = new Map<string, string>();

      for (const draft of drafts) {
        const normalizedMarkdown = normalizeCvMarkdown(draft.markdown);
        const importedTitle = resolveImportedTitle(draft.name, normalizedMarkdown);

        let resume: LocalStoredResume | null = null;

        if (draft.remoteResumeId && draft.editorToken) {
          const existingRemote = store.resumes.find((candidate) => candidate.id === draft.remoteResumeId);

          if (existingRemote && isTokenValidForResume(existingRemote, draft.editorToken)) {
            existingRemote.markdown = normalizedMarkdown;
            existingRemote.title = importedTitle.title;
            existingRemote.titleIsCustom = importedTitle.titleIsCustom;
            existingRemote.updatedAt = normalizeTimestamp(draft.updatedAt, now);
            resume = existingRemote;
          }
        }

        if (!resume) {
          const duplicate = findDuplicateLocalResume(store, workspace.id, importedTitle.title, normalizedMarkdown);

          if (duplicate) {
            duplicate.updatedAt = normalizeTimestamp(draft.updatedAt, duplicate.updatedAt);
            resume = duplicate;
          } else {
            resume = createLocalResumeRecord(store, {
              markdown: normalizedMarkdown,
              templateKey: guessTemplateKeyFromMarkdown(normalizedMarkdown),
              title: importedTitle.title,
              titleIsCustom: importedTitle.titleIsCustom,
              updatedAt: normalizeTimestamp(draft.updatedAt, now),
            });
            store.resumes.push(resume);
          }
        }

        attachLocalMembership(store, workspace.id, resume.id, "legacy_import", now);
        importedIdsByName.set(draft.name, resume.id);
      }

      const selectedResumeId =
        (activeDraftName ? importedIdsByName.get(activeDraftName) : null) ??
        store.workspaces.find((candidate) => candidate.id === workspace.id)?.currentResumeId ??
        findNextLocalResumeId(store, workspace.id);

      setWorkspaceCurrentResume(store, workspace.id, selectedResumeId ?? null, now);
      await writeLocalStore(store);

      return {
        currentResumeId: selectedResumeId ?? null,
        workspace: buildLocalWorkspacePayload(store, workspace.id)!,
      };
    },

    async publishResume({ fitScale, markdown, resumeId, workspaceId }) {
      const store = await readLocalStore();
      const membership = findActiveLocalMembership(store, workspaceId, resumeId);
      const resume = membership
        ? store.resumes.find((candidate) => candidate.id === membership.resumeId) ?? null
        : null;

      if (!membership || !resume) {
        return null;
      }

      const now = new Date().toISOString();
      applyResumeMarkdownUpdate(resume, markdown, fitScale, now);
      resume.isPublished = true;
      resume.publishedAt = resume.publishedAt ?? now;
      resume.publishedFitScale = fitScale;
      resume.publishedMarkdown = normalizeCvMarkdown(markdown);
      touchLocalMembership(membership, now);
      setWorkspaceCurrentResume(store, workspaceId, resume.id, now);
      await writeLocalStore(store);

      return buildLocalStudioPayload(store, workspaceId, resume.id);
    },

    async renameResume({ resumeId, title, workspaceId }) {
      const store = await readLocalStore();
      const membership = findActiveLocalMembership(store, workspaceId, resumeId);
      const resume = membership
        ? store.resumes.find((candidate) => candidate.id === membership.resumeId) ?? null
        : null;

      if (!membership || !resume) {
        return null;
      }

      const now = new Date().toISOString();
      resume.title = title.trim();
      resume.titleIsCustom = true;
      resume.updatedAt = now;
      touchLocalMembership(membership, now);
      setWorkspaceCurrentResume(store, workspaceId, resume.id, now);
      await writeLocalStore(store);

      return buildLocalStudioPayload(store, workspaceId, resume.id);
    },

    async saveResume({ fitScale, markdown, resumeId, workspaceId }) {
      const store = await readLocalStore();
      const membership = findActiveLocalMembership(store, workspaceId, resumeId);
      const resume = membership
        ? store.resumes.find((candidate) => candidate.id === membership.resumeId) ?? null
        : null;

      if (!membership || !resume) {
        return null;
      }

      const now = new Date().toISOString();
      applyResumeMarkdownUpdate(resume, markdown, fitScale, now);
      touchLocalMembership(membership, now);
      setWorkspaceCurrentResume(store, workspaceId, resume.id, now);
      await writeLocalStore(store);

      return buildLocalStudioPayload(store, workspaceId, resume.id);
    },

    async switchCurrentResume({ resumeId, workspaceId }) {
      const store = await readLocalStore();
      const membership = findActiveLocalMembership(store, workspaceId, resumeId);

      if (!membership) {
        return null;
      }

      const now = new Date().toISOString();
      touchLocalMembership(membership, now);
      setWorkspaceCurrentResume(store, workspaceId, resumeId, now);
      await writeLocalStore(store);

      return buildLocalStudioPayload(store, workspaceId, resumeId);
    },

    async validateEditLink({ resumeId, token }) {
      const store = await readLocalStore();
      const resume = store.resumes.find((candidate) => candidate.id === resumeId);

      if (!resume || !isTokenValidForResume(resume, token)) {
        return null;
      }

      return toEditorRecord(resume);
    },
  };
}

function createPostgresStore(): HostedResumeStore {
  return {
    async attachResumeByToken({ resumeId, token, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const now = new Date();

      return sql.begin(async (tx) => {
        const resume = await getResumeRowById(tx, resumeId);

        if (!resume || !isTokenValidForResume(resume, token)) {
          return null;
        }

        const workspace = await ensurePostgresWorkspace(tx, workspaceId, now);
        await upsertWorkspaceMembership(tx, {
          attachedVia: "edit_link",
          resumeId,
          timestamp: now,
          workspaceId: workspace.id,
        });
        await setPostgresWorkspaceCurrentResume(tx, workspace.id, resumeId, now);
        return buildPostgresStudioPayload(tx, workspace.id, resumeId);
      });
    },

    async bootstrapWorkspace({ templateKey, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const now = new Date();

      return sql.begin(async (tx) => {
        const workspace = await ensurePostgresWorkspace(tx, workspaceId, now);
        const resumeId = await createPostgresResume(tx, {
          markdown: getResumeTemplate(templateKey).markdown,
          templateKey,
        });

        await upsertWorkspaceMembership(tx, {
          attachedVia: "bootstrap",
          resumeId,
          timestamp: now,
          workspaceId: workspace.id,
        });
        await setPostgresWorkspaceCurrentResume(tx, workspace.id, resumeId, now);
        return (await buildPostgresStudioPayload(tx, workspace.id, resumeId))!;
      });
    },

    async createResumeInWorkspace({ markdown, templateKey, title, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const now = new Date();

      return sql.begin(async (tx) => {
        const workspace = await getWorkspaceRowById(tx, workspaceId);

        if (!workspace) {
          return null;
        }

        const resumeId = await createPostgresResume(tx, {
          markdown: markdown ?? getResumeTemplate(templateKey).markdown,
          templateKey,
          ...resolveImportedTitle(title ?? "", markdown ?? getResumeTemplate(templateKey).markdown),
        });

        await upsertWorkspaceMembership(tx, {
          attachedVia: "new_resume",
          resumeId,
          timestamp: now,
          workspaceId,
        });
        await setPostgresWorkspaceCurrentResume(tx, workspaceId, resumeId, now);
        return buildPostgresStudioPayload(tx, workspaceId, resumeId);
      });
    },

    async deleteResumeFromWorkspace({ resumeId, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const now = new Date();

      return sql.begin(async (tx) => {
        const [membership] = await tx<WorkspaceMembershipRow[]>`
          select *
          from workspace_resume_memberships
          where workspace_id = ${workspaceId}
            and resume_id = ${resumeId}
            and deleted_at is null
          limit 1
        `;

        if (!membership) {
          return null;
        }

        await tx`
          update workspace_resume_memberships
          set
            deleted_at = ${now},
            updated_at = ${now}
          where workspace_id = ${workspaceId}
            and resume_id = ${resumeId}
        `;

        const nextResumeId = await findNextPostgresResumeId(tx, workspaceId);
        await setPostgresWorkspaceCurrentResume(tx, workspaceId, nextResumeId, now);

        return {
          currentResumeId: nextResumeId,
          workspace: (await buildPostgresWorkspacePayload(tx, workspaceId))!,
        };
      });
    },

    async getPublishedBySlug(slug) {
      const sql = getPostgresClient();
      await ensureSchema(sql);

      const [row] = await sql<ResumeRow[]>`
        select
          id,
          slug,
          title,
          markdown,
          fit_scale,
          published_markdown,
          published_fit_scale,
          is_published,
          editor_token_hash,
          template_key,
          title_is_custom,
          created_at,
          updated_at,
          published_at
        from resumes
        where lower(slug) = lower(${slug})
          and is_published = true
          and published_markdown is not null
        limit 1
      `;

      return row ? toPublicRecord(row) : null;
    },

    async getStudioBootstrap({ resumeId, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      return buildPostgresStudioPayload(sql, workspaceId, resumeId);
    },

    async getWorkspace(workspaceId) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      return buildPostgresWorkspacePayload(sql, workspaceId);
    },

    async importLegacyDrafts({ activeDraftName, drafts, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const now = new Date();

      return sql.begin(async (tx) => {
        const workspace = await ensurePostgresWorkspace(tx, workspaceId, now);
        const importedIdsByName = new Map<string, string>();

        for (const draft of drafts) {
          const normalizedMarkdown = normalizeCvMarkdown(draft.markdown);
          const importedTitle = resolveImportedTitle(draft.name, normalizedMarkdown);
          let resumeId: string | null = null;

          if (draft.remoteResumeId && draft.editorToken) {
            const existingRemote = await getResumeRowById(tx, draft.remoteResumeId);

            if (existingRemote && isTokenValidForResume(existingRemote, draft.editorToken)) {
              const nextUpdatedAt = normalizeTimestamp(draft.updatedAt, now.toISOString());
              await tx`
                update resumes
                set
                  markdown = ${normalizedMarkdown},
                  title = ${importedTitle.title},
                  title_is_custom = ${importedTitle.titleIsCustom},
                  template_key = coalesce(template_key, 'engineer'),
                  updated_at = ${nextUpdatedAt}
                where id = ${existingRemote.id}
              `;
              resumeId = existingRemote.id;
            }
          }

          if (!resumeId) {
            const duplicate = await findDuplicatePostgresResume(tx, workspace.id, importedTitle.title, normalizedMarkdown);

            if (duplicate) {
              resumeId = duplicate.id;
              await tx`
                update resumes
                set updated_at = ${normalizeTimestamp(draft.updatedAt, now.toISOString())}
                where id = ${duplicate.id}
              `;
            } else {
              resumeId = await createPostgresResume(tx, {
                markdown: normalizedMarkdown,
                templateKey: guessTemplateKeyFromMarkdown(normalizedMarkdown),
                title: importedTitle.title,
                titleIsCustom: importedTitle.titleIsCustom,
                updatedAt: normalizeTimestamp(draft.updatedAt, now.toISOString()),
              });
            }
          }

          await upsertWorkspaceMembership(tx, {
            attachedVia: "legacy_import",
            resumeId,
            timestamp: now,
            workspaceId: workspace.id,
          });
          importedIdsByName.set(draft.name, resumeId);
        }

        const selectedResumeId =
          (activeDraftName ? importedIdsByName.get(activeDraftName) : null) ??
          (await resolveCurrentPostgresResumeId(tx, workspace.id));

        await setPostgresWorkspaceCurrentResume(tx, workspace.id, selectedResumeId ?? null, now);

        return {
          currentResumeId: selectedResumeId ?? null,
          workspace: (await buildPostgresWorkspacePayload(tx, workspace.id))!,
        };
      });
    },

    async publishResume({ fitScale, markdown, resumeId, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const now = new Date();

      return sql.begin(async (tx) => {
        const resume = await getWorkspaceResumeRow(tx, workspaceId, resumeId);

        if (!resume) {
          return null;
        }

        const normalizedMarkdown = normalizeCvMarkdown(markdown);
        const derivedTitle = deriveResumeTitle(normalizedMarkdown);

        await tx`
          update resumes
          set
            markdown = ${normalizedMarkdown},
            title = case when title_is_custom then title else ${derivedTitle} end,
            fit_scale = ${fitScale},
            published_markdown = ${normalizedMarkdown},
            published_fit_scale = ${fitScale},
            is_published = true,
            published_at = coalesce(published_at, ${now}),
            updated_at = ${now}
          where id = ${resumeId}
        `;

        await touchPostgresMembership(tx, workspaceId, resumeId, now);
        await setPostgresWorkspaceCurrentResume(tx, workspaceId, resumeId, now);
        return buildPostgresStudioPayload(tx, workspaceId, resumeId);
      });
    },

    async renameResume({ resumeId, title, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const now = new Date();

      return sql.begin(async (tx) => {
        const resume = await getWorkspaceResumeRow(tx, workspaceId, resumeId);

        if (!resume) {
          return null;
        }

        await tx`
          update resumes
          set
            title = ${title.trim()},
            title_is_custom = true,
            updated_at = ${now}
          where id = ${resumeId}
        `;

        await touchPostgresMembership(tx, workspaceId, resumeId, now);
        await setPostgresWorkspaceCurrentResume(tx, workspaceId, resumeId, now);
        return buildPostgresStudioPayload(tx, workspaceId, resumeId);
      });
    },

    async saveResume({ fitScale, markdown, resumeId, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const now = new Date();

      return sql.begin(async (tx) => {
        const resume = await getWorkspaceResumeRow(tx, workspaceId, resumeId);

        if (!resume) {
          return null;
        }

        const normalizedMarkdown = normalizeCvMarkdown(markdown);
        const derivedTitle = deriveResumeTitle(normalizedMarkdown);

        await tx`
          update resumes
          set
            markdown = ${normalizedMarkdown},
            title = case when title_is_custom then title else ${derivedTitle} end,
            fit_scale = ${fitScale},
            updated_at = ${now}
          where id = ${resumeId}
        `;

        await touchPostgresMembership(tx, workspaceId, resumeId, now);
        await setPostgresWorkspaceCurrentResume(tx, workspaceId, resumeId, now);
        return buildPostgresStudioPayload(tx, workspaceId, resumeId);
      });
    },

    async switchCurrentResume({ resumeId, workspaceId }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const now = new Date();

      return sql.begin(async (tx) => {
        const resume = await getWorkspaceResumeRow(tx, workspaceId, resumeId);

        if (!resume) {
          return null;
        }

        await touchPostgresMembership(tx, workspaceId, resumeId, now);
        await setPostgresWorkspaceCurrentResume(tx, workspaceId, resumeId, now);
        return buildPostgresStudioPayload(tx, workspaceId, resumeId);
      });
    },

    async validateEditLink({ resumeId, token }) {
      const sql = getPostgresClient();
      await ensureSchema(sql);
      const resume = await getResumeRowById(sql, resumeId);

      if (!resume || !isTokenValidForResume(resume, token)) {
        return null;
      }

      return toEditorRecord(resume);
    },
  };
}

function mapHostedResumeStoreError(error: unknown) {
  if (
    error instanceof HostedResumeStoreUnavailableError ||
    error instanceof HostedResumeStoreConnectionError
  ) {
    return error;
  }

  if (isSupabaseDirectUrlDnsError(error)) {
    return new HostedResumeStoreConnectionError(
      "The configured Supabase DATABASE_URL uses the direct db host, which is IPv6-only and fails on Vercel. Replace DATABASE_URL with Supabase's pooler connection string.",
    );
  }

  if (isDatabaseDnsError(error)) {
    return new HostedResumeStoreConnectionError(
      "Hosted resume storage could not resolve its database host. Check DATABASE_URL.",
    );
  }

  return error;
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

async function ensureSchema(sql: SqlClient) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
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
        alter table resumes
        add column if not exists title_is_custom boolean not null default false
      `;

      await sql`
        alter table resumes
        add column if not exists template_key text not null default 'engineer'
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

      await sql`
        create index if not exists resumes_slug_lower_idx
        on resumes(lower(slug))
      `;

      await sql`
        create index if not exists workspace_resume_memberships_lookup_idx
        on workspace_resume_memberships(workspace_id, deleted_at, last_opened_at desc)
      `;

      await sql`
        create index if not exists workspace_resume_memberships_resume_idx
        on workspace_resume_memberships(resume_id)
      `;
    })();
  }

  await schemaReadyPromise;
}

function getLocalStorePath() {
  return process.env.HOSTED_RESUME_LOCAL_STORE_PATH;
}

async function readLocalStore(): Promise<LocalStoreShape> {
  try {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(await resolveLocalStorePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalStoreShape> & {
      resumes?: Array<Record<string, unknown>>;
    };

    return {
      memberships: Array.isArray(parsed.memberships)
        ? parsed.memberships.filter(isLocalStoredMembership)
        : [],
      resumes: Array.isArray(parsed.resumes)
        ? parsed.resumes
          .map(normalizeLocalStoredResume)
          .filter((value): value is LocalStoredResume => value !== null)
        : [],
      workspaces: Array.isArray(parsed.workspaces)
        ? parsed.workspaces.filter(isLocalStoredWorkspace)
        : [],
    };
  } catch {
    return {
      memberships: [],
      resumes: [],
      workspaces: [],
    };
  }
}

async function writeLocalStore(store: LocalStoreShape) {
  const [{ dirname }, { mkdir, writeFile }] = await Promise.all([
    import("node:path"),
    import("node:fs/promises"),
  ]);
  const localStorePath = await resolveLocalStorePath();

  await mkdir(dirname(localStorePath), { recursive: true });
  await writeFile(localStorePath, JSON.stringify(store, null, 2));
}

function ensureLocalWorkspace(store: LocalStoreShape, workspaceId?: string | null) {
  const existing = workspaceId
    ? store.workspaces.find((workspace) => workspace.id === workspaceId)
    : null;

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const workspace: LocalStoredWorkspace = {
    createdAt: now,
    currentResumeId: null,
    id: workspaceId ?? randomUUID(),
    updatedAt: now,
  };

  store.workspaces.push(workspace);
  return workspace;
}

function createLocalResumeRecord(
  store: LocalStoreShape,
  input: {
    markdown: string;
    templateKey: TemplateKey;
    title?: string;
    titleIsCustom?: boolean;
    updatedAt?: string;
  },
): LocalStoredResume {
  const normalizedMarkdown = normalizeCvMarkdown(input.markdown);
  const derivedTitle = deriveResumeTitle(normalizedMarkdown);
  const now = new Date().toISOString();
  const slug = createUniqueLocalResumeSlug(store.resumes);

  return {
    createdAt: now,
    editorTokenHash: hashToken(createLegacyEditorToken()),
    fitScale: 1,
    id: randomUUID(),
    isPublished: false,
    markdown: normalizedMarkdown,
    publishedAt: null,
    publishedFitScale: null,
    publishedMarkdown: null,
    slug,
    templateKey: input.templateKey,
    title: input.title ?? derivedTitle,
    titleIsCustom: input.titleIsCustom ?? false,
    updatedAt: input.updatedAt ?? now,
  };
}

function attachLocalMembership(
  store: LocalStoreShape,
  workspaceId: string,
  resumeId: string,
  attachedVia: AttachedVia,
  timestamp: string,
) {
  const existing = store.memberships.find((membership) =>
    membership.workspaceId === workspaceId && membership.resumeId === resumeId
  );

  if (existing) {
    existing.attachedVia = attachedVia;
    existing.deletedAt = null;
    existing.lastOpenedAt = timestamp;
    existing.updatedAt = timestamp;
    return existing;
  }

  const membership: LocalStoredMembership = {
    attachedVia,
    createdAt: timestamp,
    deletedAt: null,
    lastOpenedAt: timestamp,
    resumeId,
    updatedAt: timestamp,
    workspaceId,
  };

  store.memberships.push(membership);
  return membership;
}

function touchLocalMembership(membership: LocalStoredMembership, timestamp: string) {
  membership.lastOpenedAt = timestamp;
  membership.updatedAt = timestamp;
}

function setWorkspaceCurrentResume(
  store: LocalStoreShape,
  workspaceId: string,
  resumeId: string | null,
  timestamp: string,
) {
  const workspace = store.workspaces.find((candidate) => candidate.id === workspaceId);

  if (!workspace) {
    return;
  }

  workspace.currentResumeId = resumeId;
  workspace.updatedAt = timestamp;
}

function buildLocalWorkspacePayload(
  store: LocalStoreShape,
  workspaceId: string,
  includeInvalidCurrent = true,
): WorkspacePayload | null {
  const workspace = store.workspaces.find((candidate) => candidate.id === workspaceId);

  if (!workspace) {
    return null;
  }

  const memberships = store.memberships
    .filter((membership) => membership.workspaceId === workspaceId && !membership.deletedAt)
    .sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt));

  const resumes = memberships
    .map((membership) => {
      const resume = store.resumes.find((candidate) => candidate.id === membership.resumeId);
      return resume ? toWorkspaceResumeSummary(resume) : null;
    })
    .filter((value): value is WorkspaceResumeSummary => value !== null);

  const currentResumeId = resumes.some((resume) => resume.id === workspace?.currentResumeId)
    ? workspace?.currentResumeId ?? null
    : resumes[0]?.id ?? (includeInvalidCurrent ? workspace?.currentResumeId ?? null : null);

  return {
    currentResumeId,
    resumes,
    workspaceId,
  };
}

function buildLocalStudioPayload(
  store: LocalStoreShape,
  workspaceId: string,
  resumeId: string,
): StudioBootstrapPayload | null {
  const membership = findActiveLocalMembership(store, workspaceId, resumeId);
  const resume = membership
    ? store.resumes.find((candidate) => candidate.id === membership.resumeId) ?? null
    : null;

  if (!resume) {
    return null;
  }

  return {
    editorPath: buildEditorPath(resume.id),
    publicPath: `/${resume.slug}`,
    resume: toEditorRecord(resume),
    workspace: buildLocalWorkspacePayload(store, workspaceId)!,
  };
}

function findActiveLocalMembership(store: LocalStoreShape, workspaceId: string, resumeId: string) {
  return store.memberships.find((membership) =>
    membership.workspaceId === workspaceId &&
    membership.resumeId === resumeId &&
    membership.deletedAt === null
  ) ?? null;
}

function findNextLocalResumeId(store: LocalStoreShape, workspaceId: string) {
  return store.memberships
    .filter((membership) => membership.workspaceId === workspaceId && membership.deletedAt === null)
    .sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt))[0]?.resumeId ?? null;
}

function findDuplicateLocalResume(
  store: LocalStoreShape,
  workspaceId: string,
  title: string,
  markdown: string,
) {
  const contentHash = hashToken(markdown);

  return store.memberships
    .filter((membership) => membership.workspaceId === workspaceId && membership.deletedAt === null)
    .map((membership) => store.resumes.find((resume) => resume.id === membership.resumeId) ?? null)
    .find((resume) => resume && resume.title === title && hashToken(resume.markdown) === contentHash) ?? null;
}

async function getResumeRowById(sql: SqlClient, resumeId: string) {
  const [row] = await sql<ResumeRow[]>`
    select *
    from resumes
    where id = ${resumeId}
    limit 1
  `;

  return row ?? null;
}

async function getWorkspaceRowById(sql: SqlClient, workspaceId: string) {
  const [row] = await sql<WorkspaceRow[]>`
    select *
    from workspaces
    where id = ${workspaceId}
    limit 1
  `;

  return row ?? null;
}

async function ensurePostgresWorkspace(sql: SqlClient, workspaceId: string | null | undefined, timestamp: Date) {
  const existing = workspaceId ? await getWorkspaceRowById(sql, workspaceId) : null;

  if (existing) {
    return existing;
  }

  const id = workspaceId ?? randomUUID();
  const [workspace] = await sql<WorkspaceRow[]>`
    insert into workspaces (id, current_resume_id, created_at, updated_at)
    values (${id}, ${null}, ${timestamp}, ${timestamp})
    returning *
  `;

  return workspace;
}

async function createPostgresResume(
  sql: SqlClient,
  input: {
    markdown: string;
    templateKey: TemplateKey;
    title?: string;
    titleIsCustom?: boolean;
    updatedAt?: string;
  },
) {
  const normalizedMarkdown = normalizeCvMarkdown(input.markdown);
  const derivedTitle = deriveResumeTitle(normalizedMarkdown);
  const title = input.title ?? derivedTitle;
  const titleIsCustom = input.titleIsCustom ?? false;
  const id = randomUUID();
  const slug = await createUniqueSlugInPostgres(sql);
  const now = input.updatedAt ? new Date(input.updatedAt) : new Date();

  await sql`
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
      created_at,
      updated_at,
      published_at
    ) values (
      ${id},
      ${slug},
      ${title},
      ${titleIsCustom},
      ${normalizedMarkdown},
      1,
      ${null},
      ${null},
      false,
      ${hashToken(createLegacyEditorToken())},
      ${input.templateKey},
      ${now},
      ${now},
      ${null}
    )
  `;

  return id;
}

async function upsertWorkspaceMembership(
  sql: SqlClient,
  input: {
    attachedVia: AttachedVia;
    resumeId: string;
    timestamp: Date;
    workspaceId: string;
  },
) {
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

async function touchPostgresMembership(
  sql: SqlClient,
  workspaceId: string,
  resumeId: string,
  timestamp: Date,
) {
  await sql`
    update workspace_resume_memberships
    set
      last_opened_at = ${timestamp},
      updated_at = ${timestamp}
    where workspace_id = ${workspaceId}
      and resume_id = ${resumeId}
      and deleted_at is null
  `;
}

async function setPostgresWorkspaceCurrentResume(
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

async function resolveCurrentPostgresResumeId(sql: SqlClient, workspaceId: string) {
  const workspace = await getWorkspaceRowById(sql, workspaceId);
  const activeResumeIds = await sql<{ resume_id: string }[]>`
    select resume_id
    from workspace_resume_memberships
    where workspace_id = ${workspaceId}
      and deleted_at is null
    order by last_opened_at desc
  `;

  if (activeResumeIds.some((row) => row.resume_id === workspace?.current_resume_id)) {
    return workspace?.current_resume_id ?? null;
  }

  return activeResumeIds[0]?.resume_id ?? null;
}

async function buildPostgresWorkspacePayload(sql: SqlClient, workspaceId: string) {
  const workspace = await getWorkspaceRowById(sql, workspaceId);

  if (!workspace) {
    return null;
  }

  const resumes = await sql<WorkspaceSummaryRow[]>`
    select
      r.id,
      r.title,
      r.slug,
      r.is_published,
      r.updated_at,
      r.published_at,
      r.template_key
    from workspace_resume_memberships m
    join resumes r on r.id = m.resume_id
    where m.workspace_id = ${workspaceId}
      and m.deleted_at is null
    order by m.last_opened_at desc, r.updated_at desc
  `;

  const currentResumeId = resumes.some((resume) => resume.id === workspace.current_resume_id)
    ? workspace.current_resume_id
    : resumes[0]?.id ?? null;

  return {
    currentResumeId,
    resumes: resumes.map(toWorkspaceResumeSummary),
    workspaceId,
  };
}

async function buildPostgresStudioPayload(
  sql: SqlClient,
  workspaceId: string,
  resumeId: string,
): Promise<StudioBootstrapPayload | null> {
  const [resume] = await sql<ResumeRow[]>`
    select r.*
    from workspace_resume_memberships m
    join resumes r on r.id = m.resume_id
    where m.workspace_id = ${workspaceId}
      and m.resume_id = ${resumeId}
      and m.deleted_at is null
    limit 1
  `;

  if (!resume) {
    return null;
  }

  const workspace = await buildPostgresWorkspacePayload(sql, workspaceId);

  if (!workspace) {
    return null;
  }

  return {
    editorPath: buildEditorPath(resume.id),
    publicPath: `/${resume.slug}`,
    resume: toEditorRecord(resume),
    workspace,
  };
}

async function getWorkspaceResumeRow(sql: SqlClient, workspaceId: string, resumeId: string) {
  const [row] = await sql<ResumeRow[]>`
    select r.*
    from workspace_resume_memberships m
    join resumes r on r.id = m.resume_id
    where m.workspace_id = ${workspaceId}
      and m.resume_id = ${resumeId}
      and m.deleted_at is null
    limit 1
  `;

  return row ?? null;
}

async function findNextPostgresResumeId(sql: SqlClient, workspaceId: string) {
  const [row] = await sql<{ resume_id: string }[]>`
    select resume_id
    from workspace_resume_memberships
    where workspace_id = ${workspaceId}
      and deleted_at is null
    order by last_opened_at desc
    limit 1
  `;

  return row?.resume_id ?? null;
}

async function findDuplicatePostgresResume(
  sql: SqlClient,
  workspaceId: string,
  title: string,
  markdown: string,
) {
  const rows = await sql<ResumeRow[]>`
    select r.*
    from workspace_resume_memberships m
    join resumes r on r.id = m.resume_id
    where m.workspace_id = ${workspaceId}
      and m.deleted_at is null
      and r.title = ${title}
  `;

  return rows.find((row) => hashToken(row.markdown) === hashToken(markdown)) ?? null;
}

async function createUniqueSlugInPostgres(sql: SqlClient) {
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

function applyResumeMarkdownUpdate(
  resume: LocalStoredResume,
  markdown: string,
  fitScale: number,
  timestamp: string,
) {
  const normalizedMarkdown = normalizeCvMarkdown(markdown);
  resume.markdown = normalizedMarkdown;
  resume.fitScale = fitScale;
  resume.updatedAt = timestamp;

  if (!resume.titleIsCustom) {
    resume.title = deriveResumeTitle(normalizedMarkdown);
  }
}

function resolveImportedTitle(name: string, markdown: string) {
  const trimmedName = name.trim();
  const derivedTitle = deriveResumeTitle(markdown);

  if (!trimmedName || trimmedName === derivedTitle) {
    return {
      title: derivedTitle,
      titleIsCustom: false,
    };
  }

  return {
    title: trimmedName,
    titleIsCustom: true,
  };
}

function deriveResumeTitle(markdown: string) {
  return parseCvMarkdown(normalizeCvMarkdown(markdown)).name || "Untitled Resume";
}

function guessTemplateKeyFromMarkdown(markdown: string): TemplateKey {
  const document = parseCvMarkdown(markdown);
  const headline = `${document.headline} ${document.sections.map((section) => section.title).join(" ")}`.toLowerCase();

  if (headline.includes("design")) {
    return "designer";
  }

  if (headline.includes("sales") || headline.includes("account executive") || headline.includes("revenue")) {
    return "sales";
  }

  if (headline.includes("founder") || headline.includes("ceo")) {
    return "founder";
  }

  return "engineer";
}

function normalizeTimestamp(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toISOString();
}

async function resolveLocalStorePath() {
  const explicitPath = getLocalStorePath();

  if (explicitPath) {
    return explicitPath;
  }

  const { join } = await import("node:path");
  return join(/*turbopackIgnore: true*/ process.cwd(), ".data", "hosted-resumes.json");
}

function createUniqueLocalResumeSlug(resumes: LocalStoredResume[]) {
  const existingSlugs = new Set(resumes.map((resume) => normalizeSlugForComparison(resume.slug)));
  let latestCandidate = createFriendlyResumeSlug();

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = attempt === 0 ? latestCandidate : createFriendlyResumeSlug();
    latestCandidate = candidate;

    if (!existingSlugs.has(normalizeSlugForComparison(candidate))) {
      return candidate;
    }
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = createFriendlyResumeSlugFallback(latestCandidate);

    if (!existingSlugs.has(normalizeSlugForComparison(candidate))) {
      return candidate;
    }
  }

  return createFriendlyResumeSlugFallback(latestCandidate);
}

function isTokenValidForResume(resume: LocalStoredResume | ResumeRow, token: string) {
  return isEditorAccessTokenValid({
    legacyTokenHash: "editorTokenHash" in resume ? resume.editorTokenHash : resume.editor_token_hash,
    resumeId: resume.id,
    token,
  });
}

function toEditorRecord(resume: LocalStoredResume | ResumeRow): HostedResumeEditorRecord {
  return {
    createdAt: formatTimestamp("createdAt" in resume ? resume.createdAt : resume.created_at),
    fitScale: "fitScale" in resume ? resume.fitScale : resume.fit_scale,
    id: resume.id,
    isPublished: "isPublished" in resume ? resume.isPublished : resume.is_published,
    markdown: resume.markdown,
    publishedAt: getNullableTimestamp("publishedAt" in resume ? resume.publishedAt : resume.published_at),
    slug: resume.slug,
    templateKey: "templateKey" in resume ? resume.templateKey : resume.template_key,
    title: resume.title,
    updatedAt: formatTimestamp("updatedAt" in resume ? resume.updatedAt : resume.updated_at),
  };
}

function toPublicRecord(resume: LocalStoredResume | ResumeRow): HostedResumePublicRecord {
  return {
    createdAt: formatTimestamp("createdAt" in resume ? resume.createdAt : resume.created_at),
    fitScale: "publishedFitScale" in resume
      ? resume.publishedFitScale ?? resume.fitScale
      : resume.published_fit_scale ?? resume.fit_scale,
    id: resume.id,
    isPublished: "isPublished" in resume ? resume.isPublished : resume.is_published,
    markdown: "publishedMarkdown" in resume
      ? resume.publishedMarkdown ?? resume.markdown
      : resume.published_markdown ?? resume.markdown,
    publishedAt: getNullableTimestamp("publishedAt" in resume ? resume.publishedAt : resume.published_at),
    slug: resume.slug,
    templateKey: "templateKey" in resume ? resume.templateKey : resume.template_key,
    title: resume.title,
    updatedAt: formatTimestamp("updatedAt" in resume ? resume.updatedAt : resume.updated_at),
  };
}

function toWorkspaceResumeSummary(resume: LocalStoredResume | WorkspaceSummaryRow) {
  return {
    id: resume.id,
    isPublished: "isPublished" in resume ? resume.isPublished : resume.is_published,
    publishedAt: getNullableTimestamp("publishedAt" in resume ? resume.publishedAt : resume.published_at),
    slug: resume.slug,
    templateKey: "templateKey" in resume ? resume.templateKey : resume.template_key,
    title: resume.title,
    updatedAt: formatTimestamp("updatedAt" in resume ? resume.updatedAt : resume.updated_at),
  };
}

function isDatabaseDnsError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOTFOUND"
  );
}

function isSupabaseDirectUrlDnsError(error: unknown) {
  return (
    isDatabaseDnsError(error) &&
    typeof error === "object" &&
    error !== null &&
    "hostname" in error &&
    typeof (error as { hostname?: unknown }).hostname === "string" &&
    /^db\..+\.supabase\.co$/i.test((error as { hostname: string }).hostname)
  );
}

function normalizeLocalStoredResume(value: Record<string, unknown>): LocalStoredResume | null {
  if (
    typeof value.createdAt !== "string" ||
    typeof value.editorTokenHash !== "string" ||
    typeof value.fitScale !== "number" ||
    typeof value.id !== "string" ||
    typeof value.isPublished !== "boolean" ||
    typeof value.markdown !== "string" ||
    (typeof value.publishedAt !== "string" && value.publishedAt !== null) ||
    (typeof value.publishedFitScale !== "number" && value.publishedFitScale !== null) ||
    (typeof value.publishedMarkdown !== "string" && value.publishedMarkdown !== null) ||
    typeof value.slug !== "string" ||
    typeof value.title !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    createdAt: value.createdAt,
    editorTokenHash: value.editorTokenHash,
    fitScale: value.fitScale,
    id: value.id,
    isPublished: value.isPublished,
    markdown: value.markdown,
    publishedAt: value.publishedAt,
    publishedFitScale: value.publishedFitScale,
    publishedMarkdown: value.publishedMarkdown,
    slug: value.slug,
    templateKey: isTemplateKey(value.templateKey) ? value.templateKey : "engineer",
    title: value.title,
    titleIsCustom: typeof value.titleIsCustom === "boolean" ? value.titleIsCustom : false,
    updatedAt: value.updatedAt,
  };
}

function isLocalStoredWorkspace(value: unknown): value is LocalStoredWorkspace {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LocalStoredWorkspace).createdAt === "string" &&
    (typeof (value as LocalStoredWorkspace).currentResumeId === "string" ||
      (value as LocalStoredWorkspace).currentResumeId === null) &&
    typeof (value as LocalStoredWorkspace).id === "string" &&
    typeof (value as LocalStoredWorkspace).updatedAt === "string"
  );
}

function isLocalStoredMembership(value: unknown): value is LocalStoredMembership {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LocalStoredMembership).attachedVia === "string" &&
    typeof (value as LocalStoredMembership).createdAt === "string" &&
    (typeof (value as LocalStoredMembership).deletedAt === "string" ||
      (value as LocalStoredMembership).deletedAt === null) &&
    typeof (value as LocalStoredMembership).lastOpenedAt === "string" &&
    typeof (value as LocalStoredMembership).resumeId === "string" &&
    typeof (value as LocalStoredMembership).updatedAt === "string" &&
    typeof (value as LocalStoredMembership).workspaceId === "string"
  );
}

function isTemplateKey(value: unknown): value is TemplateKey {
  return value === "engineer" || value === "designer" || value === "sales" || value === "founder";
}

function formatTimestamp(value: Date | string | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return new Date(value).toISOString();
}

function getNullableTimestamp(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

type ResumeRow = {
  created_at: Date | string;
  editor_token_hash: string;
  fit_scale: number;
  id: string;
  is_published: boolean;
  markdown: string;
  published_at: Date | string | null;
  published_fit_scale: number | null;
  published_markdown: string | null;
  slug: string;
  template_key: TemplateKey;
  title: string;
  title_is_custom: boolean;
  updated_at: Date | string;
};

type WorkspaceRow = {
  created_at: Date | string;
  current_resume_id: string | null;
  id: string;
  updated_at: Date | string;
};

type WorkspaceMembershipRow = {
  attached_via: string;
  created_at: Date | string;
  deleted_at: Date | string | null;
  last_opened_at: Date | string;
  resume_id: string;
  updated_at: Date | string;
  workspace_id: string;
};

type WorkspaceSummaryRow = {
  id: string;
  is_published: boolean;
  published_at: Date | string | null;
  slug: string;
  template_key: TemplateKey;
  title: string;
  updated_at: Date | string;
};
