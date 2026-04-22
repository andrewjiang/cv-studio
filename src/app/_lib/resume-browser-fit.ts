import "server-only";

import {
  assertBrowserRendererConfigured,
  BrowserRendererUnavailableError,
  getBrowserRenderOrigin,
  getBrowserTimeoutMs,
  withBrowserPage,
} from "@/app/_lib/browser-renderer";
import { getInternalWorkerSecret } from "@/app/_lib/worker-auth";

export type BrowserFitResult = {
  aggressive: boolean;
  fitScale: number;
  overflow: boolean;
};

const MIN_BROWSER_FIT_BOTTOM_GAP_PX = 16;

export async function measureResumeFitInBrowser(input: {
  resumeId: string;
}): Promise<BrowserFitResult> {
  try {
    assertBrowserRendererConfigured();

    const workerSecret = getInternalWorkerSecret();

    if (!workerSecret) {
      throw new BrowserRendererUnavailableError("Browser fit measurement requires TINYCV_WORKER_SECRET or CRON_SECRET.");
    }

    const url = `${getBrowserRenderOrigin()}/internal/resume-fit/${encodeURIComponent(input.resumeId)}`;

    return await withBrowserPage(async (page) => {
      await page.setViewport({
        deviceScaleFactor: 1,
        height: 1056,
        width: 816,
      });
      await page.setExtraHTTPHeaders({
        "X-TinyCV-Worker-Secret": workerSecret,
      });
      await page.goto(url, {
        timeout: getBrowserTimeoutMs(),
        waitUntil: "networkidle0",
      });
      await page.evaluate(async () => {
        await document.fonts?.ready;
      });

      return page.evaluate((minBottomGapPx) => {
        const pageNode = document.querySelector<HTMLElement>("[data-fit-page]");
        const contentNode = document.querySelector<HTMLElement>("[data-fit-content]");

        if (!pageNode || !contentNode) {
          throw new Error("Internal resume fit page is missing measurement nodes.");
        }

        const pageElement = pageNode;
        const contentElement = contentNode;
        const normalLimits = {
          min: 0.3,
          max: 1.18,
          step: 0.005,
        };
        const aggressiveLimits = {
          min: 0.2,
          max: 1.18,
          step: 0.005,
        };

        function getPaperCompression(fitScale: number) {
          if (fitScale >= 0.92) {
            return 1;
          }

          if (fitScale <= 0.2) {
            return 0.4;
          }

          const progress = (0.92 - fitScale) / 0.72;
          return 1 - progress * 0.6;
        }

        function clampScale(value: number, limits: typeof normalLimits) {
          return Number(
            Math.min(limits.max, Math.max(limits.min, value)).toFixed(3),
          );
        }

        function applyCandidateScale(nextScale: number) {
          contentElement.style.setProperty("--cv-scale", nextScale.toFixed(3));
          contentElement.style.setProperty(
            "--cv-paper-compression",
            getPaperCompression(nextScale).toFixed(3),
          );
        }

        function measureOverflow() {
          return contentElement.scrollHeight > pageElement.clientHeight - minBottomGapPx + 1;
        }

        function refine(limits: typeof normalLimits) {
          let scale = clampScale(limits.max, limits);
          let overflow = false;

          applyCandidateScale(scale);
          overflow = measureOverflow();

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

        let aggressive = false;
        let result = refine(normalLimits);

        if (result.overflow) {
          aggressive = true;
          result = refine(aggressiveLimits);
        }

        return {
          aggressive,
          fitScale: result.scale,
          overflow: result.overflow,
        };
      }, MIN_BROWSER_FIT_BOTTOM_GAP_PX);
    });
  } catch (error) {
    if (error instanceof BrowserRendererUnavailableError) {
      throw error;
    }

    throw new BrowserRendererUnavailableError("Browser fit measurement is unavailable.");
  }
}
