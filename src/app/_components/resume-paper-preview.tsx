"use client";

import { useSyncExternalStore } from "react";
import { ResumePreview } from "@/app/_components/resume-content";
import { getPageMetrics } from "@/app/_lib/cv-fit";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";
import { getResumeTemplate } from "@/app/_lib/resume-templates";

export function ResumePaperPreview({
  className,
  cropHeightRatio = 1,
  fitScale = 1,
  markdown,
  mobileScale,
  mobileTargetHeight,
  scale,
  targetHeight,
  templateKey,
}: {
  className?: string;
  cropHeightRatio?: number;
  fitScale?: number;
  markdown?: string;
  mobileScale?: number;
  mobileTargetHeight?: number;
  scale: number;
  targetHeight?: number;
  templateKey: TemplateKey;
}) {
  const template = getResumeTemplate(templateKey);
  const document = parseCvMarkdown(markdown ?? template.markdown);
  const pageMetrics = getPageMetrics(document.style);
  const activeScale = useResponsiveScale({
    mobileScale,
    mobileTargetHeight,
    pageHeight: pageMetrics.pageHeight,
    scale,
    targetHeight,
  });
  const previewHeight = pageMetrics.pageHeight * activeScale * cropHeightRatio;

  return (
    <div
      className={[
        "overflow-hidden rounded-[1.2rem] border border-slate-300 bg-white text-left",
        className,
      ].filter(Boolean).join(" ")}
      style={{
        height: `${previewHeight}px`,
        width: `${pageMetrics.pageWidth * activeScale}px`,
      }}
    >
      <div
        className="origin-top-left"
        style={{
          height: `${pageMetrics.pageHeight}px`,
          transform: `scale(${activeScale})`,
          width: `${pageMetrics.pageWidth}px`,
        }}
      >
        <ResumePreview
          document={document}
          fitScale={fitScale}
          interactive={false}
          showPageGuides={false}
        />
      </div>
    </div>
  );
}

function useResponsiveScale({
  mobileScale,
  mobileTargetHeight,
  pageHeight,
  scale,
  targetHeight,
}: {
  mobileScale?: number;
  mobileTargetHeight?: number;
  pageHeight: number;
  scale: number;
  targetHeight?: number;
}) {
  const isMobile = useMediaQuery(
    "(max-width: 640px)",
    Boolean(mobileScale || mobileTargetHeight),
  );

  const responsiveTargetHeight = isMobile && mobileTargetHeight
    ? mobileTargetHeight
    : targetHeight;

  if (responsiveTargetHeight) {
    return responsiveTargetHeight / pageHeight;
  }

  if (isMobile && mobileScale) {
    return mobileScale;
  }

  return scale;
}

function useMediaQuery(query: string, enabled: boolean) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!enabled || typeof window === "undefined") {
        return () => {};
      }

      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onStoreChange);

      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    () => enabled && typeof window !== "undefined" && window.matchMedia(query).matches,
    () => false,
  );
}
