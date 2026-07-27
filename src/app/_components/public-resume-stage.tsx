"use client";

import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * Shared column for the public resume sheet and the actions underneath it so the
 * two stay aligned at every width. The 102rem cap is twice the 8.5in page width,
 * which is how far the sheet is allowed to scale up on very wide displays.
 */
export const publicResumeColumnClass = "mx-auto w-full max-w-[102rem]";

export function PublicResumeDesktopStage({
  children,
  pageHeight,
  pageWidth,
}: {
  children: ReactNode;
  pageHeight: number;
  pageWidth: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const updateStageScale = () => {
      const availableWidth = stage.clientWidth;

      if (availableWidth <= 0) {
        return;
      }

      // Round down so the scaled sheet never overflows the stage by a subpixel.
      const nextScale = Math.floor((availableWidth / pageWidth) * 1000) / 1000;

      setStageScale((current) => (current === nextScale ? current : nextScale));
    };

    updateStageScale();

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(updateStageScale);
    });

    observer.observe(stage);

    return () => observer.disconnect();
  }, [pageWidth]);

  return (
    <div
      className={`public-resume-desktop ${publicResumeColumnClass} hidden flex-1 items-start justify-center lg:flex`}
      ref={stageRef}
    >
      <div
        className="cv-paper-frame cv-scaled-frame"
        style={{
          height: `calc(${pageHeight}px * var(--cv-stage-scale))`,
          width: `calc(${pageWidth}px * var(--cv-stage-scale))`,
          // Before hydration the scale comes from the CSS breakpoint ladder in
          // globals.css; the measured value takes over once it is known.
          ...(stageScale === null ? null : { "--cv-stage-scale": stageScale }),
        } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
