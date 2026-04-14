"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loadDraftStore } from "@/app/_lib/cv-drafts";

export function PublicResumeFooterActions({
  slug,
}: {
  slug: string;
}) {
  const getEditorHref = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const store = loadDraftStore(window.localStorage);
      const matchingDraft = store.drafts.find((draft) =>
        draft.remoteSlug === slug &&
        draft.remoteResumeId &&
        draft.editorToken,
      );

      if (!matchingDraft?.remoteResumeId || !matchingDraft.editorToken) {
        return null;
      }

      return `/studio/${matchingDraft.remoteResumeId}?token=${encodeURIComponent(matchingDraft.editorToken)}`;
    } catch {
      return null;
    }
  }, [slug]);

  const [editorHref, setEditorHref] = useState<string | null>(() => getEditorHref());

  useEffect(() => {
    const syncFromStorage = () => {
      setEditorHref(getEditorHref());
    };

    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [getEditorHref]);

  return (
    <footer className="app-chrome mt-6 flex flex-col items-center justify-center gap-2 pb-2 text-center lg:mt-8 lg:pb-0 print:hidden">
      <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Published with CV Studio
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.92rem] font-medium text-slate-600">
        <button
          className="underline-offset-4 transition hover:text-slate-950 hover:underline"
          onClick={() => window.print()}
          type="button"
        >
          Download PDF
        </button>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <Link
          className="underline-offset-4 transition hover:text-slate-950 hover:underline"
          href={editorHref ?? "/"}
        >
          {editorHref ? "Continue editing" : "Create your own"}
        </Link>
      </div>
    </footer>
  );
}
