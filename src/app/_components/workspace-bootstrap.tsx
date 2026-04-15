"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResumeTemplateChooser } from "@/app/_components/resume-template-chooser";
import {
  DRAFTS_STORAGE_KEY,
  LEGACY_MARKDOWN_STORAGE_KEY,
} from "@/app/_lib/cv-drafts";
import type { LegacyResumeDraftInput } from "@/app/_lib/hosted-resume-store";
import type { HostedResumeResponse, TemplateKey } from "@/app/_lib/hosted-resume-types";

const LEGACY_IMPORT_MARKER = "tinycv:legacy-imported";

export function WorkspaceBootstrap({
  allowLegacyImport,
}: {
  allowLegacyImport: boolean;
}) {
  const router = useRouter();
  const [busyTemplateKey, setBusyTemplateKey] = useState<TemplateKey | null>(null);
  const [message, setMessage] = useState<string | null>(allowLegacyImport ? "Checking for existing local drafts..." : null);

  useEffect(() => {
    if (!allowLegacyImport) {
      return;
    }

    if (window.localStorage.getItem(LEGACY_IMPORT_MARKER) === "true") {
      setMessage(null);
      return;
    }

    const legacyDrafts = readLegacyDrafts();

    if (!legacyDrafts || legacyDrafts.drafts.length === 0) {
      setMessage(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/workspace/import-legacy", {
          body: JSON.stringify(legacyDrafts),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const payload = await response.json() as {
          currentResumeId?: string | null;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to import your existing drafts.");
        }

        window.localStorage.setItem(LEGACY_IMPORT_MARKER, "true");
        window.localStorage.removeItem(DRAFTS_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_MARKDOWN_STORAGE_KEY);

        if (!cancelled && payload.currentResumeId) {
          router.replace(`/studio/${payload.currentResumeId}`);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Unable to import your existing drafts.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allowLegacyImport, router]);

  const createFromTemplate = async (templateKey: TemplateKey) => {
    setBusyTemplateKey(templateKey);
    setMessage(null);

    try {
      const response = await fetch("/api/workspace/bootstrap", {
        body: JSON.stringify({ templateKey }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json() as HostedResumeResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create a new resume.");
      }

      router.replace(`/studio/${payload.resume.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create a new resume.");
      setBusyTemplateKey(null);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f4efe8_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-black/8 bg-white/88 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="mb-6 text-center sm:text-left">
            <h1 className="text-[1rem] leading-none font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
              TINY CV
            </h1>
          </div>

          <ResumeTemplateChooser
            busyTemplateKey={busyTemplateKey}
            eyebrow={null}
            onSelect={createFromTemplate}
            subtitle="Choose a strong starting point. You can rewrite the content and restyle everything after."
            title="Choose your first resume template."
          />

          {message ? (
            <p className="mt-5 text-[0.92rem] leading-6 text-slate-500">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function readLegacyDrafts():
  | {
      activeDraftName: string | null;
      drafts: LegacyResumeDraftInput[];
    }
  | null {
  try {
    const rawStore = window.localStorage.getItem(DRAFTS_STORAGE_KEY);

    if (rawStore) {
      const parsed = JSON.parse(rawStore) as {
        activeDraftId?: unknown;
        drafts?: unknown;
      };
      const drafts = Array.isArray(parsed.drafts)
        ? parsed.drafts
          .filter((draft): draft is Record<string, unknown> => typeof draft === "object" && draft !== null)
          .map((draft) => ({
            editorToken: typeof draft.editorToken === "string" ? draft.editorToken : undefined,
            markdown: typeof draft.markdown === "string" ? draft.markdown : "",
            name: typeof draft.name === "string" ? draft.name : "Imported CV",
            remoteResumeId: typeof draft.remoteResumeId === "string" ? draft.remoteResumeId : undefined,
            updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : new Date().toISOString(),
          }))
          .filter((draft) => draft.markdown.trim().length > 0)
        : [];

      if (drafts.length > 0) {
        const activeDraft = Array.isArray(parsed.drafts)
          ? parsed.drafts.find((draft) =>
            typeof draft === "object" &&
            draft !== null &&
            typeof (draft as { id?: unknown }).id === "string" &&
            (draft as { id: string }).id === parsed.activeDraftId,
          ) as { name?: string } | undefined
          : undefined;

        return {
          activeDraftName: typeof activeDraft?.name === "string" ? activeDraft.name : drafts[0]?.name ?? null,
          drafts,
        };
      }
    }

    const legacyMarkdown = window.localStorage.getItem(LEGACY_MARKDOWN_STORAGE_KEY);

    if (legacyMarkdown?.trim()) {
      return {
        activeDraftName: "Primary CV",
        drafts: [
          {
            markdown: legacyMarkdown,
            name: "Primary CV",
            updatedAt: new Date().toISOString(),
          },
        ],
      };
    }
  } catch {
    return null;
  }

  return null;
}
