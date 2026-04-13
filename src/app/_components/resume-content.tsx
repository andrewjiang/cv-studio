import type { CSSProperties } from "react";
import { Fragment } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  resolveResumeTypography,
  type ResumeDocument,
  type ResumeFontChoice,
  type ResumeSection,
  type ResumeStylePrefs,
  type ResumeTypographyScale,
} from "@/app/_lib/cv-markdown";

type ResumeContentVariant = "paper" | "mobile";

export function ResumeDocumentContent({
  document,
  fitScale = 1,
  typeScale = resolveResumeTypography(document.style),
  variant = "paper",
}: {
  document: ResumeDocument;
  fitScale?: number;
  typeScale?: ResumeTypographyScale;
  variant?: ResumeContentVariant;
}) {
  const spacing = getSpacingTokens(variant);

  return (
    <div
      className={variant === "mobile" ? "cv-content-root resume-mobile" : "cv-content-root"}
      style={
        {
          "--cv-scale": fitScale.toFixed(3),
        } as CSSProperties
      }
    >
      <header
        className={document.style.showHeaderDivider ? "border-b border-slate-200" : ""}
        style={{
          paddingBottom: document.style.showHeaderDivider
            ? spacing.headerPaddingWithDivider
            : spacing.headerPaddingWithoutDivider,
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
            className="font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]"
            style={{
              fontFamily: fontFamilyForChoice(document.style.displayFont),
              fontSize: `${typeScale.headline}em`,
              marginTop: spacing.headlineMarginTop,
            }}
          >
            {document.headline}
          </p>
        ) : null}

        {document.contactLines.length ? (
          <div
            className="flex flex-col leading-[1.4] text-[var(--resume-subtle)]"
            style={{
              fontSize: `${typeScale.contact}em`,
              gap: spacing.contactGap,
              marginTop: spacing.contactMarginTop,
            }}
          >
            {document.contactLines.map((line, index) => (
              <p key={`contact-${index}-${line}`} className="break-words">
                <InlineMarkdown content={line} />
              </p>
            ))}
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
            key={section.id}
            section={section}
            stylePrefs={document.style}
            typeScale={typeScale}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

function ResumeSectionBlock({
  section,
  stylePrefs,
  typeScale,
  variant,
}: {
  section: ResumeSection;
  stylePrefs: ResumeStylePrefs;
  typeScale: ResumeTypographyScale;
  variant: ResumeContentVariant;
}) {
  const isSkillsSection = section.skillGroups.length > 0;
  const spacing = getSpacingTokens(variant);

  return (
    <section>
      <div className="flex items-center" style={{ gap: spacing.sectionHeaderGap, marginBottom: spacing.sectionHeaderMarginBottom }}>
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
          className="flex flex-col leading-[1.48] text-[var(--resume-ink)]"
          style={{ fontSize: `${typeScale.body}em`, gap: spacing.paragraphGap }}
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
          className="flex flex-col pl-5 leading-[1.42] text-[var(--resume-ink)]"
          style={{
            fontSize: `${typeScale.body}em`,
            gap: spacing.bulletGap,
            marginTop: spacing.bulletGroupMarginTop,
          }}
        >
          {section.bullets.map((bullet, index) => (
            <li key={`${section.id}-bullet-${index}`} className="list-disc">
              <InlineMarkdown content={bullet} />
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
                    className="font-semibold leading-tight text-[var(--resume-ink)]"
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
                  <InlineMarkdown content={entry.metaLeft} />
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
                      <InlineMarkdown content={paragraph} />
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
          className="grid gap-y-2 leading-[1.4] text-[var(--resume-ink)] md:grid-cols-[auto_1fr]"
          style={{
            fontSize: `${typeScale.skills}em`,
            columnGap: spacing.skillColumnGap,
          }}
        >
          {section.skillGroups.map((group, index) => (
            <Fragment key={`${section.id}-skill-${index}`}>
              <dt className="font-semibold text-[var(--resume-ink)]">{group.label}</dt>
              <dd className="text-[var(--resume-subtle)] md:pl-[0.02in]">
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

function getSpacingTokens(variant: ResumeContentVariant) {
  if (variant === "mobile") {
    return {
      bulletGap: "0.45rem",
      bulletGroupMarginTop: "0.35rem",
      contactGap: "0.35rem",
      contactMarginTop: "0.7rem",
      contentMarginTopWithDivider: "1rem",
      contentMarginTopWithoutDivider: "0.75rem",
      entryBulletMarginTop: "0.45rem",
      entryGap: "1.1rem",
      entryMetaMarginTop: "0.18rem",
      entryParagraphGap: "0.45rem",
      entryParagraphMarginTop: "0.4rem",
      headlineMarginTop: "0.6rem",
      headerPaddingWithDivider: "1rem",
      headerPaddingWithoutDivider: "0.4rem",
      paragraphGap: "0.65rem",
      sectionGap: "1.25rem",
      sectionHeaderGap: "0.75rem",
      sectionHeaderMarginBottom: "0.7rem",
      skillColumnGap: "1rem",
    };
  }

  return {
    bulletGap: "0.045in",
    bulletGroupMarginTop: "0.04in",
    contactGap: "0.035in",
    contactMarginTop: "0.11in",
    contentMarginTopWithDivider: "0.2in",
    contentMarginTopWithoutDivider: "0.09in",
    entryBulletMarginTop: "0.05in",
    entryGap: "0.13in",
    entryMetaMarginTop: "0.024in",
    entryParagraphGap: "0.04in",
    entryParagraphMarginTop: "0.045in",
    headlineMarginTop: "0.1in",
    headerPaddingWithDivider: "0.2in",
    headerPaddingWithoutDivider: "0.08in",
    paragraphGap: "0.07in",
    sectionGap: "0.16in",
    sectionHeaderGap: "0.12in",
    sectionHeaderMarginBottom: "0.08in",
    skillColumnGap: "0.16in",
  };
}

export function fontFamilyForChoice(choice: ResumeFontChoice) {
  if (choice === "serif") {
    return "var(--font-display-serif), serif";
  }

  if (choice === "mono") {
    return "var(--font-ui-mono), monospace";
  }

  return "var(--font-ui-sans), sans-serif";
}
