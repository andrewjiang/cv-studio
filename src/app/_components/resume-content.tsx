import type { CSSProperties, RefObject } from "react";
import { forwardRef, Fragment } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPageMetrics } from "@/app/_lib/cv-fit";
import {
  fontFamilyForToken,
  resolveResumeDensityMultiplier,
  resolveResumeStyle,
  resolveResumeTypography,
  type ResumeContactItem,
  type ResumeDocument,
  type ResumeResolvedStyle,
  type ResumeSection,
  type ResumeStylePrefs,
  type ResumeTypographyScale,
} from "@/app/_lib/cv-markdown";

type ResumeContentVariant = "paper" | "mobile";

export const ResumeDocumentContent = forwardRef<HTMLDivElement, {
  document: ResumeDocument;
  fitScale?: number;
  interactive?: boolean;
  typeScale?: ResumeTypographyScale;
  variant?: ResumeContentVariant;
}>(function ResumeDocumentContent({
  document,
  fitScale = 1,
  interactive = true,
  typeScale = resolveResumeTypography(document.style),
  variant = "paper",
}, ref) {
  const resolvedStyle = resolveResumeStyle(document.style);
  const spacing = getSpacingTokens(variant, fitScale, document.style);
  const isMobile = variant === "mobile";

  return (
    <div
      className={isMobile ? "cv-content-root resume-mobile" : "cv-content-root"}
      ref={ref}
      style={
        {
          "--accent": resolvedStyle.accent,
          "--accent-strong": resolvedStyle.accentStrong,
          "--cv-paper-compression": getPaperCompression(fitScale).toFixed(3),
          "--cv-scale": fitScale.toFixed(3),
          "--resume-icon-surface": resolvedStyle.iconSurface,
          "--resume-icon-surface-hover": resolvedStyle.iconSurfaceHover,
          "--resume-ink": resolvedStyle.ink,
          "--resume-subtle": resolvedStyle.subtle,
        } as CSSProperties
      }
    >
      <header
        className={`${document.style.showHeaderDivider ? "border-b border-slate-200" : ""} ${resolvedStyle.headerAlignment === "center" ? "text-center" : ""}`}
        style={{
          paddingBottom: document.style.showHeaderDivider
            ? spacing.headerPaddingWithDivider
            : spacing.headerPaddingWithoutDivider,
        }}
      >
        <h1
          className={`font-semibold leading-[0.94] tracking-[-0.036em] text-[var(--resume-ink)] ${resolvedStyle.headerAlignment === "center" ? "mx-auto" : ""}`}
          style={{
            fontFamily: resolvedStyle.displayFontFamily,
            fontSize: `${typeScale.name}em`,
          }}
        >
          {document.name}
        </h1>

        {document.headline ? (
          <p
            className={`font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)] ${resolvedStyle.headerAlignment === "center" ? "mx-auto" : ""}`}
            style={{
              fontFamily: resolvedStyle.displayFontFamily,
              fontSize: `${typeScale.headline}em`,
              marginTop: spacing.headlineMarginTop,
            }}
          >
            {document.headline}
          </p>
        ) : null}

        {document.contactRows.length ? (
          <div
            className={`flex flex-col leading-[1.4] text-[var(--resume-subtle)] ${resolvedStyle.headerAlignment === "center" ? "items-center" : "items-start"}`}
            style={{
              fontSize: `${typeScale.contact}em`,
              gap: spacing.contactGap,
              marginTop: spacing.contactMarginTop,
            }}
          >
            <ResumeContactBlock document={document} interactive={interactive} resolvedStyle={resolvedStyle} variant={variant} />
          </div>
        ) : null}
      </header>

      <div
        className="flex flex-col"
        style={{
          gap: spacing.sectionGap,
          marginTop: document.style.showHeaderDivider
            ? spacing.contentMarginTopWithDivider
            : spacing.contentMarginTopWithoutDivider,
        }}
      >
        {document.sections.map((section) => (
          <ResumeSectionBlock
            fitScale={fitScale}
            interactive={interactive}
            key={section.id}
            resolvedStyle={resolvedStyle}
            section={section}
            stylePrefs={document.style}
            typeScale={typeScale}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
});

export const ResumePreview = forwardRef<HTMLDivElement, {
  contentBoundsRef?: RefObject<HTMLDivElement | null>;
  document: ResumeDocument;
  fitScale?: number;
  interactive?: boolean;
  showPageGuides?: boolean;
  typeScale?: ResumeTypographyScale;
}>(function ResumePreview(
  {
    contentBoundsRef,
    document,
    fitScale = 1,
    interactive = false,
    showPageGuides = false,
    typeScale = resolveResumeTypography(document.style),
  },
  ref,
) {
  const pageMetrics = getPageMetrics(document.style);

  return (
    <article
      className="cv-document"
      style={{
        fontFamily: fontFamilyForToken(document.style.bodyFont),
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
          <ResumeDocumentContent
            document={document}
            fitScale={fitScale}
            interactive={interactive}
            ref={ref}
            typeScale={typeScale}
          />
        </div>
      </div>
    </article>
  );
});

function ResumeContactBlock({
  document,
  interactive,
  resolvedStyle,
  variant,
}: {
  document: ResumeDocument;
  interactive: boolean;
  resolvedStyle: ResumeResolvedStyle;
  variant: ResumeContentVariant;
}) {
  if (document.style.contactStyle === "classic") {
    return (
      <>
        {document.contactRows.map((line, index) => (
          <p
            key={`contact-${index}-${line}`}
            className="break-words [overflow-wrap:anywhere]"
          >
            <InlineMarkdown content={line} interactive={interactive} />
          </p>
        ))}
      </>
    );
  }

  const textItems = document.contactItems.filter((item) => !item.href);
  const linkedItems = document.contactItems.filter((item) => item.href);
  const useIcons = variant === "mobile";

  if (variant === "paper") {
    return (
      <div className="flex flex-wrap items-center gap-x-[0.5rem] gap-y-[0.18rem]">
        {document.contactItems.map((item, index) => (
          <Fragment key={`contact-inline-${item.label}-${index}`}>
            {index > 0 ? <span className="text-slate-300">·</span> : null}
            <ContactItem interactive={interactive} item={item} useIcons={false} />
          </Fragment>
        ))}
      </div>
    );
  }

  const alignmentClasses = resolvedStyle.headerAlignment === "center" ? "justify-center text-center" : "justify-start text-left";

  return (
    <>
      {textItems.length ? (
        <div className={`flex max-w-full flex-wrap gap-x-[0.45rem] gap-y-[0.22rem] ${alignmentClasses}`}>
          {textItems.map((item, index) => (
            <Fragment key={`contact-text-${item.label}-${index}`}>
              {index > 0 ? <span className="text-slate-300">·</span> : null}
              <ContactItem interactive={interactive} item={item} useIcons={false} />
            </Fragment>
          ))}
        </div>
      ) : null}
      {linkedItems.length ? (
        <div
          className={
            useIcons
              ? `flex flex-wrap gap-2 text-[var(--accent-strong)] ${alignmentClasses}`
              : `flex flex-wrap gap-x-[0.5rem] gap-y-[0.18rem] text-[var(--accent-strong)] ${alignmentClasses}`
          }
        >
          {linkedItems.map((item, index) => (
            <Fragment key={`contact-link-${item.label}-${index}`}>
              {!useIcons && index > 0 ? <span className="text-slate-300">·</span> : null}
              <ContactItem iconOnly={useIcons} interactive={interactive} item={item} useIcons={useIcons} />
            </Fragment>
          ))}
        </div>
      ) : null}
    </>
  );
}

function ContactItem({
  iconOnly = false,
  interactive,
  item,
  useIcons,
}: {
  iconOnly?: boolean;
  interactive: boolean;
  item: ResumeContactItem;
  useIcons: boolean;
}) {
  const content = (
    <>
      {useIcons && item.platform ? <ContactIcon platform={item.platform} /> : null}
      {iconOnly ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
    </>
  );

  if (item.href && interactive) {
    return (
      <a
        aria-label={item.label}
        className={
          iconOnly
            ? "cv-link inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-[var(--resume-icon-surface)] text-[var(--accent-strong)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition hover:bg-[var(--resume-icon-surface-hover)]"
            : "cv-link inline-flex items-center gap-1.5"
        }
        href={item.href}
        rel="noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return (
    <span
      className={
        iconOnly
          ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-[var(--resume-icon-surface)] text-[var(--accent-strong)] shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
          : "inline-flex items-center gap-1.5"
      }
    >
      {content}
    </span>
  );
}

function ContactIcon({
  platform,
}: {
  platform: NonNullable<ResumeContactItem["platform"]>;
}) {
  const commonProps = {
    "aria-hidden": "true",
    className: "h-[0.95em] w-[0.95em]",
    fill: "none",
    viewBox: "0 0 24 24",
  } as const;

  if (platform === "linkedin") {
    return (
      <svg {...commonProps}>
        <path
          d="M6.96 8.68a1.24 1.24 0 1 1 0-2.48 1.24 1.24 0 0 1 0 2.48Zm-1.07 1.84h2.14v7.3H5.89v-7.3Zm3.48 0h2.05v1h.03c.28-.54.98-1.12 2.02-1.12 2.16 0 2.56 1.42 2.56 3.27v4.15h-2.13v-3.68c0-.88-.02-2.02-1.23-2.02-1.24 0-1.43.97-1.43 1.96v3.74H9.37v-7.3Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "github") {
    return (
      <svg {...commonProps}>
        <path d="M9.5 18c-4 1.2-4-2-5.5-2.5M15.5 20v-3.1a2.7 2.7 0 0 0-.8-2.1c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.2-3.2 4.3 4.3 0 0 0-.1-3.1s-1-.3-3.3 1.2a11.4 11.4 0 0 0-6 0C7.3 2.2 6.3 2.5 6.3 2.5a4.3 4.3 0 0 0-.1 3.1A4.6 4.6 0 0 0 5 8.8c0 4.7 2.8 5.7 5.5 6a2.7 2.7 0 0 0-.8 2.1V20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (platform === "x") {
    return (
      <svg {...commonProps}>
        <path
          d="M6.72 5.5h2.2l3.6 4.87 4.24-4.87h1.62l-5.15 5.93 5.98 8.07h-4.04l-3.82-5.16-4.49 5.16H5.24l5.39-6.2L4.9 5.5h4.05l3.53 4.77L16.53 5.5H18l-4.96 5.72 5.71 7.69H16.9l-4.04-5.45-4.73 5.45H6.7l5.62-6.47L6.72 5.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "email") {
    return (
      <svg {...commonProps}>
        <path d="M4.5 7.5h15v9h-15zM4.5 8l7.5 5 7.5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (platform === "website") {
    return (
      <svg {...commonProps}>
        <path
          d="M4.75 12h14.5M12 4.75a11.7 11.7 0 0 1 0 14.5M12 4.75a11.7 11.7 0 0 0 0 14.5M6.1 7.25h11.8M6.1 16.75h11.8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ResumeSectionBlock({
  fitScale,
  interactive,
  resolvedStyle,
  section,
  stylePrefs,
  typeScale,
  variant,
}: {
  fitScale: number;
  interactive: boolean;
  resolvedStyle: ReturnType<typeof resolveResumeStyle>;
  section: ResumeSection;
  stylePrefs: ResumeStylePrefs;
  typeScale: ResumeTypographyScale;
  variant: ResumeContentVariant;
}) {
  const isSkillsSection = section.skillGroups.length > 0;
  const spacing = getSpacingTokens(variant, fitScale, stylePrefs);

  return (
    <section>
      <div className="flex items-center" style={{ gap: spacing.sectionHeaderGap, marginBottom: spacing.sectionHeaderMarginBottom }}>
        <h2
          className="shrink-0 font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]"
          style={{
            fontFamily: resolvedStyle.displayFontFamily,
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
          className="flex flex-col leading-[1.48] text-[var(--resume-ink)]"
          style={{ fontSize: `${typeScale.body}em`, gap: spacing.paragraphGap }}
        >
          {section.paragraphs.map((paragraph, index) => (
            <p key={`${section.id}-paragraph-${index}`}>
              <InlineMarkdown content={paragraph} interactive={interactive} />
            </p>
          ))}
        </div>
      ) : null}

      {section.bullets.length && !section.entries.length && !isSkillsSection ? (
        <ul
          className="flex flex-col pl-5 leading-[1.42] text-[var(--resume-ink)]"
          style={{
            fontSize: `${typeScale.body}em`,
            gap: spacing.bulletGap,
            marginTop: spacing.bulletGroupMarginTop,
          }}
        >
          {section.bullets.map((bullet, index) => (
            <li key={`${section.id}-bullet-${index}`} className="list-disc">
              <InlineMarkdown content={bullet} interactive={interactive} />
            </li>
          ))}
        </ul>
      ) : null}

      {section.entries.length ? (
        <div className="flex flex-col" style={{ gap: spacing.entryGap }}>
          {section.entries.map((entry, entryIndex) => (
            <article key={`${section.id}-entry-${entryIndex}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p
                    className="font-semibold leading-tight text-[var(--resume-ink)] [overflow-wrap:anywhere]"
                    style={{ fontSize: `${typeScale.entryTitle}em` }}
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
                  className="italic text-[var(--resume-subtle)]"
                  style={{
                    fontSize: `${typeScale.entryMeta}em`,
                    marginTop: spacing.entryMetaMarginTop,
                  }}
                >
                  <InlineMarkdown content={entry.metaLeft} interactive={interactive} />
                </p>
              ) : null}

              {entry.paragraphs.length ? (
                <div
                  className="flex flex-col leading-[1.43] text-[var(--resume-ink)]"
                  style={{
                    fontSize: `${typeScale.body}em`,
                    gap: spacing.entryParagraphGap,
                    marginTop: spacing.entryParagraphMarginTop,
                  }}
                >
                  {entry.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${section.id}-entry-${entryIndex}-paragraph-${paragraphIndex}`}>
                      <InlineMarkdown content={paragraph} interactive={interactive} />
                    </p>
                  ))}
                </div>
              ) : null}

              {entry.bullets.length ? (
                <ul
                  className="flex flex-col pl-5 leading-[1.42] text-[var(--resume-ink)]"
                  style={{
                    fontSize: `${typeScale.body}em`,
                    gap: spacing.bulletGap,
                    marginTop: spacing.entryBulletMarginTop,
                  }}
                >
                  {entry.bullets.map((bullet, bulletIndex) => (
                    <li
                      key={`${section.id}-entry-${entryIndex}-bullet-${bulletIndex}`}
                      className="list-disc"
                    >
                      <InlineMarkdown content={bullet} interactive={interactive} />
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
          className="grid gap-y-2 leading-[1.4] text-[var(--resume-ink)] md:grid-cols-[auto_1fr]"
          style={{
            fontSize: `${typeScale.skills}em`,
            columnGap: spacing.skillColumnGap,
          }}
        >
          {section.skillGroups.map((group, index) => (
            <Fragment key={`${section.id}-skill-${index}`}>
              <dt className="font-semibold text-[var(--resume-ink)]">{group.label}</dt>
              <dd className="text-[var(--resume-subtle)] md:pl-[0.02in] [overflow-wrap:anywhere]">
                <InlineMarkdown content={group.value} interactive={interactive} />
              </dd>
            </Fragment>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function InlineMarkdown({
  content,
  interactive,
}: {
  content: string;
  interactive: boolean;
}) {
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
        a: ({ children, href }) =>
          interactive ? (
            <a className="cv-link" href={href} rel="noreferrer" target="_blank">
              {children}
            </a>
          ) : (
            <span className="cv-link">{children}</span>
          ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--resume-ink)]">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-[var(--resume-subtle)]">{children}</em>,
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

function getSpacingTokens(
  variant: ResumeContentVariant,
  fitScale: number,
  stylePrefs: ResumeStylePrefs,
) {
  const densityMultiplier = resolveResumeDensityMultiplier(stylePrefs.density);

  if (variant === "mobile") {
    return {
      bulletGap: `calc(0.45rem * ${densityMultiplier})`,
      bulletGroupMarginTop: `calc(0.35rem * ${densityMultiplier})`,
      contactGap: `calc(0.35rem * ${densityMultiplier})`,
      contactMarginTop: `calc(0.7rem * ${densityMultiplier})`,
      contentMarginTopWithDivider: `calc(1rem * ${densityMultiplier})`,
      contentMarginTopWithoutDivider: `calc(0.75rem * ${densityMultiplier})`,
      entryBulletMarginTop: `calc(0.45rem * ${densityMultiplier})`,
      entryGap: `calc(1.1rem * ${densityMultiplier})`,
      entryMetaMarginTop: `calc(0.18rem * ${densityMultiplier})`,
      entryParagraphGap: `calc(0.45rem * ${densityMultiplier})`,
      entryParagraphMarginTop: `calc(0.4rem * ${densityMultiplier})`,
      headlineMarginTop: `calc(0.6rem * ${densityMultiplier})`,
      headerPaddingWithDivider: `calc(1rem * ${densityMultiplier})`,
      headerPaddingWithoutDivider: `calc(0.4rem * ${densityMultiplier})`,
      paragraphGap: `calc(0.65rem * ${densityMultiplier})`,
      sectionGap: `calc(1.25rem * ${densityMultiplier})`,
      sectionHeaderGap: `calc(0.75rem * ${densityMultiplier})`,
      sectionHeaderMarginBottom: `calc(0.7rem * ${densityMultiplier})`,
      skillColumnGap: `calc(1rem * ${densityMultiplier})`,
    };
  }

  const compression = getPaperCompression(fitScale);
  const compress = (value: string) =>
    `calc(${value} * ${densityMultiplier} * var(--cv-paper-compression, ${compression.toFixed(3)}))`;

  return {
    bulletGap: compress("0.045in"),
    bulletGroupMarginTop: compress("0.04in"),
    contactGap: compress("0.035in"),
    contactMarginTop: compress("0.11in"),
    contentMarginTopWithDivider: compress("0.2in"),
    contentMarginTopWithoutDivider: compress("0.09in"),
    entryBulletMarginTop: compress("0.05in"),
    entryGap: compress("0.13in"),
    entryMetaMarginTop: compress("0.024in"),
    entryParagraphGap: compress("0.04in"),
    entryParagraphMarginTop: compress("0.045in"),
    headlineMarginTop: compress("0.1in"),
    headerPaddingWithDivider: compress("0.2in"),
    headerPaddingWithoutDivider: compress("0.08in"),
    paragraphGap: compress("0.07in"),
    sectionGap: compress("0.16in"),
    sectionHeaderGap: compress("0.12in"),
    sectionHeaderMarginBottom: compress("0.08in"),
    skillColumnGap: compress("0.16in"),
  };
}

export function getPaperCompression(fitScale: number) {
  if (fitScale >= 0.92) {
    return 1;
  }

  if (fitScale <= 0.2) {
    return 0.4;
  }

  const progress = (0.92 - fitScale) / 0.72;
  return 1 - progress * 0.6;
}

export { fontFamilyForToken as fontFamilyForChoice };
