import { PublicResumeFooterActions } from "@/app/_components/public-resume-footer-actions";
import { ResumeDesktopSheet, ResumeMobileSheet } from "@/app/_components/resume-live-document";
import { getPageMetrics } from "@/app/_lib/cv-fit";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
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
  const hideBranding = await canRemoveBrandingForResume(resume.id);

  if (print) {
    return (
      <main className="bg-white text-slate-900">
        <ResumeDesktopSheet document={document} fitScale={resume.fitScale} interactive={false} />

        <style media="print">{`@page { size: ${document.style.pageSize}; margin: 0; }`}</style>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf7f1_0%,#f4efe8_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[112rem] flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="lg:hidden">
          <ResumeMobileSheet document={document} />
        </div>

        <div className="hidden flex-1 items-start justify-center lg:flex">
          <ResumeDesktopSheet document={document} fitScale={resume.fitScale} />
        </div>

        <PublicResumeFooterActions pageWidth={pageMetrics.pageWidth} showBranding={!hideBranding} />
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
