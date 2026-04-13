import { DEFAULT_CV_MARKDOWN, normalizeCvMarkdown } from "@/app/_lib/cv-markdown";
import type { HostedResumeEditorRecord } from "@/app/_lib/hosted-resume-types";

export const DRAFTS_STORAGE_KEY = "cv-studio:drafts";
export const LEGACY_MARKDOWN_STORAGE_KEY = "cv-studio:markdown";
export const DRAFTS_STORAGE_VERSION = 2;

export type ResumeDraft = {
  editorToken?: string;
  id: string;
  isPublished?: boolean;
  markdown: string;
  name: string;
  publishedAt?: string | null;
  remoteFitScale?: number;
  remoteResumeId?: string;
  remoteSlug?: string;
  updatedAt: string;
};

export type ResumeDraftStore = {
  activeDraftId: string;
  drafts: ResumeDraft[];
  version: number;
};

export function createDefaultDraft(markdown = DEFAULT_CV_MARKDOWN): ResumeDraft {
  return {
    id: createDraftId(),
    markdown: normalizeCvMarkdown(markdown),
    name: "Primary CV",
    updatedAt: new Date().toISOString(),
  };
}

export function loadDraftStore(storage: Storage): ResumeDraftStore {
  const rawStore = storage.getItem(DRAFTS_STORAGE_KEY);

  if (rawStore) {
    try {
      const parsed = JSON.parse(rawStore) as Partial<ResumeDraftStore>;
      const drafts = Array.isArray(parsed.drafts)
        ? parsed.drafts.filter(isValidDraft).map((draft) => ({
            ...draft,
            markdown: normalizeCvMarkdown(draft.markdown),
          }))
        : [];

      if (drafts.length > 0) {
        const activeDraftId = drafts.some((draft) => draft.id === parsed.activeDraftId)
          ? parsed.activeDraftId!
          : drafts[0]!.id;

        return {
          activeDraftId,
          drafts,
          version: DRAFTS_STORAGE_VERSION,
        };
      }
    } catch {
      // Ignore malformed local data and fall back.
    }
  }

  const legacyMarkdown = storage.getItem(LEGACY_MARKDOWN_STORAGE_KEY);
  const draft = createDefaultDraft(legacyMarkdown || DEFAULT_CV_MARKDOWN);

  return {
    activeDraftId: draft.id,
    drafts: [draft],
    version: DRAFTS_STORAGE_VERSION,
  };
}

export function saveDraftStore(storage: Storage, store: ResumeDraftStore) {
  storage.setItem(
    DRAFTS_STORAGE_KEY,
    JSON.stringify({
      ...store,
      version: DRAFTS_STORAGE_VERSION,
    }),
  );
  storage.setItem(
    LEGACY_MARKDOWN_STORAGE_KEY,
    getActiveDraft(store)?.markdown ?? DEFAULT_CV_MARKDOWN,
  );
}

export function updateDraftMarkdown(
  store: ResumeDraftStore,
  draftId: string,
  markdown: string,
  timestamp: string,
): ResumeDraftStore {
  return {
    ...store,
    drafts: store.drafts.map((draft) =>
      draft.id === draftId
        ? { ...draft, markdown: normalizeCvMarkdown(markdown), updatedAt: timestamp }
        : draft,
    ),
  };
}

export function renameDraft(
  store: ResumeDraftStore,
  draftId: string,
  name: string,
): ResumeDraftStore {
  return {
    ...store,
    drafts: store.drafts.map((draft) =>
      draft.id === draftId ? { ...draft, name } : draft,
    ),
  };
}

export function addDraft(
  store: ResumeDraftStore,
  draft: ResumeDraft,
): ResumeDraftStore {
  return {
    activeDraftId: draft.id,
    drafts: [...store.drafts, draft],
    version: DRAFTS_STORAGE_VERSION,
  };
}

export function getActiveDraft(store: ResumeDraftStore) {
  return (
    store.drafts.find((draft) => draft.id === store.activeDraftId) ??
    store.drafts[0] ??
    null
  );
}

export function createNamedDraft(name: string, markdown: string): ResumeDraft {
  return {
    id: createDraftId(),
    markdown: normalizeCvMarkdown(markdown),
    name,
    updatedAt: new Date().toISOString(),
  };
}

export function formatSavedAt(timestamp: string | null) {
  if (!timestamp) {
    return "Not saved yet";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Saved locally";
  }

  return `Saved ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function attachHostedResume(
  store: ResumeDraftStore,
  draftId: string,
  resume: HostedResumeEditorRecord,
): ResumeDraftStore {
  return {
    ...store,
    drafts: store.drafts.map((draft) =>
      draft.id === draftId
        ? {
            ...draft,
            editorToken: resume.editorToken,
            isPublished: resume.isPublished,
            markdown: normalizeCvMarkdown(resume.markdown),
            name: resume.title,
            publishedAt: resume.publishedAt,
            remoteFitScale: resume.fitScale,
            remoteResumeId: resume.id,
            remoteSlug: resume.slug,
            updatedAt: resume.updatedAt,
          }
        : draft,
    ),
  };
}

export function upsertHostedDraft(
  store: ResumeDraftStore,
  resume: HostedResumeEditorRecord,
): ResumeDraftStore {
  const existingDraft = store.drafts.find((draft) => draft.remoteResumeId === resume.id);

  if (existingDraft) {
    return {
      ...attachHostedResume(store, existingDraft.id, resume),
      activeDraftId: existingDraft.id,
    };
  }

  const newDraft: ResumeDraft = {
    editorToken: resume.editorToken,
    id: createDraftId(),
    isPublished: resume.isPublished,
    markdown: normalizeCvMarkdown(resume.markdown),
    name: resume.title,
    publishedAt: resume.publishedAt,
    remoteFitScale: resume.fitScale,
    remoteResumeId: resume.id,
    remoteSlug: resume.slug,
    updatedAt: resume.updatedAt,
  };

  return {
    activeDraftId: newDraft.id,
    drafts: [...store.drafts, newDraft],
    version: DRAFTS_STORAGE_VERSION,
  };
}

export function slugifyDraftName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "cv-draft";
}

function createDraftId() {
  return `draft-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidDraft(value: unknown): value is ResumeDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<ResumeDraft>;
  return (
    (typeof draft.editorToken === "string" || draft.editorToken === undefined) &&
    typeof draft.id === "string" &&
    (typeof draft.isPublished === "boolean" || draft.isPublished === undefined) &&
    typeof draft.markdown === "string" &&
    typeof draft.name === "string" &&
    (typeof draft.publishedAt === "string" ||
      draft.publishedAt === null ||
      draft.publishedAt === undefined) &&
    (typeof draft.remoteFitScale === "number" || draft.remoteFitScale === undefined) &&
    (typeof draft.remoteResumeId === "string" || draft.remoteResumeId === undefined) &&
    (typeof draft.remoteSlug === "string" || draft.remoteSlug === undefined) &&
    typeof draft.updatedAt === "string"
  );
}
