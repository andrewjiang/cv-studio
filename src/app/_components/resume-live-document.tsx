import type { CSSProperties } from "react";
import { ResumeDocumentContent, fontFamilyForChoice } from "@/app/_components/resume-content";
import { getPageMetrics } from "@/app/_lib/cv-fit";
import {
  resolveMobileResumeTypography,
  resolveResumeTypography,
  type ResumeDocument,
} from "@/app/_lib/cv-markdown";

export function ResumeDesktopSheet({
  className,
  document,
  fitScale = 1,
  interactive = true,
}: {
  className?: string;
  document: ResumeDocument;
  fitScale?: number;
  interactive?: boolean;
}) {
  const pageMetrics = getPageMetrics(document.style);
  const desktopTypeScale = resolveResumeTypography(document.style);

  return (
    <div
      className={cx("cv-sheet", className)}
      style={{
        height: `${pageMetrics.pageHeight}px`,
        width: `${pageMetrics.pageWidth}px`,
      }}
    >
      <article
        className="cv-document"
        style={{
          fontFamily: fontFamilyForChoice(document.style.bodyFont),
          height: `${pageMetrics.pageHeight}px`,
        } as CSSProperties}
      >
        <div
          className="h-full w-full"
          style={{
            paddingBottom: `${pageMetrics.paddingBottom}px`,
            paddingLeft: `${pageMetrics.paddingX}px`,
            paddingRight: `${pageMetrics.paddingX}px`,
            paddingTop: `${pageMetrics.paddingTop}px`,
          } as CSSProperties}
        >
          <ResumeDocumentContent
            document={document}
            fitScale={fitScale}
            interactive={interactive}
            typeScale={desktopTypeScale}
          />
        </div>
      </article>
    </div>
  );
}

export function ResumeMobileSheet({
  className,
  document,
  fitScale = 1,
  interactive = true,
}: {
  className?: string;
  document: ResumeDocument;
  fitScale?: number;
  interactive?: boolean;
}) {
  const mobileTypeScale = resolveMobileResumeTypography(document.style);

  return (
    <article
      className={cx(
        "rounded-[1.6rem] border border-black/8 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
        className,
      )}
      style={{ fontFamily: fontFamilyForChoice(document.style.bodyFont) }}
    >
      <ResumeDocumentContent
        document={document}
        fitScale={fitScale}
        interactive={interactive}
        typeScale={mobileTypeScale}
        variant="mobile"
      />
    </article>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
