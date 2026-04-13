"use client";

import {
  Fragment,
  forwardRef,
  type Dispatch,
  type CSSProperties,
  type ChangeEvent,
  type RefObject,
  type SetStateAction,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  addDraft,
  createDefaultDraft,
  createNamedDraft,
  formatSavedAt,
  getActiveDraft,
  loadDraftStore,
  renameDraft,
  saveDraftStore,
  slugifyDraftName,
  updateDraftMarkdown,
  type ResumeDraft,
  type ResumeDraftStore,
} from "@/app/_lib/cv-drafts";
import {
  CV_SCALE_LIMITS,
  estimateResumeScale,
  getPageMetrics,
  readMeasuredTextStyle,
  type CvTypography,
} from "@/app/_lib/cv-fit";
import {
  composeCvFrontmatter,
  composeCvMarkdown,
  DEFAULT_CV_MARKDOWN,
  DEFAULT_RESUME_STYLE,
  parseCvMarkdown,
  resolveResumeTypography,
  splitCvMarkdown,
  type ResumeDocument,
  type ResumeFontChoice,
  type ResumeSection,
  type ResumeStylePrefs,
} from "@/app/_lib/cv-markdown";

type StudioMode = "edit" | "publish";

export function CvStudio() {
  const [mode, setMode] = useState<StudioMode>("edit");
  const [markdown, setMarkdown] = useState(DEFAULT_CV_MARKDOWN);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [showStylePrefs, setShowStylePrefs] = useState(false);
  const [showPageGuides, setShowPageGuides] = useState(false);
  const [draftStore, setDraftStore] = useState<ResumeDraftStore>(() => {
    const draft = createDefaultDraft(DEFAULT_CV_MARKDOWN);
    return {
      activeDraftId: draft.id,
      drafts: [draft],
      version: 1,
    };
  });
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const resumeDocument = parseCvMarkdown(markdown);
  const typeScale = resolveResumeTypography(resumeDocument.style);
  const pageMetrics = getPageMetrics(resumeDocument.style);
  const markdownParts = splitCvMarkdown(markdown);
  const visibleEditorMarkdown = showStylePrefs
    ? markdown
    : markdownParts.bodyMarkdown.replace(/^\n+/, "");
  const pageRef = useRef<HTMLDivElement>(null);
  const contentBoundsRef = useRef<HTMLDivElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const nameProbeRef = useRef<HTMLHeadingElement>(null);
  const headlineProbeRef = useRef<HTMLParagraphElement>(null);
  const contactProbeRef = useRef<HTMLParagraphElement>(null);
  const sectionLabelProbeRef = useRef<HTMLHeadingElement>(null);
  const bodyProbeRef = useRef<HTMLParagraphElement>(null);
  const entryTitleProbeRef = useRef<HTMLParagraphElement>(null);
  const entryDateProbeRef = useRef<HTMLParagraphElement>(null);
  const entryMetaProbeRef = useRef<HTMLParagraphElement>(null);
  const skillsTermProbeRef = useRef<HTMLSpanElement>(null);
  const skillsValueProbeRef = useRef<HTMLSpanElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [fitState, setFitState] = useState({ scale: 1, overflow: false });
  const [previewScale, setPreviewScale] = useState(1);
  const activeDraft = getActiveDraft(draftStore);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const loadedStore = loadDraftStore(window.localStorage);
      const loadedDraft = getActiveDraft(loadedStore);
      setDraftStore(loadedStore);
      setMarkdown(loadedDraft?.markdown ?? DEFAULT_CV_MARKDOWN);
      setLastSavedAt(loadedDraft?.updatedAt ?? null);
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  const persistDraft = useEffectEvent((nextMarkdown: string) => {
    if (!activeDraft) {
      return;
    }

    const timestamp = new Date().toISOString();

    setDraftStore((current) => {
      const nextStore = updateDraftMarkdown(
        current,
        activeDraft.id,
        nextMarkdown,
        timestamp,
      );
      saveDraftStore(window.localStorage, nextStore);
      return nextStore;
    });
    setLastSavedAt(timestamp);
  });

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      persistDraft(markdown);
    }, 180);

    return () => window.clearTimeout(saveTimer);
  }, [hasHydrated, markdown]);

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

  const measureFit = useEffectEvent(() => {
    const page = contentBoundsRef.current;
    const content = contentRef.current;
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
    const { overflow, scale } = refineScaleWithDom({
      content,
      initialScale: predictedScale,
      page,
    });

    setFitState((current) => {
      if (
        current.scale === scale &&
        current.overflow === overflow
      ) {
        return current;
      }

      return {
        scale,
        overflow,
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

    setPreviewScale((current) => {
      if (current === nextScale) {
        return current;
      }

      return nextScale;
    });
  });

  useLayoutEffect(() => {
    if (!hasHydrated || !fontsReady) {
      return;
    }

    measureFit();
  }, [fontsReady, hasHydrated, markdown]);

  useLayoutEffect(() => {
    if (!hasHydrated) {
      return;
    }

    updatePreviewScale();
  }, [hasHydrated, pageMetrics.pageHeight, pageMetrics.pageWidth]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

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
  }, [hasHydrated, pageMetrics.pageWidth]);

  const shellClassName =
    mode === "edit"
      ? "grid items-start gap-5 xl:grid-cols-[minmax(28rem,0.88fr)_minmax(40rem,1.32fr)] 2xl:grid-cols-[minmax(30rem,0.82fr)_minmax(46rem,1.38fr)]"
      : "flex justify-center";

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

  return (
    <main className="app-shell flex flex-1 flex-col">
      <header className="app-chrome sticky top-0 z-20 border-b border-black/8 bg-white/84 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-3 px-5 py-4 lg:px-8">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                CV Studio
              </p>
              <h1 className="max-w-[24rem] font-[var(--font-display-serif)] text-[1.15rem] leading-tight text-slate-950 sm:text-[1.35rem]">
                Markdown-first resume builder
              </h1>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <div className="rounded-full border border-black/10 bg-white/92 p-1">
                <button
                  className={modeButtonClass(mode === "edit")}
                  onClick={() => setMode("edit")}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className={modeButtonClass(mode === "publish")}
                  onClick={() => setMode("publish")}
                  type="button"
                >
                  Publish
                </button>
              </div>

              <button
                className={secondaryActionButtonClass}
                onClick={() => createDraftFromCurrent(markdown, setDraftStore, setMarkdown)}
                type="button"
              >
                New draft
              </button>
              <button
                className={primaryActionButtonClass}
                onClick={() => window.print()}
                type="button"
              >
                Download PDF
              </button>
              <details className="relative">
                <summary className={`menu-summary ${secondaryActionButtonClass}`}>
                  More
                </summary>
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[14rem] rounded-[1rem] border border-black/10 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                  <button
                    className={menuButtonClass}
                    onClick={() => setMarkdown(DEFAULT_CV_MARKDOWN)}
                    type="button"
                  >
                    Reset template
                  </button>
                  <button
                    className={menuButtonClass}
                    onClick={() => renameCurrentDraft(activeDraft, setDraftStore)}
                    type="button"
                  >
                    Rename draft
                  </button>
                  <button
                    className={menuButtonClass}
                    onClick={() => exportDraft(activeDraft)}
                    type="button"
                  >
                    Export markdown
                  </button>
                  <button
                    className={menuButtonClass}
                    onClick={() => importInputRef.current?.click()}
                    type="button"
                  >
                    Import markdown
                  </button>
                  <button
                    className={menuButtonClass}
                    onClick={() => setShowPageGuides((current) => !current)}
                    type="button"
                  >
                    {showPageGuides ? "Hide page guides" : "Show page guides"}
                  </button>
                </div>
              </details>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            <label className="text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Draft
            </label>
            <select
              className="min-w-[12rem] rounded-full border border-black/10 bg-white/92 px-4 py-2 text-sm text-slate-800 outline-none"
              onChange={(event) => switchDraft(event.target.value, draftStore, setDraftStore, setMarkdown, setLastSavedAt)}
              value={draftStore.activeDraftId}
            >
              {draftStore.drafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.name}
                </option>
              ))}
            </select>
            <span className="text-slate-400">/</span>
            <span>{formatSavedAt(lastSavedAt)}</span>
            <span className="text-slate-400">/</span>
            <span>Preview {Math.round(fitState.scale * 100)}%</span>
            <span className="text-slate-400">/</span>
            <span className={fitState.overflow ? "text-amber-700" : ""}>
              {fitState.overflow ? "Needs tightening" : "Fits on one page"}
            </span>
          </div>
        </div>
      </header>

      <div className="studio-workspace mx-auto flex w-full max-w-[112rem] flex-1 flex-col px-4 py-4 lg:px-8 lg:py-5">
        <div className={`studio-grid ${shellClassName}`}>
          {mode === "edit" ? (
            <section className="editor-column flex min-h-[calc(100vh-10.25rem)] flex-col">
              <div className="app-chrome mb-3 flex flex-col gap-3 px-1">
                <h2 className="text-[0.95rem] font-semibold uppercase tracking-[0.12em] text-slate-800">
                  Markdown Source
                </h2>
                <p className="max-w-xl text-[0.92rem] leading-6 text-slate-600">
                  Use <code className="font-mono text-[0.88em]">#</code> for
                  your name,{" "}
                  <code className="font-mono">##</code> for sections,{" "}
                  <code className="font-mono">###</code> for entries, an italic
                  line for location and dates, and bullets for measurable
                  impact.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className={secondaryActionButtonClass}
                    onClick={toggleStylePrefs}
                    type="button"
                  >
                    {showStylePrefs
                      ? "Hide styling preferences"
                      : "Show styling preferences"}
                  </button>
                  {showStylePrefs ? (
                    <p className="text-[0.84rem] leading-6 text-slate-500">
                      Set{" "}
                      <code className="font-mono text-[0.88em]">pageSize: letter</code>{" "}
                      or{" "}
                      <code className="font-mono text-[0.88em]">pageSize: legal</code>{" "}
                      and tune{" "}
                      <code className="font-mono text-[0.88em]">pageMargin</code>{" "}
                      and{" "}
                      <code className="font-mono text-[0.88em]">baseSize</code>{" "}
                      in the frontmatter.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="app-chrome studio-panel editor-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem]">
                {hasHydrated ? (
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
                ) : (
                  <EditorLoadingState />
                )}

                <div className="border-t border-black/8 px-5 py-4 text-[0.77rem] leading-6 text-slate-500">
                  {showStylePrefs
                    ? "Style preferences live in markdown frontmatter. Hide them when you want to focus on writing."
                    : "Keep bullets sharp and measurable. Open styling preferences when you want to tune baseline type size, margins, or divider rules."}
                </div>
              </div>
            </section>
          ) : null}

          <section className="preview-column flex flex-col items-center">
            <div
              className="app-chrome mb-3 flex items-center justify-between gap-4 px-1"
              style={{ width: `${pageMetrics.pageWidth * previewScale}px` }}
            >
              <h2 className="text-[0.95rem] font-semibold uppercase tracking-[0.12em] text-slate-800">
                Live Preview
              </h2>
            </div>

            <div className="cv-stage" ref={stageViewportRef}>
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
                    transformOrigin: "top center",
                    width: `${pageMetrics.pageWidth}px`,
                  }}
                >
                  {hasHydrated ? (
                    <ResumePreview
                      contentBoundsRef={contentBoundsRef}
                      document={resumeDocument}
                      fitScale={fitState.scale}
                      showPageGuides={showPageGuides}
                      typeScale={typeScale}
                      ref={contentRef}
                    />
                  ) : (
                    <PreviewLoadingState pageMetrics={pageMetrics} />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {hasHydrated ? (
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
      ) : null}
      <style media="print">{`@page { size: ${resumeDocument.style.pageSize}; margin: 0; }`}</style>
      <input
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={(event) => importDraftFile(event, setDraftStore, setMarkdown, setLastSavedAt)}
        ref={importInputRef}
        type="file"
      />
    </main>
  );
}

