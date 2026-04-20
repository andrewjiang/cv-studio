import { PublicResumeFooterActions } from "@/app/_components/public-resume-footer-actions";
import { ResumeDocumentContent, fontFamilyForChoice } from "@/app/_components/resume-content";
import { getPageMetrics } from "@/app/_lib/cv-fit";
import {
  parseCvMarkdown,
  resolveMobileResumeTypography,
  resolveResumeTypography,
} from "@/app/_lib/cv-markdown";
import { canRemoveBrandingForResume } from "@/app/_lib/entitlements";
import type { HostedResumePublicRecord } from "@/app/_lib/hosted-resume-types";

export async function PublicResumeRenderer({
  print = false,
  resume,
}: {
  print?: boolean;
  resume: HostedResumePublicRecord;
}) {
  const document = parseCvMarkdown(resume.markdown);
  const pageMetrics = getPageMetrics(document.style);
  const desktopTypeScale = resolveResumeTypography(document.style);
  const mobileTypeScale = resolveMobileResumeTypography(document.style);
  const hideBranding = await canRemoveBrandingForResume(resume.id);

  if (print) {
    return (
      <main className="bg-white text-slate-900">
        <div
          className="cv-sheet"
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
            }}
          >
            <div
              className="h-full w-full"
              style={{
                paddingBottom: `${pageMetrics.paddingBottom}px`,
                paddingLeft: `${pageMetrics.paddingX}px`,
                paddingRight: `${pageMetrics.paddingX}px`,
                paddingTop: `${pageMetrics.paddingTop}px`,
              }}
            >
              <ResumeDocumentContent
                document={document}
                fitScale={resume.fitScale}
                interactive={false}
                typeScale={desktopTypeScale}
              />
            </div>
          </article>
        </div>

        <style media="print">{`@page { size: ${document.style.pageSize}; margin: 0; }`}</style>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf7f1_0%,#f4efe8_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[112rem] flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="lg:hidden">
          <article
            className="rounded-[1.6rem] border border-black/8 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
            style={{ fontFamily: fontFamilyForChoice(document.style.bodyFont) }}
          >
            <ResumeDocumentContent
              document={document}
              fitScale={1}
              typeScale={mobileTypeScale}
              variant="mobile"
            />
          </article>
        </div>

        <div className="hidden flex-1 items-start justify-center lg:flex">
          <div
            className="cv-sheet"
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
              }}
            >
              <div
                className="h-full w-full"
                style={{
                  paddingBottom: `${pageMetrics.paddingBottom}px`,
                  paddingLeft: `${pageMetrics.paddingX}px`,
                  paddingRight: `${pageMetrics.paddingX}px`,
                  paddingTop: `${pageMetrics.paddingTop}px`,
                }}
              >
                <ResumeDocumentContent
                  document={document}
                  fitScale={resume.fitScale}
                  typeScale={desktopTypeScale}
                />
              </div>
            </article>
          </div>
        </div>

        <PublicResumeFooterActions showBranding={!hideBranding} />
      </div>

      <style media="print">{`@page { size: ${document.style.pageSize}; margin: 0; }`}</style>
    </main>
  );
}

export async function buildPublicResumeMetadata(resume: HostedResumePublicRecord) {
  const document = parseCvMarkdown(resume.markdown);
  const hideBranding = await canRemoveBrandingForResume(resume.id);

  return {
    description: hideBranding
      ? `${document.name}'s resume.`
      : `${document.name}'s resume, published with Tiny CV.`,
    title: `${document.name} | Resume`,
  };
}
