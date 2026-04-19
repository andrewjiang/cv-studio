"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type CSSProperties,
  type RefObject,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ResumeTemplateChooser } from "@/app/_components/resume-template-chooser";
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  DesktopIcon,
  DownloadIcon,
  iconActionButtonClass,
  MenuIcon,
  MenuSection,
  menuButtonClass,
  MobileIcon,
  modeButtonClass,
  primaryActionButtonClass,
  ShareIcon,
  SpinnerIcon,
  StylePreferenceControls,
  textActionLinkClass,
  TuneIcon,
} from "@/app/_components/cv-studio-ui";
import {
  ResumeDocumentContent,
  ResumePreview,
  fontFamilyForChoice,
  getPaperCompression,
} from "@/app/_components/resume-content";
import {
  AGGRESSIVE_CV_SCALE_LIMITS,
  CV_SCALE_LIMITS,
  estimateResumeScale,
  getPageMetrics,
  readMeasuredTextStyle,
  type CvScaleLimits,
  type CvTypography,
} from "@/app/_lib/cv-fit";
import {
  composeCvFrontmatter,
  composeCvMarkdown,
  DEFAULT_RESUME_STYLE,
  parseCvMarkdown,
  resolveMobileResumeTypography,
  resolveResumeStylePresetDefaults,
  resolveResumeTypography,
  splitCvMarkdown,
  type ResumePageSize,
  type ResumeStylePrefs,
  type ResumeStylePreset,
} from "@/app/_lib/cv-markdown";
import { getResumeTemplate } from "@/app/_lib/resume-templates";
import type {
  HostedResumeEditorRecord,
  HostedResumeResponse,
  TemplateKey,
  WorkspacePayload,
} from "@/app/_lib/hosted-resume-types";

type StudioMode = "edit" | "preview" | "publish";
type MobilePreviewVariant = "mobile" | "desktop";

type RemoteSyncState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "publishing" }
  | { kind: "saving" };

type StudioNotice =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

type FitAdjustmentPreference = {
  disableAutoLegal: boolean;
  disableAutoMargin: boolean;
};

type FitInterventionNotice =
  | { kind: "margin"; from: number; to: number }
  | { kind: "legal"; from: ResumePageSize; to: ResumePageSize };

const AUTO_FIT_PREFS_STORAGE_KEY = "tinycv:auto-fit-preferences";
const AUTO_MARGIN_THRESHOLD = 0.84;
const AUTO_LEGAL_THRESHOLD = 0.72;
const CUT_CONTENT_THRESHOLD = 0.56;
const TIGHTEST_PAGE_MARGIN = 0.65;
const DEFAULT_FIT_ADJUSTMENT_PREFERENCE: FitAdjustmentPreference = {
  disableAutoLegal: false,
  disableAutoMargin: false,
};