const ResumePreview = forwardRef<HTMLDivElement, {
  contentBoundsRef: RefObject<HTMLDivElement | null>;
  document: ResumeDocument;
  fitScale: number;
  showPageGuides: boolean;
  typeScale: ReturnType<typeof resolveResumeTypography>;
}>(function ResumePreview(
  {
    contentBoundsRef,
    document,
    fitScale,
    showPageGuides,
    typeScale,
  },
  ref,
) {
  const pageMetrics = getPageMetrics(document.style);

  return (
    <article
      className="cv-document"
      style={{
        fontFamily: fontFamilyForChoice(document.style.bodyFont),
        height: `${pageMetrics.pageHeight}px`,
      } as CSSProperties}
    >
      {showPageGuides ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="absolute border border-dashed border-emerald-500/70 bg-emerald-500/4"
            style={{
              bottom: `${pageMetrics.paddingBottom}px`,
              left: `${pageMetrics.paddingX}px`,
              right: `${pageMetrics.paddingX}px`,
              top: `${pageMetrics.paddingTop}px`,
            } as CSSProperties}
          />
        </div>
      ) : null}
      <div
        className="h-full w-full"
        style={{
          paddingBottom: `${pageMetrics.paddingBottom}px`,
          paddingLeft: `${pageMetrics.paddingX}px`,
          paddingRight: `${pageMetrics.paddingX}px`,
          paddingTop: `${pageMetrics.paddingTop}px`,
        } as CSSProperties}
      >
        <div
          ref={contentBoundsRef}
          style={{
            height: `${pageMetrics.contentHeight}px`,
            width: `${pageMetrics.contentWidth}px`,
          } as CSSProperties}
        >
          <div
            className="cv-content-root"
            ref={ref}
            style={{
              "--cv-scale": fitScale.toFixed(3),
            } as CSSProperties}
          >
            <header
              className={`${
                document.style.showHeaderDivider ? "border-b border-slate-200" : ""
              }`}
              style={{
                paddingBottom: document.style.showHeaderDivider ? "0.2in" : "0.08in",
              }}
            >
              <h1
                className="font-semibold leading-[0.94] tracking-[-0.036em] text-[var(--resume-ink)]"
                style={{
                  fontFamily: fontFamilyForChoice(document.style.displayFont),
                  fontSize: `${typeScale.name}em`,
                }}
              >
                {document.name}
              </h1>

              {document.headline ? (
                <p
                  className="mt-[0.1in] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]"
                  style={{
                    fontFamily: fontFamilyForChoice(document.style.displayFont),
                    fontSize: `${typeScale.headline}em`,
                  }}
                >
                  {document.headline}
                </p>
              ) : null}

              {document.contactLines.length ? (
                <div
                  className="mt-[0.11in] flex flex-col gap-[0.035in] leading-[1.4] text-[var(--resume-subtle)]"
                  style={{ fontSize: `${typeScale.contact}em` }}
                >
                  {document.contactLines.map((line, index) => (
                    <p key={`contact-${index}-${line}`}>
                      <InlineMarkdown content={line} />
                    </p>
                  ))}
                </div>
              ) : null}
            </header>

            <div
              className="flex flex-col gap-[0.16in]"
              style={{
                marginTop: document.style.showHeaderDivider ? "0.2in" : "0.09in",
              }}
            >
              {document.sections.map((section) => (
                <ResumeSectionBlock
                  key={section.id}
                  section={section}
                  stylePrefs={document.style}
                  typeScale={typeScale}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});

function ResumeSectionBlock({
  section,
  stylePrefs,
  typeScale,
}: {
  section: ResumeSection;
  stylePrefs: ResumeStylePrefs;
  typeScale: ReturnType<typeof resolveResumeTypography>;
}) {
  const isSkillsSection = section.skillGroups.length > 0;

  return (
    <section>
      <div className="mb-[0.08in] flex items-center gap-[0.12in]">
        <h2
          className="shrink-0 font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]"
          style={{
            fontFamily: fontFamilyForChoice(stylePrefs.displayFont),
            fontSize: `${typeScale.sectionLabel}em`,
          }}
        >
          {section.title}
        </h2>
        {stylePrefs.showSectionDivider ? (
          <div className="h-px flex-1 bg-slate-200" />
        ) : null}
      </div>

      {section.paragraphs.length && !isSkillsSection ? (
        <div
          className="flex flex-col gap-[0.07in] leading-[1.48] text-[var(--resume-ink)]"
          style={{ fontSize: `${typeScale.body}em` }}
        >
          {section.paragraphs.map((paragraph, index) => (
            <p key={`${section.id}-paragraph-${index}`}>
              <InlineMarkdown content={paragraph} />
            </p>
          ))}
        </div>
      ) : null}

      {section.bullets.length && !section.entries.length && !isSkillsSection ? (
        <ul
          className="mt-[0.04in] flex flex-col gap-[0.05in] pl-[0.18in] leading-[1.42] text-[var(--resume-ink)]"
          style={{ fontSize: `${typeScale.body}em` }}
        >
          {section.bullets.map((bullet, index) => (
            <li key={`${section.id}-bullet-${index}`} className="list-disc">
              <InlineMarkdown content={bullet} />
            </li>
          ))}
        </ul>
      ) : null}

      {section.entries.length ? (
        <div className="flex flex-col gap-[0.13in]">
          {section.entries.map((entry, entryIndex) => (
            <article key={`${section.id}-entry-${entryIndex}`}>
              <div className="flex items-baseline justify-between gap-[0.18in]">
                <div className="min-w-0">
                  <p
                    className="font-semibold leading-tight text-[var(--resume-ink)]"
                    style={{
                      fontSize: `${typeScale.entryTitle}em`,
                    }}
                  >
                    {entry.titleParts[0] ?? ""}
                    {entry.titleParts[1] ? (
                      <span className="font-medium text-[var(--resume-subtle)]">
                        {" "}
                        · {entry.titleParts.slice(1).join(" · ")}
                      </span>
                    ) : null}
                  </p>
                </div>

                {entry.metaRight ? (
                  <p
                    className="shrink-0 text-right font-semibold uppercase tracking-[0.11em] text-[var(--resume-subtle)]"
                    style={{ fontSize: `${typeScale.date}em` }}
                  >
                    {entry.metaRight}
                  </p>
                ) : null}
              </div>

              {entry.metaLeft ? (
                <p
                  className="mt-[0.024in] italic text-[var(--resume-subtle)]"
                  style={{ fontSize: `${typeScale.entryMeta}em` }}
                >
                  <InlineMarkdown content={entry.metaLeft} />
                </p>
              ) : null}

              {entry.paragraphs.length ? (
                <div
                  className="mt-[0.045in] flex flex-col gap-[0.04in] leading-[1.43] text-[var(--resume-ink)]"
                  style={{ fontSize: `${typeScale.body}em` }}
                >
                  {entry.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${section.id}-entry-${entryIndex}-paragraph-${paragraphIndex}`}>
                      <InlineMarkdown content={paragraph} />
                    </p>
                  ))}
                </div>
              ) : null}

              {entry.bullets.length ? (
                <ul
                  className="mt-[0.05in] flex flex-col gap-[0.045in] pl-[0.18in] leading-[1.42] text-[var(--resume-ink)]"
                  style={{ fontSize: `${typeScale.body}em` }}
                >
                  {entry.bullets.map((bullet, bulletIndex) => (
                    <li
                      key={`${section.id}-entry-${entryIndex}-bullet-${bulletIndex}`}
                      className="list-disc"
                    >
                      <InlineMarkdown content={bullet} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {isSkillsSection ? (
        <dl
          className="grid gap-y-[0.04in] leading-[1.4] text-[var(--resume-ink)] md:grid-cols-[auto_1fr] md:gap-x-[0.16in]"
          style={{ fontSize: `${typeScale.skills}em` }}
        >
          {section.skillGroups.map((group, index) => (
            <Fragment key={`${section.id}-skill-${index}`}>
              <dt
                className="font-semibold text-[var(--resume-ink)]"
              >
                {group.label}
              </dt>
              <dd
                className="text-[var(--resume-subtle)] md:pl-[0.02in]"
              >
                <InlineMarkdown content={group.value} />
              </dd>
            </Fragment>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function InlineMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      disallowedElements={[
        "blockquote",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hr",
        "img",
        "li",
        "ol",
        "pre",
        "table",
        "tbody",
        "td",
        "th",
        "thead",
        "tr",
        "ul",
      ]}
      remarkPlugins={[remarkGfm]}
      skipHtml
      unwrapDisallowed
      components={{
        p: ({ children }) => <>{children}</>,
        a: ({ children, href }) => (
          <a
            className="cv-link"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--resume-ink)]">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic text-[var(--resume-subtle)]">{children}</em>
        ),
        code: ({ children }) => (
          <code className="rounded bg-black/5 px-[0.12em] py-[0.04em] font-mono text-[0.92em]">
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function EditorLoadingState() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-5">
      <div className="flex items-center justify-between text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span>Loading local draft</span>
        <span>Markdown</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 rounded-[1.1rem] border border-black/6 bg-white/36 px-4 py-4">
        <SkeletonLine className="h-4 w-[28%]" />
        <SkeletonLine className="h-4 w-[44%]" />
        <SkeletonLine className="h-4 w-[82%]" />
        <SkeletonLine className="h-4 w-[76%]" />
        <div className="h-3" />
        <SkeletonLine className="h-4 w-[22%]" />
        <SkeletonLine className="h-4 w-[90%]" />
        <SkeletonLine className="h-4 w-[87%]" />
        <SkeletonLine className="h-4 w-[79%]" />
        <div className="h-3" />
        <SkeletonLine className="h-4 w-[26%]" />
        <SkeletonLine className="h-4 w-[56%]" />
        <SkeletonLine className="h-4 w-[84%]" />
        <SkeletonLine className="h-4 w-[81%]" />
        <SkeletonLine className="h-4 w-[73%]" />
      </div>
    </div>
  );
}

function PreviewLoadingState({
  pageMetrics,
}: {
  pageMetrics: ReturnType<typeof getPageMetrics>;
}) {
  return (
    <div
      className="flex h-full flex-col bg-white"
      style={{
        paddingBottom: `${pageMetrics.paddingBottom}px`,
        paddingLeft: `${pageMetrics.paddingX}px`,
        paddingRight: `${pageMetrics.paddingX}px`,
        paddingTop: `${pageMetrics.paddingTop}px`,
      }}
    >
      <SkeletonLine className="h-12 w-[42%]" />
      <SkeletonLine className="mt-4 h-4 w-[38%]" />
      <SkeletonLine className="mt-4 h-3 w-[78%]" />

      <div className="mt-7">
        <div className="flex items-center gap-3">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-px flex-1" />
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          <SkeletonLine className="h-4 w-[94%]" />
          <SkeletonLine className="h-4 w-[92%]" />
          <SkeletonLine className="h-4 w-[76%]" />
        </div>
      </div>

      <div className="mt-7">
        <div className="flex items-center gap-3">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-px flex-1" />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between gap-6">
            <SkeletonLine className="h-4 w-[42%]" />
            <SkeletonLine className="h-3 w-28" />
          </div>
          <SkeletonLine className="mt-2 h-3 w-20" />
          <div className="mt-4 flex flex-col gap-2.5">
            <SkeletonLine className="h-4 w-[96%]" />
            <SkeletonLine className="h-4 w-[91%]" />
            <SkeletonLine className="h-4 w-[88%]" />
            <SkeletonLine className="h-4 w-[82%]" />
          </div>
        </div>
      </div>

      <div className="mt-7">
        <div className="flex items-center gap-3">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-px flex-1" />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <SkeletonLine className="h-4 w-[48%]" />
          <SkeletonLine className="h-4 w-[82%]" />
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="flex items-center gap-3">
          <SkeletonLine className="h-3 w-16" />
          <SkeletonLine className="h-px flex-1" />
        </div>
        <div className="mt-4 grid grid-cols-[7rem_1fr] gap-x-6 gap-y-2">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-3 w-[72%]" />
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-3 w-[64%]" />
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-3 w-[58%]" />
        </div>
      </div>
    </div>
  );
}

function SkeletonLine({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-full bg-slate-200/70 ${className}`} />;
}

const secondaryActionButtonClass =
  "rounded-full border border-black/10 bg-white/92 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-black/20 hover:bg-white";

const primaryActionButtonClass =
  "rounded-full border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)]";

const menuButtonClass =
  "block w-full rounded-[0.75rem] px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50";

function modeButtonClass(active: boolean) {
  return active
    ? "rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-[0_6px_16px_rgba(15,23,42,0.14)]"
    : "rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700";
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
  page,
}: {
  content: HTMLDivElement;
  initialScale: number;
  page: HTMLDivElement;
}) {
  let scale = clampScale(initialScale);
  let overflow = false;

  const measureOverflow = () => (
    content.scrollHeight > page.clientHeight + 1 ||
    content.scrollWidth > page.clientWidth + 1
  );

  content.style.setProperty("--cv-scale", scale.toFixed(3));
  overflow = measureOverflow();

  while (!overflow && scale < CV_SCALE_LIMITS.max) {
    const nextScale = clampScale(scale + CV_SCALE_LIMITS.step);

    if (nextScale === scale) {
      break;
    }

    content.style.setProperty("--cv-scale", nextScale.toFixed(3));
    overflow = measureOverflow();

    if (overflow) {
      content.style.setProperty("--cv-scale", scale.toFixed(3));
      overflow = false;
      break;
    }

    scale = nextScale;
  }

  while (overflow && scale > CV_SCALE_LIMITS.min) {
    scale = clampScale(scale - CV_SCALE_LIMITS.step);
    content.style.setProperty("--cv-scale", scale.toFixed(3));
    overflow = measureOverflow();
  }

  if (overflow) {
    content.style.setProperty("--cv-scale", CV_SCALE_LIMITS.min.toFixed(3));
  }

  return {
    overflow,
    scale: Number(scale.toFixed(3)),
  };
}

function clampScale(value: number) {
  return Number(
    Math.min(CV_SCALE_LIMITS.max, Math.max(CV_SCALE_LIMITS.min, value)).toFixed(3),
  );
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

function fontFamilyForChoice(choice: ResumeFontChoice) {
  if (choice === "serif") {
    return "var(--font-display-serif), serif";
  }

  if (choice === "mono") {
    return "var(--font-ui-mono), monospace";
  }

  return "var(--font-ui-sans), sans-serif";
}

function switchDraft(
  draftId: string,
  draftStore: ResumeDraftStore,
  setDraftStore: Dispatch<SetStateAction<ResumeDraftStore>>,
  setMarkdown: Dispatch<SetStateAction<string>>,
  setLastSavedAt: Dispatch<SetStateAction<string | null>>,
) {
  const nextDraft = draftStore.drafts.find((draft) => draft.id === draftId);

  if (!nextDraft) {
    return;
  }

  setDraftStore((current) => ({
    ...current,
    activeDraftId: draftId,
  }));
  setMarkdown(nextDraft.markdown);
  setLastSavedAt(nextDraft.updatedAt);
}

function renameCurrentDraft(
  activeDraft: ResumeDraft | null,
  setDraftStore: Dispatch<SetStateAction<ResumeDraftStore>>,
) {
  if (!activeDraft) {
    return;
  }

  const nextName = window.prompt("Draft name", activeDraft.name)?.trim();

  if (!nextName) {
    return;
  }

  setDraftStore((current) => {
    const nextStore = renameDraft(current, activeDraft.id, nextName);
    saveDraftStore(window.localStorage, nextStore);
    return nextStore;
  });
}

function createDraftFromCurrent(
  markdown: string,
  setDraftStore: Dispatch<SetStateAction<ResumeDraftStore>>,
  setMarkdown: Dispatch<SetStateAction<string>>,
) {
  const nextName = window.prompt("New draft name", "Tailored CV")?.trim();

  if (!nextName) {
    return;
  }

  const nextDraft = createNamedDraft(nextName, markdown);
  setDraftStore((current) => {
    const nextStore = addDraft(current, nextDraft);
    saveDraftStore(window.localStorage, nextStore);
    return nextStore;
  });
  setMarkdown(nextDraft.markdown);
}

function exportDraft(activeDraft: ResumeDraft | null) {
  if (!activeDraft) {
    return;
  }

  const blob = new Blob([activeDraft.markdown], { type: "text/markdown;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugifyDraftName(activeDraft.name)}.md`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function importDraftFile(
  event: ChangeEvent<HTMLInputElement>,
  setDraftStore: Dispatch<SetStateAction<ResumeDraftStore>>,
  setMarkdown: Dispatch<SetStateAction<string>>,
  setLastSavedAt: Dispatch<SetStateAction<string | null>>,
) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const markdown = typeof reader.result === "string" ? reader.result : "";

    if (!markdown.trim()) {
      return;
    }

    const suggestedName = file.name.replace(/\.(md|markdown|txt)$/i, "") || "Imported CV";
    const nextName = window.prompt("Imported draft name", suggestedName)?.trim() || suggestedName;
    const nextDraft = createNamedDraft(nextName, markdown);
    setDraftStore((current) => {
      const nextStore = addDraft(current, nextDraft);
      saveDraftStore(window.localStorage, nextStore);
      return nextStore;
    });
    setMarkdown(nextDraft.markdown);
    setLastSavedAt(nextDraft.updatedAt);
    event.target.value = "";
  };
  reader.readAsText(file);
}
