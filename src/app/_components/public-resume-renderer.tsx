import { PublicResumeFooterActions } from "@/app/_components/public-resume-footer-actions";
import { ResumeDesktopSheet, ResumeMobileSheet } from "@/app/_components/resume-live-document";
import { ResumePrintView } from "@/app/_components/resume-print-view";
import { getPageMetrics } from "@/app/_lib/cv-fit";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import { canRemoveBrandingForResume } from "@/app/_lib/entitlements";
import type { HostedResumePublicRecord } from "@/app/_lib/hosted-resume-types";
import { getTinyCvSocialCardImage } from "@/app/_lib/site-metadata";

export async function PublicResumeRenderer({
  autoPrint = false,
  print = false,
  resume,
}: {
  autoPrint?: boolean;
  print?: boolean;
  resume: HostedResumePublicRecord;
}) {
  const document = parseCvMarkdown(resume.markdown);
  const pageMetrics = getPageMetrics(document.style);
  const hideBranding = await canRemoveBrandingForResume(resume.id);

  if (print) {
    return <ResumePrintView autoPrint={autoPrint} document={document} fitScale={resume.fitScale} />;
  }

  return (
    <main className="public-resume-page min-h-screen bg-[linear-gradient(180deg,#faf7f1_0%,#f4efe8_100%)] text-slate-900">
      <div className="public-resume-shell mx-auto flex min-h-screen w-full max-w-[112rem] flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="public-resume-mobile lg:hidden">
          <ResumeMobileSheet document={document} />
        </div>

        <div className="public-resume-desktop hidden flex-1 items-start justify-center lg:flex">
          <ResumeDesktopSheet document={document} fitScale={resume.fitScale} />
        </div>

        <PublicResumeFooterActions pageWidth={pageMetrics.pageWidth} showBranding={!hideBranding} />
      </div>

      <style media="print">{`@page { size: ${document.style.pageSize}; margin: 0; }`}</style>
    </main>
  );
}

export async function buildPublicResumeMetadata(
  resume: HostedResumePublicRecord,
  options?: {
    canonicalPath?: string;
  },
) {
  const document = parseCvMarkdown(resume.markdown);
  const hideBranding = await canRemoveBrandingForResume(resume.id);
  const description = hideBranding
    ? `${document.name}'s resume.`
    : `${document.name}'s resume, published with Tiny CV.`;
  const title = `${document.name} | Resume`;
  const canonicalPath = options?.canonicalPath ?? `/${resume.slug}`;
  const socialCardImage = getTinyCvSocialCardImage();

  return {
    alternates: {
      canonical: canonicalPath,
    },
    description,
    openGraph: {
      description,
      images: [socialCardImage],
      siteName: "Tiny CV",
      title,
      type: "profile",
      url: canonicalPath,
    },
    title,
    twitter: {
      card: "summary_large_image",
      creator: "@andrewjiang",
      description,
      images: [socialCardImage],
      site: "@andrewjiang",
      title,
    },
  };
}