export function CvStudio({
  initialEditorPath,
  initialPublicPath,
  initialResume,
  workspace,
}: {
  initialEditorPath: string | null;
  initialPublicPath: string;
  initialResume: HostedResumeEditorRecord;
  workspace: WorkspacePayload;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<StudioMode>("edit");
  const [markdown, setMarkdown] = useState(initialResume.markdown);
  const [fontsReady, setFontsReady] = useState(false);
  const [showStylePrefs, setShowStylePrefs] = useState(false);
  const [showPageGuides, setShowPageGuides] = useState(false);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenamingDraft, setIsRenamingDraft] = useState(false);
  const [renameDraftValue, setRenameDraftValue] = useState(initialResume.title);
  const [fitInterventionNotice, setFitInterventionNotice] = useState<FitInterventionNotice | null>(null);
  const [autoFitPreferences, setAutoFitPreferences] = useState<Record<string, FitAdjustmentPreference>>({});
  const [autoFitPreferencesReady, setAutoFitPreferencesReady] = useState(false);
  const [remoteSyncState, setRemoteSyncState] = useState<RemoteSyncState>({ kind: "idle" });
  const [notice, setNotice] = useState<StudioNotice>({ kind: "idle" });
  const [workspaceState, setWorkspaceState] = useState(workspace);
  const [activeResume, setActiveResume] = useState(initialResume);
  const [editorLink, setEditorLink] = useState<string | null>(initialEditorPath);
  const [publicLink, setPublicLink] = useState(initialPublicPath);
  const [templateBusyKey, setTemplateBusyKey] = useState<TemplateKey | null>(null);
  const [fitState, setFitState] = useState({ aggressive: false, overflow: false, scale: 1 });
  const [previewScale, setPreviewScale] = useState(1);
  const [mobileDesktopPreviewScale, setMobileDesktopPreviewScale] = useState(0.36);
  const [mobilePreviewVariant, setMobilePreviewVariant] = useState<MobilePreviewVariant>("mobile");

  const markdownRef = useRef(markdown);
  const activeResumeRef = useRef(activeResume);
  const pageRef = useRef<HTMLDivElement>(null);
  const contentBoundsRef = useRef<HTMLDivElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const mobileDesktopStageRef = useRef<HTMLDivElement>(null);
  const fitMeasureBoundsRef = useRef<HTMLDivElement>(null);
  const fitMeasureContentRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const nameProbeRef = useRef<HTMLHeadingElement>(null);
  const headlineProbeRef = useRef<HTMLParagraphElement>(null);
  const contactProbeRef = useRef<HTMLParagraphElement>(null);
  const sectionLabelProbeRef = useRef<HTMLHeadingElement>(null);
  const bodyProbeRef = useRef<HTMLParagraphElement>(null);
  const entryTitleProbeRef = useRef<HTMLParagraphElement>(null);
  const entryDateProbeRef = useRef<HTMLParagraphElement>(null);
  const entryMetaProbeRef = useRef<HTMLParagraphElement>(null);
  const mobileDesktopPreviewBoundsRef = useRef<HTMLDivElement>(null);
  const mobileDesktopPreviewContentRef = useRef<HTMLDivElement>(null);
  const skillsTermProbeRef = useRef<HTMLSpanElement>(null);
  const skillsValueProbeRef = useRef<HTMLSpanElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const autoPublishKeyRef = useRef<string | null>(null);
  const lastAutoMarginAdjustmentRef = useRef<{ from: number; to: number } | null>(null);
  const lastAutoPageSizeAdjustmentRef = useRef<{ from: ResumePageSize; to: ResumePageSize } | null>(null);

  const resumeDocument = parseCvMarkdown(markdown);
  const typeScale = resolveResumeTypography(resumeDocument.style);
  const mobileTypeScale = resolveMobileResumeTypography(resumeDocument.style);
  const pageMetrics = getPageMetrics(resumeDocument.style);
  const markdownParts = splitCvMarkdown(markdown);
  const visibleEditorMarkdown = showStylePrefs
    ? markdown
    : markdownParts.bodyMarkdown.replace(/^\n+/, "");
  const shellClassName =
    mode === "edit"
      ? "grid items-start gap-7 xl:grid-cols-[minmax(23rem,0.8fr)_minmax(38rem,1.2fr)]"
      : "flex justify-center";
  const isPublishing = remoteSyncState.kind === "publishing";
  const publishButtonLabel = isPublishing
    ? "Publishing..."
    : activeResume.isPublished
      ? "Publish changes"
      : "Publish";
  const mobileCompactIconButtonClass =
    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white/92 text-slate-700 transition hover:border-black/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
  const fitAdjustmentPreference =
    autoFitPreferences[activeResume.id] ?? DEFAULT_FIT_ADJUSTMENT_PREFERENCE;
  const shouldWarnAboutContentLength = fitState.scale <= CUT_CONTENT_THRESHOLD;

  useEffect(() => {
    markdownRef.current = markdown;
  }, [markdown]);

  useEffect(() => {
    activeResumeRef.current = activeResume;
  }, [activeResume]);

  useEffect(() => {
    autoPublishKeyRef.current = null;
  }, [activeResume.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(AUTO_FIT_PREFS_STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, Partial<FitAdjustmentPreference>>;
        const normalized = Object.fromEntries(
          Object.entries(parsed).map(([resumeId, preference]) => [
            resumeId,
            {
              disableAutoLegal: Boolean(preference.disableAutoLegal),
              disableAutoMargin: Boolean(preference.disableAutoMargin),
            },
          ]),
        ) as Record<string, FitAdjustmentPreference>;

        setAutoFitPreferences(normalized);
      }
    } catch {
      // Ignore malformed local state and fall back to defaults.
    }

    setAutoFitPreferencesReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !autoFitPreferencesReady) {
      return;
    }

    window.localStorage.setItem(
      AUTO_FIT_PREFS_STORAGE_KEY,
      JSON.stringify(autoFitPreferences),
    );
  }, [autoFitPreferences, autoFitPreferencesReady]);

  useEffect(() => {
    setWorkspaceState(workspace);
    setActiveResume(initialResume);
    setMarkdown(initialResume.markdown);
    setEditorLink(initialEditorPath);
    setPublicLink(initialPublicPath);
    setRenameDraftValue(initialResume.title);
    setMenuOpen(false);
    setIsRenamingDraft(false);
    setFitInterventionNotice(null);
    setNotice({ kind: "idle" });
    setRemoteSyncState({ kind: "idle" });
    lastAutoMarginAdjustmentRef.current = null;
    lastAutoPageSizeAdjustmentRef.current = null;
  }, [
    initialEditorPath,
    initialPublicPath,
    initialResume,
    workspace,
  ]);

  useEffect(() => {
    if (!window.document.fonts) {
      const readyTimer = window.setTimeout(() => {
        setFontsReady(true);
      }, 0);

      return () => {
        window.clearTimeout(readyTimer);
      };
    }

    let cancelled = false;
    window.document.fonts.ready.then(() => {
      if (!cancelled) {
        setFontsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        !(target instanceof Node) ||
        desktopMenuRef.current?.contains(target) ||
        mobileMenuRef.current?.contains(target)
      ) {
        return;
      }

      setMenuOpen(false);
      setIsRenamingDraft(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setMenuOpen(false);
      setIsRenamingDraft(false);
      setShowTemplateChooser(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!isRenamingDraft) {
      return;
    }

    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [isRenamingDraft]);

  useEffect(() => {
    if (notice.kind === "idle") {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice({ kind: "idle" });
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const applyRemotePayload = (
    payload: HostedResumeResponse,
    syncResult: "published" | "saved",
    requestMarkdown?: string,
  ) => {
    setWorkspaceState(payload.workspace);
    setActiveResume(payload.resume);
    setEditorLink(payload.editorUrl);
    setPublicLink(payload.publicUrl);
    setRemoteSyncState({ kind: "idle" });
    setNotice(
      syncResult === "published"
        ? { kind: "success", message: "Published. Share link is ready." }
        : { kind: "success", message: "Changes saved." },
    );

    if (
      requestMarkdown === undefined ||
      markdownRef.current === requestMarkdown ||
      activeResumeRef.current.id !== payload.resume.id
    ) {
      setMarkdown(payload.resume.markdown);
    }
  };

  const mutateResume = async ({
    publish = false,
    silent = false,
  }: {
    publish?: boolean;
    silent?: boolean;
  } = {}) => {
    const requestMarkdown = markdownRef.current;
    const requestResume = activeResumeRef.current;
    const requestFitScale = fitState.scale;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!silent) {
      setRemoteSyncState({ kind: publish ? "publishing" : "saving" });
    }

    try {
      const response = await fetch(
        publish
          ? `/api/resumes/${requestResume.id}/publish`
          : `/api/resumes/${requestResume.id}`,
        {
          body: JSON.stringify({
            fitScale: requestFitScale,
            markdown: requestMarkdown,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: publish ? "POST" : "PUT",
        },
      );
      const payload = await response.json() as HostedResumeResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to sync this resume.");
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      applyRemotePayload(payload, publish ? "published" : "saved", requestMarkdown);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sync this resume.";

      setRemoteSyncState({ kind: "error", message });
      setNotice({ kind: "error", message });
    }
  };

  const autosaveResume = useEffectEvent(() => {
    void mutateResume({ silent: true });
  });

  const autoPublishResume = useEffectEvent(() => {
    void mutateResume({ publish: true });
  });

  useEffect(() => {
    if (!fontsReady || markdown === activeResume.markdown) {
      return;
    }

    const timer = window.setTimeout(() => {
      autosaveResume();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeResume.id, activeResume.markdown, fitState.scale, fontsReady, markdown]);

  useEffect(() => {
    if (mode !== "publish" || isPublishing) {
      return;
    }

    if (activeResume.isPublished && markdown === activeResume.markdown) {
      return;
    }

    const publishKey = `${activeResume.id}:${markdown}`;

    if (autoPublishKeyRef.current === publishKey) {
      return;
    }

    autoPublishKeyRef.current = publishKey;
    autoPublishResume();
  }, [
    activeResume.id,
    activeResume.isPublished,
    activeResume.markdown,
    isPublishing,
    markdown,
    mode,
  ]);

  const copyHostedLink = async (link: string | null) => {
    const absoluteUrl = resolveAbsoluteUrl(link);

    if (!absoluteUrl) {
      return;
    }

    await navigator.clipboard.writeText(absoluteUrl);
    setNotice({ kind: "success", message: `Copied ${absoluteUrl}` });
  };

  const measureFit = useEffectEvent(() => {
    const page = fitMeasureBoundsRef.current;
    const content = fitMeasureContentRef.current;
    const typography = readTypography({
      body: bodyProbeRef.current,
      contact: contactProbeRef.current,
      entryDate: entryDateProbeRef.current,
      entryMeta: entryMetaProbeRef.current,
      entryTitle: entryTitleProbeRef.current,
      headline: headlineProbeRef.current,
      name: nameProbeRef.current,
      sectionLabel: sectionLabelProbeRef.current,
      skillsTerm: skillsTermProbeRef.current,
      skillsValue: skillsValueProbeRef.current,
    });

    if (!page || !content || !typography) {
      return;
    }

    const predictedScale = estimateResumeScale(resumeDocument, typography);
    let result = refineScaleWithDom({
      content,
      initialScale: predictedScale,
      limits: CV_SCALE_LIMITS,
      page,
    });
    let aggressive = false;

    if (result.overflow) {
      aggressive = true;
      result = refineScaleWithDom({
        content,
        initialScale: estimateResumeScale(
          resumeDocument,
          typography,
          AGGRESSIVE_CV_SCALE_LIMITS,
        ),
        limits: AGGRESSIVE_CV_SCALE_LIMITS,
        page,
      });
    }

    setFitState((current) => {
      if (
        current.aggressive === aggressive &&
        current.scale === result.scale &&
        current.overflow === result.overflow
      ) {
        return current;
      }

      return {
        aggressive,
        overflow: result.overflow,
        scale: result.scale,
      };
    });
  });

  const updatePreviewScale = useEffectEvent(() => {
    const stageViewport = stageViewportRef.current;

    if (!stageViewport) {
      return;
    }

    const nextScale = Number(
      Math.min(1, stageViewport.clientWidth / pageMetrics.pageWidth).toFixed(3),
    );

    setPreviewScale((current) => (current === nextScale ? current : nextScale));
  });

  const updateMobileDesktopPreviewScale = useEffectEvent(() => {
    const stageViewport = mobileDesktopStageRef.current;

    if (!stageViewport) {
      return;
    }

    const nextScale = Number(
      Math.min(1, stageViewport.clientWidth / pageMetrics.pageWidth).toFixed(3),
    );

    setMobileDesktopPreviewScale((current) => (current === nextScale ? current : nextScale));
  });

  useLayoutEffect(() => {
    if (!fontsReady) {
      return;
    }

    measureFit();
  }, [fontsReady, markdown]);

  useEffect(() => {
    if (
      !autoFitPreferencesReady ||
      !fontsReady ||
      fitAdjustmentPreference.disableAutoMargin ||
      resumeDocument.style.pageMargin <= TIGHTEST_PAGE_MARGIN + 0.001 ||
      fitState.scale > AUTO_MARGIN_THRESHOLD
    ) {
      return;
    }

    const fromMargin = resumeDocument.style.pageMargin;
    lastAutoMarginAdjustmentRef.current = {
      from: fromMargin,
      to: TIGHTEST_PAGE_MARGIN,
    };
    setMarkdown((current) => updateMarkdownPageMargin(current, TIGHTEST_PAGE_MARGIN));
    setFitInterventionNotice({
      kind: "margin",
      from: fromMargin,
      to: TIGHTEST_PAGE_MARGIN,
    });
  }, [
    fitAdjustmentPreference.disableAutoMargin,
    fitState.scale,
    autoFitPreferencesReady,
    fontsReady,
    resumeDocument.style.pageMargin,
  ]);

  useEffect(() => {
    if (
      !autoFitPreferencesReady ||
      !fontsReady ||
      fitAdjustmentPreference.disableAutoLegal ||
      resumeDocument.style.pageSize !== "letter" ||
      fitState.scale > AUTO_LEGAL_THRESHOLD
    ) {
      return;
    }

    lastAutoPageSizeAdjustmentRef.current = {
      from: "letter",
      to: "legal",
    };
    setMarkdown((current) => updateMarkdownPageSize(current, "legal"));
    setFitInterventionNotice({
      kind: "legal",
      from: "letter",
      to: "legal",
    });
  }, [
    fitAdjustmentPreference.disableAutoLegal,
    fitState.scale,
    autoFitPreferencesReady,
    fontsReady,
    resumeDocument.style.pageSize,
  ]);

  useLayoutEffect(() => {
    updatePreviewScale();
  }, [pageMetrics.pageHeight, pageMetrics.pageWidth]);

  useLayoutEffect(() => {
    updateMobileDesktopPreviewScale();
  }, [mobilePreviewVariant, mode, pageMetrics.pageHeight, pageMetrics.pageWidth]);

  useEffect(() => {
    const stageViewport = stageViewportRef.current;

    if (!stageViewport) {
      return;
    }

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updatePreviewScale();
      });
    });

    observer.observe(stageViewport);

    return () => observer.disconnect();
  }, [pageMetrics.pageWidth]);

  useEffect(() => {
    const stageViewport = mobileDesktopStageRef.current;

    if (!stageViewport) {
      return;
    }

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updateMobileDesktopPreviewScale();
      });
    });

    observer.observe(stageViewport);

    return () => observer.disconnect();
  }, [mobilePreviewVariant, mode, pageMetrics.pageWidth]);

  const toggleStylePrefs = () => {
    if (!showStylePrefs && !markdownParts.frontmatter) {
      setMarkdown(
        composeCvMarkdown({
          bodyMarkdown: markdownParts.bodyMarkdown,
          frontmatter: composeCvFrontmatter(DEFAULT_RESUME_STYLE),
        }),
      );
    }

    setShowStylePrefs((current) => !current);
  };

  const updateFitAdjustmentPreference = (
    updater: (current: FitAdjustmentPreference) => FitAdjustmentPreference,
  ) => {
    setAutoFitPreferences((current) => ({
      ...current,
      [activeResume.id]: updater(
        current[activeResume.id] ?? DEFAULT_FIT_ADJUSTMENT_PREFERENCE,
      ),
    }));
  };

  const handlePageMarginChange = (pageMargin: number) => {
    const lastAutoMarginAdjustment = lastAutoMarginAdjustmentRef.current;

    if (
      lastAutoMarginAdjustment &&
      Math.abs(pageMargin - lastAutoMarginAdjustment.from) < 0.001
    ) {
      updateFitAdjustmentPreference((current) => ({
        ...current,
        disableAutoMargin: true,
      }));
    }

    lastAutoMarginAdjustmentRef.current = null;
    setFitInterventionNotice((current) =>
      current?.kind === "margin" ? null : current,
    );
    setMarkdown((current) => updateMarkdownPageMargin(current, pageMargin));
  };

  const handlePageSizeChange = (pageSize: ResumePageSize) => {
    const lastAutoPageSizeAdjustment = lastAutoPageSizeAdjustmentRef.current;

    if (
      lastAutoPageSizeAdjustment &&
      pageSize === lastAutoPageSizeAdjustment.from
    ) {
      updateFitAdjustmentPreference((current) => ({
        ...current,
        disableAutoLegal: true,
      }));
    }

    lastAutoPageSizeAdjustmentRef.current = null;
    setFitInterventionNotice((current) =>
      current?.kind === "legal" ? null : current,
    );
    setMarkdown((current) => updateMarkdownPageSize(current, pageSize));
  };

  const restorePreviousAutoMargin = () => {
    const lastAutoMarginAdjustment = lastAutoMarginAdjustmentRef.current;

    if (!lastAutoMarginAdjustment) {
      return;
    }

    updateFitAdjustmentPreference((current) => ({
      ...current,
      disableAutoMargin: true,
    }));
    setFitInterventionNotice(null);
    setMarkdown((current) =>
      updateMarkdownPageMargin(current, lastAutoMarginAdjustment.from),
    );
    lastAutoMarginAdjustmentRef.current = null;
  };

  const restorePreviousAutoPageSize = () => {
    const lastAutoPageSizeAdjustment = lastAutoPageSizeAdjustmentRef.current;

    if (!lastAutoPageSizeAdjustment) {
      return;
    }

    updateFitAdjustmentPreference((current) => ({
      ...current,
      disableAutoLegal: true,
    }));
    setFitInterventionNotice(null);
    setMarkdown((current) =>
      updateMarkdownPageSize(current, lastAutoPageSizeAdjustment.from),
    );
    lastAutoPageSizeAdjustmentRef.current = null;
  };

  const selectResume = async (resumeId: string) => {
    if (!resumeId || resumeId === activeResume.id) {
      return;
    }

    setWorkspaceState((current) => ({ ...current, currentResumeId: resumeId }));

    try {
      const response = await fetch("/api/workspace/current", {
        body: JSON.stringify({ resumeId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json() as HostedResumeResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to switch resumes.");
      }

      router.replace(`/studio/${resumeId}`, { scroll: false });
    } catch (error) {
      setWorkspaceState((current) => ({ ...current, currentResumeId: activeResume.id }));
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to switch resumes.",
      });
    }
  };

  const renameCurrentResume = async () => {
    const nextTitle = renameDraftValue.trim();

    if (!nextTitle) {
      return;
    }

    try {
      const response = await fetch(`/api/resumes/${activeResume.id}`, {
        body: JSON.stringify({ title: nextTitle }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const payload = await response.json() as HostedResumeResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to rename this resume.");
      }

      applyRemotePayload(payload, "saved");
      setIsRenamingDraft(false);
      setMenuOpen(false);
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to rename this resume.",
      });
    }
  };

  const deleteCurrentResume = async () => {
    try {
      const response = await fetch(`/api/resumes/${activeResume.id}`, {
        method: "DELETE",
      });
      const payload = await response.json() as {
        currentResumeId?: string | null;
        error?: string;
        redirectPath?: string;
        workspace?: WorkspacePayload;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete this resume.");
      }

      setMenuOpen(false);
      if (payload.workspace) {
        setWorkspaceState(payload.workspace);
      }
      router.replace(payload.redirectPath ?? "/", { scroll: false });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to delete this resume.",
      });
    }
  };

  const createResumeFromTemplate = async (templateKey: TemplateKey) => {
    setTemplateBusyKey(templateKey);

    try {
      const response = await fetch("/api/resumes", {
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

      applyRemotePayload(payload, "saved");
      setShowTemplateChooser(false);
      router.replace(`/studio/${payload.resume.id}`, { scroll: false });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to create a new resume.",
      });
    } finally {
      setTemplateBusyKey(null);
    }
  };

  const importMarkdownFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const importedMarkdown = typeof reader.result === "string" ? reader.result : "";

      if (!importedMarkdown.trim()) {
        return;
      }

      void (async () => {
        try {
          const response = await fetch("/api/resumes", {
            body: JSON.stringify({
              markdown: importedMarkdown,
              templateKey: guessTemplateKey(importedMarkdown),
              title: file.name.replace(/\.(md|markdown|txt)$/i, "") || "Imported CV",
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          });
          const payload = await response.json() as HostedResumeResponse & { error?: string };

          if (!response.ok) {
            throw new Error(payload.error ?? "Unable to import this markdown file.");
          }

          applyRemotePayload(payload, "saved");
          setMenuOpen(false);
          router.replace(`/studio/${payload.resume.id}`, { scroll: false });
        } catch (error) {
          setNotice({
            kind: "error",
            message: error instanceof Error ? error.message : "Unable to import this markdown file.",
          });
        } finally {
          event.target.value = "";
        }
      })();
    };

    reader.readAsText(file);
  };

  return (
    <main className="app-shell flex flex-1 flex-col">
      <header className="app-chrome sticky top-0 z-20 border-b border-black/8 bg-white/84 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[108rem] flex-col gap-2 px-4 py-2.5 sm:px-5 lg:hidden">
          <div className="min-w-0 text-center">
            <h1 className="text-[0.96rem] leading-none font-semibold uppercase tracking-[0.26em] text-[var(--accent-strong)]">
              TINY CV
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 rounded-[1rem] border border-black/10 bg-white/92 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
              <select
                aria-label="Select draft"
                className="h-10 w-full cursor-pointer appearance-none bg-transparent px-4 pr-11 text-[0.9rem] font-medium text-slate-800 outline-none"
                onChange={(event) => {
                  if (event.target.value === "__new__") {
                    setShowTemplateChooser(true);
                    return;
                  }

                  void selectResume(event.target.value);
                }}
                value={workspaceState.currentResumeId ?? activeResume.id}
              >
                {workspaceState.resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.title}
                  </option>
                ))}
                <option value="__new__">+ New resume</option>
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <ChevronDownIcon />
              </span>
            </div>

            <div className="relative shrink-0" ref={mobileMenuRef}>
              <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="More actions"
                className={iconActionButtonClass}
                onClick={() => {
                  setMenuOpen((current) => !current);
                  setIsRenamingDraft(false);
                  setRenameDraftValue(activeResume.title);
                }}
                title="More"
                type="button"
              >
                <MenuIcon />
              </button>
              {menuOpen ? (
                <ResumeMenu
                  canDelete={workspaceState.resumes.length > 1}
                  editorLink={editorLink}
                  exportMarkdown={() => exportResume(activeResume)}
                  importMarkdown={() => importInputRef.current?.click()}
                  isPublished={activeResume.isPublished}
                  isRenamingDraft={isRenamingDraft}
                  mobile
                  onCopyEditorLink={() => void copyHostedLink(editorLink)}
                  onCopyPublicLink={() => void copyHostedLink(publicLink)}
                  onDeleteDraft={() => void deleteCurrentResume()}
                  onRenameCancel={() => {
                    setIsRenamingDraft(false);
                    setRenameDraftValue(activeResume.title);
                  }}
                  onRenameChange={setRenameDraftValue}
                  onRenameCommit={() => void renameCurrentResume()}
                  onRenameStart={() => {
                    setIsRenamingDraft(true);
                    setRenameDraftValue(activeResume.title);
                  }}
                  onResetTemplate={() => {
                    setMarkdown(getResumeTemplate(activeResume.templateKey).markdown);
                    setMenuOpen(false);
                  }}
                  onTogglePageGuides={() => {
                    setShowPageGuides((current) => !current);
                    setMenuOpen(false);
                  }}
                  onTemplateChooser={() => {
                    setShowTemplateChooser(true);
                    setMenuOpen(false);
                  }}
                  renameInputRef={renameInputRef}
                  renameValue={renameDraftValue}
                  showPageGuides={showPageGuides}
                />
              ) : null}
            </div>
          </div>

          {remoteSyncState.kind === "saving" || remoteSyncState.kind === "publishing" ? (
            <div className="flex items-center justify-between gap-3 text-[0.8rem] leading-5">
              <span className="text-slate-500">{describeRemoteSyncState(activeResume, remoteSyncState)}</span>
              <SpinnerIcon />
            </div>
          ) : null}
        </div>

        <div className="mx-auto hidden w-full max-w-[108rem] flex-col gap-3 px-5 py-3 lg:flex lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-[1.05rem] leading-none font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)] sm:text-[1.28rem]">
                TINY CV
              </h1>
              <p className="mt-1.5 max-w-[28rem] text-[0.9rem] leading-5 text-slate-600 sm:text-[0.94rem]">
                Markdown-first resume builder that always fits on one page
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-1.5 xl:min-w-[34rem] xl:items-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="relative min-w-[14.5rem] rounded-[1rem] border border-black/10 bg-white/92 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                  <select
                    aria-label="Select draft"
                    className="h-11 w-full cursor-pointer appearance-none bg-transparent px-4 pr-11 text-[0.92rem] font-medium text-slate-800 outline-none"
                    onChange={(event) => {
                      if (event.target.value === "__new__") {
                        setShowTemplateChooser(true);
                        return;
                      }

                      void selectResume(event.target.value);
                    }}
                    value={workspaceState.currentResumeId ?? activeResume.id}
                  >
                    {workspaceState.resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.title}
                      </option>
                    ))}
                    <option value="__new__">+ New resume</option>
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <ChevronDownIcon />
                  </span>
                </div>

                <div className="rounded-full border border-black/10 bg-white/92 p-1 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                  <button
                    className={modeButtonClass(mode === "edit")}
                    onClick={() => setMode("edit")}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className={modeButtonClass(mode !== "edit")}
                    onClick={() => setMode("preview")}
                    type="button"
                  >
                    View
                  </button>
                </div>

                <button
                  className={primaryActionButtonClass}
                  disabled={isPublishing}
                  onClick={() => void mutateResume({ publish: true })}
                  type="button"
                >
                  {isPublishing ? <SpinnerIcon /> : null}
                  <span>{publishButtonLabel}</span>
                </button>

                <div className="relative" ref={desktopMenuRef}>
                  <button
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label="More actions"
                    className={iconActionButtonClass}
                    onClick={() => {
                      setMenuOpen((current) => !current);
                      setIsRenamingDraft(false);
                      setRenameDraftValue(activeResume.title);
                    }}
                    title="More"
                    type="button"
                  >
                    <MenuIcon />
                  </button>
                  {menuOpen ? (
                    <ResumeMenu
                      canDelete={workspaceState.resumes.length > 1}
                      editorLink={editorLink}
                      exportMarkdown={() => exportResume(activeResume)}
                      importMarkdown={() => importInputRef.current?.click()}
                      isPublished={activeResume.isPublished}
                      isRenamingDraft={isRenamingDraft}
                      mobile={false}
                      onCopyEditorLink={() => void copyHostedLink(editorLink)}
                      onCopyPublicLink={() => void copyHostedLink(publicLink)}
                      onDeleteDraft={() => void deleteCurrentResume()}
                      onRenameCancel={() => {
                        setIsRenamingDraft(false);
                        setRenameDraftValue(activeResume.title);
                      }}
                      onRenameChange={setRenameDraftValue}
                      onRenameCommit={() => void renameCurrentResume()}
                      onRenameStart={() => {
                        setIsRenamingDraft(true);
                        setRenameDraftValue(activeResume.title);
                      }}
                      onResetTemplate={() => {
                        setMarkdown(getResumeTemplate(activeResume.templateKey).markdown);
                        setMenuOpen(false);
                      }}
                      onTogglePageGuides={() => {
                        setShowPageGuides((current) => !current);
                        setMenuOpen(false);
                      }}
                      onTemplateChooser={() => {
                        setShowTemplateChooser(true);
                        setMenuOpen(false);
                      }}
                      renameInputRef={renameInputRef}
                      renameValue={renameDraftValue}
                      showPageGuides={showPageGuides}
                    />
                  ) : null}
                </div>
              </div>

              {remoteSyncState.kind === "saving" || remoteSyncState.kind === "publishing" ? (
                <div className="flex items-center justify-end gap-2 pr-1 text-right text-[0.8rem] leading-5 text-slate-500">
                  <SpinnerIcon />
                  <span>{describeRemoteSyncState(activeResume, remoteSyncState)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {notice.kind !== "idle" ? (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center lg:inset-x-auto lg:right-6 lg:bottom-6">
          <div
            className={`pointer-events-auto inline-flex max-w-[min(100%,28rem)] items-center gap-2 rounded-[1rem] border px-4 py-3 text-[0.88rem] font-medium shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl ${
              notice.kind === "error"
                ? "border-rose-200 bg-white/96 text-rose-700"
                : "border-emerald-200 bg-white/96 text-emerald-700"
            }`}
          >
            {notice.kind === "success" ? <CheckIcon /> : null}
            <span>{notice.message}</span>
          </div>
        </div>
      ) : null}

      <div className="studio-workspace mx-auto flex w-full max-w-[108rem] flex-1 flex-col px-4 pt-4 pb-4 sm:px-5 lg:px-8 lg:pt-6 lg:pb-5">
        <div className="app-chrome mb-3 flex items-center justify-between gap-2 px-1 lg:hidden">
          <div className="flex w-[12.2rem] shrink-0 gap-[0.2rem] rounded-full border border-black/10 bg-white/92 p-[0.2rem] shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
            <button
              className={`${modeButtonClass(mode === "edit")} min-w-0 flex-1 !px-2 !py-1.5 !text-[0.77rem]`}
              onClick={() => setMode("edit")}
              type="button"
            >
              Edit
            </button>
            <button
              className={`${modeButtonClass(mode === "preview")} min-w-0 flex-1 !px-2 !py-1.5 !text-[0.77rem]`}
              onClick={() => setMode("preview")}
              type="button"
            >
              Preview
            </button>
            <button
              className={`${modeButtonClass(mode === "publish")} min-w-0 flex-1 !px-2 !py-1.5 !text-[0.77rem]`}
              onClick={() => setMode("publish")}
              type="button"
            >
              Publish
            </button>
          </div>

          {mode === "edit" ? (
            <button
              aria-label={showStylePrefs ? "Close styling preferences" : "Show styling preferences"}
              className={iconActionButtonClass}
              onClick={toggleStylePrefs}
              type="button"
            >
              {showStylePrefs ? <CloseIcon /> : <TuneIcon />}
            </button>
          ) : mode === "preview" ? (
            <div className="ml-auto flex items-center gap-2">
              <button
                aria-label="Show mobile preview"
                className={`${mobileCompactIconButtonClass} ${mobilePreviewVariant === "mobile" ? "border-[var(--accent)]/20 bg-[var(--accent)]/8 text-[var(--accent-strong)]" : ""}`}
                onClick={() => setMobilePreviewVariant("mobile")}
                title="Show mobile preview"
                type="button"
              >
                <MobileIcon />
              </button>
              <button
                aria-label="Show desktop preview"
                className={`${mobileCompactIconButtonClass} ${mobilePreviewVariant === "desktop" ? "border-[var(--accent)]/20 bg-[var(--accent)]/8 text-[var(--accent-strong)]" : ""}`}
                onClick={() => setMobilePreviewVariant("desktop")}
                title="Show desktop preview"
                type="button"
              >
                <DesktopIcon />
              </button>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <button
                aria-label={activeResume.isPublished ? "Copy share link" : "Publishing share link"}
                className={mobileCompactIconButtonClass}
                disabled={!activeResume.isPublished}
                onClick={() => void copyHostedLink(publicLink)}
                title={activeResume.isPublished ? "Copy share link" : "Publishing share link"}
                type="button"
              >
                {isPublishing ? <SpinnerIcon /> : <ShareIcon />}
              </button>
              <button
                aria-label="Download PDF"
                className={mobileCompactIconButtonClass}
                onClick={() => window.print()}
                title="Download PDF"
                type="button"
              >
                <DownloadIcon />
              </button>
            </div>
          )}
        </div>

        <div className={`studio-grid ${shellClassName}`}>
          {mode === "edit" ? (
            <section className="editor-column flex min-h-[calc(100vh-10.25rem)] flex-col">
              <div className="app-chrome mb-3 hidden items-center justify-between gap-4 px-2 lg:flex">
                <h2 className="whitespace-nowrap text-[0.95rem] font-semibold uppercase tracking-[0.12em] text-slate-800">
                  Markdown Source
                </h2>
                <button
                  className={textActionLinkClass}
                  onClick={toggleStylePrefs}
                  type="button"
                >
                  {showStylePrefs ? "Hide styling preferences" : "Show styling preferences"}
                </button>
              </div>

              <div className="app-chrome studio-panel editor-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem]">
                {showStylePrefs ? (
                  <StylePreferenceControls
                    onAccentToneChange={(accentTone) => {
                      setMarkdown((current) => updateMarkdownStyle(current, (style) => ({
                        ...style,
                        accentTone,
                      })));
                    }}
                    onDensityChange={(density) => {
                      setMarkdown((current) => updateMarkdownStyle(current, (style) => ({
                        ...style,
                        density,
                      })));
                    }}
                    onHeaderAlignmentChange={(headerAlignment) => {
                      setMarkdown((current) => updateMarkdownStyle(current, (style) => ({
                        ...style,
                        headerAlignment,
                      })));
                    }}
                    onPageMarginChange={handlePageMarginChange}
                    onPageSizeChange={handlePageSizeChange}
                    onPresetChange={(stylePreset) => {
                      setMarkdown((current) => applyStylePreset(current, stylePreset));
                    }}
                    onShowHeaderDividerChange={(showHeaderDivider) => {
                      setMarkdown((current) => updateMarkdownStyle(current, (style) => ({
                        ...style,
                        showHeaderDivider,
                      })));
                    }}
                    onShowSectionDividerChange={(showSectionDivider) => {
                      setMarkdown((current) => updateMarkdownStyle(current, (style) => ({
                        ...style,
                        showSectionDivider,
                      })));
                    }}
                    style={resumeDocument.style}
                  />
                ) : null}

                <textarea
                  className="min-h-[32rem] flex-1 resize-none bg-transparent px-5 py-5 font-mono text-[0.98rem] leading-7 text-slate-900 outline-none"
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    if (showStylePrefs) {
                      setMarkdown(nextValue);
                      return;
                    }

                    setMarkdown(
                      composeCvMarkdown({
                        bodyMarkdown: nextValue,
                        frontmatter:
                          markdownParts.frontmatter ||
                          composeCvFrontmatter(DEFAULT_RESUME_STYLE),
                      }),
                    );
                  }}
                  spellCheck={false}
                  value={visibleEditorMarkdown}
                />

                <div className="hidden border-t border-black/8 px-5 py-4 text-[0.77rem] leading-6 text-slate-500 lg:block">
                  {showStylePrefs
                    ? "Style preferences live in markdown frontmatter. Hide them when you want to focus on writing."
                    : "Keep bullets sharp and measurable. Open styling preferences when you want to tune margins or divider rules."}
                </div>
              </div>
            </section>
          ) : null}

          <section className={`${mode === "edit" ? "hidden lg:flex" : "flex"} preview-column flex-col items-stretch lg:items-center`}>
            <div
              className="app-chrome mb-3 hidden items-center justify-between gap-4 px-1 lg:flex"
              style={{ width: `${pageMetrics.pageWidth * previewScale}px` }}
            >
              <h2 className="whitespace-nowrap text-[0.95rem] font-semibold uppercase tracking-[0.12em] text-slate-800">
                Live Preview
              </h2>
              <div className="flex items-center gap-2">
                {activeResume.isPublished ? (
                  <button
                    className={textActionLinkClass}
                    onClick={() => void copyHostedLink(publicLink)}
                    type="button"
                  >
                    Share link
                  </button>
                ) : null}
                <button
                  className={textActionLinkClass}
                  onClick={() => window.print()}
                  type="button"
                >
                  <DownloadIcon />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {fitInterventionNotice || fitState.aggressive || fitState.overflow || shouldWarnAboutContentLength ? (
              <div
                className="app-chrome mb-3 hidden px-1 text-[0.77rem] text-slate-500 lg:block"
                style={{ width: `${pageMetrics.pageWidth * previewScale}px` }}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {fitInterventionNotice?.kind === "margin" ? (
                    <>
                      <span>
                        Tightened the page margin from {formatMarginLabel(fitInterventionNotice.from)} to {formatMarginLabel(fitInterventionNotice.to)} to preserve readability.
                      </span>
                      <button
                        className={textActionLinkClass}
                        onClick={restorePreviousAutoMargin}
                        type="button"
                      >
                        Switch back
                      </button>
                    </>
                  ) : null}
                  {fitInterventionNotice?.kind === "legal" ? (
                    <>
                      <span>
                        Switched this draft from {fitInterventionNotice.from} to {fitInterventionNotice.to} so it can stay readable on one page.
                      </span>
                      <button
                        className={textActionLinkClass}
                        onClick={restorePreviousAutoPageSize}
                        type="button"
                      >
                        Switch back
                      </button>
                    </>
                  ) : null}
                  {!fitInterventionNotice && fitState.overflow ? (
                    <span>This draft is still too long for one page at the minimum fit size.</span>
                  ) : null}
                  {!fitInterventionNotice && !fitState.overflow && fitState.aggressive ? (
                    <span>Aggressive fit is active for this page size.</span>
                  ) : null}
                  {shouldWarnAboutContentLength ? (
                    <span className="text-amber-700">
                      This is getting very dense for a one-page resume. Consider cutting it down.
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="cv-stage hidden justify-center lg:flex" ref={stageViewportRef}>
              <div
                className="cv-paper-frame"
                style={{
                  height: `${pageMetrics.pageHeight * previewScale}px`,
                  width: `${pageMetrics.pageWidth * previewScale}px`,
                }}
              >
                <div
                  className="cv-sheet"
                  ref={pageRef}
                  style={{
                    height: `${pageMetrics.pageHeight}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                    width: `${pageMetrics.pageWidth}px`,
                  }}
                >
                  <ResumePreview
                    contentBoundsRef={contentBoundsRef}
                    document={resumeDocument}
                    fitScale={fitState.scale}
                    interactive={true}
                    ref={contentRef}
                    showPageGuides={showPageGuides}
                    typeScale={typeScale}
                  />
                </div>
              </div>
            </div>

            {mobilePreviewVariant === "mobile" ? (
              <article
                className="w-full rounded-[1.45rem] border border-black/8 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] lg:hidden"
                style={{ fontFamily: fontFamilyForChoice(resumeDocument.style.bodyFont) }}
              >
                <ResumeDocumentContent
                  document={resumeDocument}
                  fitScale={1}
                  typeScale={mobileTypeScale}
                  variant="mobile"
                />
              </article>
            ) : (
              <div className="flex w-full justify-center px-1 pt-1 lg:hidden" ref={mobileDesktopStageRef}>
                <div
                  className="cv-paper-frame mx-auto"
                  style={{
                    height: `${pageMetrics.pageHeight * mobileDesktopPreviewScale}px`,
                    width: `${pageMetrics.pageWidth * mobileDesktopPreviewScale}px`,
                  }}
                >
                  <div
                    className="cv-sheet"
                    style={{
                      height: `${pageMetrics.pageHeight}px`,
                      transform: `scale(${mobileDesktopPreviewScale})`,
                      transformOrigin: "top left",
                      width: `${pageMetrics.pageWidth}px`,
                    }}
                  >
                    <ResumePreview
                      contentBoundsRef={mobileDesktopPreviewBoundsRef}
                      document={resumeDocument}
                      fitScale={fitState.scale}
                      interactive={true}
                      ref={mobileDesktopPreviewContentRef}
                      showPageGuides={showPageGuides}
                      typeScale={typeScale}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <FitStyleProbes
        bodyRef={bodyProbeRef}
        contactRef={contactProbeRef}
        entryDateRef={entryDateProbeRef}
        entryMetaRef={entryMetaProbeRef}
        entryTitleRef={entryTitleProbeRef}
        headlineRef={headlineProbeRef}
        nameRef={nameProbeRef}
        sectionLabelRef={sectionLabelProbeRef}
        skillsTermRef={skillsTermProbeRef}
        skillsValueRef={skillsValueProbeRef}
        stylePrefs={resumeDocument.style}
        typeScale={typeScale}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute left-[-10000px] top-0 opacity-0"
      >
        <div
          className="cv-paper-frame"
          style={{
            height: `${pageMetrics.pageHeight}px`,
            width: `${pageMetrics.pageWidth}px`,
          }}
        >
          <ResumePreview
            contentBoundsRef={fitMeasureBoundsRef}
            document={resumeDocument}
            fitScale={fitState.scale}
            ref={fitMeasureContentRef}
            showPageGuides={false}
            typeScale={typeScale}
          />
        </div>
      </div>

      {showTemplateChooser ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/28 px-4 py-5 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-[1.7rem] border border-black/8 bg-[#faf7f1] p-5 shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:p-7">
            <div className="absolute right-5 top-5 sm:right-7 sm:top-7">
              <button
                aria-label="Close template chooser"
                className={iconActionButtonClass}
                onClick={() => setShowTemplateChooser(false)}
                type="button"
              >
                <CloseIcon />
              </button>
            </div>
            <ResumeTemplateChooser
              busyTemplateKey={templateBusyKey}
              eyebrow={null}
              onSelect={(templateKey) => void createResumeFromTemplate(templateKey)}
              subtitle="Pick a starting point, then tailor the markdown and styling from there."
              title="New resume"
            />
          </div>
        </div>
      ) : null}

      <style media="print">{`@page { size: ${resumeDocument.style.pageSize}; margin: 0; }`}</style>
      <input
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={importMarkdownFile}
        ref={importInputRef}
        type="file"
      />
    </main>
  );
}

function ResumeMenu({
  canDelete,
  editorLink,
  exportMarkdown,
  importMarkdown,
  isPublished,
  isRenamingDraft,
  mobile = false,
  onCopyEditorLink,
  onCopyPublicLink,
  onDeleteDraft,
  onRenameCancel,
  onRenameChange,
  onRenameCommit,
  onRenameStart,
  onResetTemplate,
  onTemplateChooser,
  onTogglePageGuides,
  renameInputRef,
  renameValue,
  showPageGuides,
}: {
  canDelete: boolean;
  editorLink: string | null;
  exportMarkdown: () => void;
  importMarkdown: () => void;
  isPublished: boolean;
  isRenamingDraft: boolean;
  mobile?: boolean;
  onCopyEditorLink: () => void;
  onCopyPublicLink: () => void;
  onDeleteDraft: () => void;
  onRenameCancel: () => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameStart: () => void;
  onResetTemplate: () => void;
  onTemplateChooser: () => void;
  onTogglePageGuides: () => void;
  renameInputRef: RefObject<HTMLInputElement | null>;
  renameValue: string;
  showPageGuides: boolean;
}) {
  return (
    <div
      className={
        mobile
          ? "fixed inset-x-0 top-[5.55rem] z-30 px-4"
          : "absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[17.5rem]"
      }
    >
      <div
        className={
          mobile
            ? "w-full rounded-[1.15rem] border border-black/10 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
            : "rounded-[1rem] border border-black/10 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
        }
      >
      <MenuSection title="Draft">
        {isRenamingDraft ? (
          <div className="px-3 py-2">
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Draft name
            </label>
            <input
              className="h-10 w-full rounded-[0.75rem] border border-black/10 px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              onChange={(event) => onRenameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onRenameCommit();
                }
                if (event.key === "Escape") {
                  onRenameCancel();
                }
              }}
              ref={renameInputRef}
              value={renameValue}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                className="inline-flex cursor-pointer items-center justify-center rounded-[0.7rem] px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={onRenameCancel}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex cursor-pointer items-center justify-center rounded-[0.7rem] bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                onClick={onRenameCommit}
                type="button"
              >
                Save name
              </button>
            </div>
          </div>
        ) : (
          <button
            className={menuButtonClass}
            onClick={onRenameStart}
            type="button"
          >
            Rename draft
          </button>
        )}
        <button
          className={menuButtonClass}
          onClick={onTemplateChooser}
          type="button"
        >
          New resume
        </button>
        <button
          className={`${menuButtonClass} text-rose-700 hover:bg-rose-50`}
          disabled={!canDelete}
          onClick={onDeleteDraft}
          type="button"
        >
          Delete draft
        </button>
        <button
          className={`${menuButtonClass} text-rose-700 hover:bg-rose-50`}
          onClick={onResetTemplate}
          type="button"
        >
          Reset to starter template
        </button>
      </MenuSection>

      <MenuSection title="Import / Export">
        <button
          className={menuButtonClass}
          onClick={importMarkdown}
          type="button"
        >
          Import markdown
        </button>
        <button
          className={menuButtonClass}
          onClick={exportMarkdown}
          type="button"
        >
          Export markdown
        </button>
      </MenuSection>

      <MenuSection title="Sharing">
        <button
          className={menuButtonClass}
          disabled={!isPublished}
          onClick={onCopyPublicLink}
          type="button"
        >
          Copy public link
        </button>
        <button
          className={menuButtonClass}
          disabled={!editorLink}
          onClick={onCopyEditorLink}
          type="button"
        >
          Copy editor link
        </button>
      </MenuSection>

      <MenuSection title="Account">
        <Link
          className={menuButtonClass}
          href="/account"
        >
          Account settings
        </Link>
      </MenuSection>

      <MenuSection title="Product">
        <Link
          className={menuButtonClass}
          href="/documentation"
        >
          Documentation
        </Link>
        <Link
          className={menuButtonClass}
          href="/api/v1/openapi.json"
          target="_blank"
        >
          OpenAPI spec
        </Link>
      </MenuSection>

      <MenuSection title="Advanced">
        <button
          className={menuButtonClass}
          onClick={onTogglePageGuides}
          type="button"
        >
          {showPageGuides ? "Hide page guides" : "Show page guides"}
        </button>
      </MenuSection>
      </div>
    </div>
  );
}

function readTypography(nodes: {
  body: HTMLElement | null;
  contact: HTMLElement | null;
  entryDate: HTMLElement | null;
  entryMeta: HTMLElement | null;
  entryTitle: HTMLElement | null;
  headline: HTMLElement | null;
  name: HTMLElement | null;
  sectionLabel: HTMLElement | null;
  skillsTerm: HTMLElement | null;
  skillsValue: HTMLElement | null;
}): CvTypography | null {
  const body = readMeasuredTextStyle(nodes.body);
  const contact = readMeasuredTextStyle(nodes.contact);
  const entryDate = readMeasuredTextStyle(nodes.entryDate);
  const entryMeta = readMeasuredTextStyle(nodes.entryMeta);
  const entryTitle = readMeasuredTextStyle(nodes.entryTitle);
  const headline = readMeasuredTextStyle(nodes.headline);
  const name = readMeasuredTextStyle(nodes.name);
  const sectionLabel = readMeasuredTextStyle(nodes.sectionLabel);
  const skillsTerm = readMeasuredTextStyle(nodes.skillsTerm);
  const skillsValue = readMeasuredTextStyle(nodes.skillsValue);

  if (
    !body ||
    !contact ||
    !entryDate ||
    !entryMeta ||
    !entryTitle ||
    !headline ||
    !name ||
    !sectionLabel ||
    !skillsTerm ||
    !skillsValue
  ) {
    return null;
  }

  return {
    body,
    contact,
    entryDate,
    entryMeta,
    entryTitle,
    headline,
    name,
    sectionLabel,
    skillsTerm,
    skillsValue,
  };
}

function refineScaleWithDom({
  content,
  initialScale,
  limits,
  page,
}: {
  content: HTMLDivElement;
  initialScale: number;
  limits: CvScaleLimits;
  page: HTMLDivElement;
}) {
  let scale = clampScale(initialScale, limits);
  let overflow = false;

  const measureOverflow = () => content.scrollHeight > page.clientHeight + 1;
  const applyCandidateScale = (nextScale: number) => {
    content.style.setProperty("--cv-scale", nextScale.toFixed(3));
    content.style.setProperty(
      "--cv-paper-compression",
      getPaperCompression(nextScale).toFixed(3),
    );
  };

  applyCandidateScale(scale);
  overflow = measureOverflow();

  while (!overflow && scale < limits.max) {
    const nextScale = clampScale(scale + limits.step, limits);

    if (nextScale === scale) {
      break;
    }

    applyCandidateScale(nextScale);
    overflow = measureOverflow();

    if (overflow) {
      applyCandidateScale(scale);
      overflow = false;
      break;
    }

    scale = nextScale;
  }

  while (overflow && scale > limits.min) {
    scale = clampScale(scale - limits.step, limits);
    applyCandidateScale(scale);
    overflow = measureOverflow();
  }

  if (overflow) {
    applyCandidateScale(limits.min);
  }

  return {
    overflow,
    scale: Number(scale.toFixed(3)),
  };
}

function clampScale(value: number, limits: CvScaleLimits) {
  return Number(
    Math.min(limits.max, Math.max(limits.min, value)).toFixed(3),
  );
}

function updateMarkdownStyle(
  markdown: string,
  updater: (style: ResumeStylePrefs) => ResumeStylePrefs,
) {
  const { bodyMarkdown } = splitCvMarkdown(markdown);
  const nextStyle = updater(parseCvMarkdown(markdown).style);

  return composeCvMarkdown({
    bodyMarkdown,
    frontmatter: composeCvFrontmatter(nextStyle),
  });
}

function applyStylePreset(markdown: string, preset: ResumeStylePreset) {
  const currentStyle = parseCvMarkdown(markdown).style;
  const presetStyle = resolveResumeStylePresetDefaults(preset);

  return updateMarkdownStyle(markdown, () => ({
    ...presetStyle,
    pageMargin: currentStyle.pageMargin,
    pageSize: currentStyle.pageSize,
  }));
}

function updateMarkdownPageSize(markdown: string, pageSize: ResumePageSize) {
  const { bodyMarkdown } = splitCvMarkdown(markdown);
  const nextStyle = parseCvMarkdown(markdown).style;

  if (nextStyle.pageSize === pageSize) {
    return markdown;
  }

  return composeCvMarkdown({
    bodyMarkdown,
    frontmatter: composeCvFrontmatter({
      ...DEFAULT_RESUME_STYLE,
      ...nextStyle,
      pageSize,
    }),
  });
}

function updateMarkdownPageMargin(markdown: string, pageMargin: number) {
  return updateMarkdownStyle(markdown, (style) => ({
    ...style,
    pageMargin,
  }));
}

function FitStyleProbes({
  bodyRef,
  contactRef,
  entryDateRef,
  entryMetaRef,
  entryTitleRef,
  headlineRef,
  nameRef,
  sectionLabelRef,
  skillsTermRef,
  skillsValueRef,
  stylePrefs,
  typeScale,
}: {
  bodyRef: RefObject<HTMLParagraphElement | null>;
  contactRef: RefObject<HTMLParagraphElement | null>;
  entryDateRef: RefObject<HTMLParagraphElement | null>;
  entryMetaRef: RefObject<HTMLParagraphElement | null>;
  entryTitleRef: RefObject<HTMLParagraphElement | null>;
  headlineRef: RefObject<HTMLParagraphElement | null>;
  nameRef: RefObject<HTMLHeadingElement | null>;
  sectionLabelRef: RefObject<HTMLHeadingElement | null>;
  skillsTermRef: RefObject<HTMLSpanElement | null>;
  skillsValueRef: RefObject<HTMLSpanElement | null>;
  stylePrefs: ResumeStylePrefs;
  typeScale: ReturnType<typeof resolveResumeTypography>;
}) {
  const pageMetrics = getPageMetrics(stylePrefs);

  return (
    <div
      aria-hidden
      className="fit-style-probes pointer-events-none absolute left-0 top-0 -z-10 opacity-0"
    >
      <article
        className="cv-document"
        style={{
          "--cv-scale": "1",
          fontFamily: fontFamilyForChoice(stylePrefs.bodyFont),
          paddingBottom: `${pageMetrics.paddingBottom}px`,
          paddingLeft: `${pageMetrics.paddingX}px`,
          paddingRight: `${pageMetrics.paddingX}px`,
          paddingTop: `${pageMetrics.paddingTop}px`,
        } as CSSProperties}
      >
        <h1
          className="font-semibold leading-[0.94] tracking-[-0.036em] text-[var(--resume-ink)]"
          ref={nameRef}
          style={{
            fontFamily: fontFamilyForChoice(stylePrefs.displayFont),
            fontSize: `${typeScale.name}em`,
          }}
        >
          Probe
        </h1>
        <p
          className="mt-[0.1in] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]"
          ref={headlineRef}
          style={{
            fontFamily: fontFamilyForChoice(stylePrefs.displayFont),
            fontSize: `${typeScale.headline}em`,
          }}
        >
          Staff Software Engineer
        </p>
        <p
          className="mt-[0.11in] leading-[1.4] text-[var(--resume-subtle)]"
          ref={contactRef}
          style={{ fontSize: `${typeScale.contact}em` }}
        >
          you@example.com
        </p>
        <h2
          className="font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]"
          ref={sectionLabelRef}
          style={{
            fontFamily: fontFamilyForChoice(stylePrefs.displayFont),
            fontSize: `${typeScale.sectionLabel}em`,
          }}
        >
          Summary
        </h2>
        <p
          className="leading-[1.48] text-[var(--resume-ink)]"
          ref={bodyRef}
          style={{ fontSize: `${typeScale.body}em` }}
        >
          Product-minded engineer
        </p>
        <p
          className="font-semibold leading-tight text-[var(--resume-ink)]"
          ref={entryTitleRef}
          style={{ fontSize: `${typeScale.entryTitle}em` }}
        >
          Staff Software Engineer · Example AI
        </p>
        <p
          className="font-semibold uppercase tracking-[0.11em] text-[var(--resume-subtle)]"
          ref={entryDateRef}
          style={{ fontSize: `${typeScale.date}em` }}
        >
          2022 - Present
        </p>
        <p
          className="italic text-[var(--resume-subtle)]"
          ref={entryMetaRef}
          style={{ fontSize: `${typeScale.entryMeta}em` }}
        >
          Remote
        </p>
        <span
          className="font-semibold text-[var(--resume-ink)]"
          ref={skillsTermRef}
          style={{ fontSize: `${typeScale.skills}em` }}
        >
          Languages
        </span>
        <span
          className="leading-[1.4] text-[var(--resume-subtle)]"
          ref={skillsValueRef}
          style={{ fontSize: `${typeScale.skills}em` }}
        >
          TypeScript, JavaScript, Python
        </span>
      </article>
    </div>
  );
}

function exportResume(activeResume: HostedResumeEditorRecord) {
  const blob = new Blob([activeResume.markdown], { type: "text/markdown;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugifyTitle(activeResume.title)}.md`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function guessTemplateKey(markdown: string): TemplateKey {
  const document = parseCvMarkdown(markdown);
  const descriptor = `${document.headline} ${document.sections.map((section) => section.title).join(" ")}`.toLowerCase();

  if (descriptor.includes("design")) {
    return "designer";
  }

  if (descriptor.includes("sales") || descriptor.includes("revenue") || descriptor.includes("account executive")) {
    return "sales";
  }

  if (descriptor.includes("founder") || descriptor.includes("ceo")) {
    return "founder";
  }

  return "engineer";
}

function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "resume";
}

function resolveAbsoluteUrl(link: string | null) {
  if (!link) {
    return null;
  }

  try {
    return new URL(link, window.location.origin).toString();
  } catch {
    return null;
  }
}

function describeRemoteSyncState(
  activeResume: HostedResumeEditorRecord,
  remoteSyncState: RemoteSyncState,
) {
  if (remoteSyncState.kind === "error") {
    return remoteSyncState.message;
  }

  if (remoteSyncState.kind === "saving") {
    return "Saving";
  }

  if (remoteSyncState.kind === "publishing") {
    return "Publishing";
  }

  if (activeResume.isPublished) {
    return "Published";
  }

  return "Saved";
}

function formatMarginLabel(pageMargin: number) {
  return `${pageMargin.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}"`;
}
