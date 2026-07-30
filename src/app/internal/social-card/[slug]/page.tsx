import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { ResumeDesktopSheet } from "@/app/_components/resume-live-document";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import {
  getPublishedResumeBySlug,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";
import { SOCIAL_CARD_LAYOUT, SOCIAL_CARD_PAGE_SCALE } from "@/app/_lib/resume-social-card";
import { TINYCV_NOINDEX_METADATA } from "@/app/_lib/site-metadata";

export const dynamic = "force-dynamic";
export const metadata = TINYCV_NOINDEX_METADATA;

/**
 * The surface the social card screenshot is taken from. It renders the same
 * sheet the published page and the PDF use, so a card can never drift from the
 * resume it links to.
 */
export default async function ResumeSocialCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let resume = null;

  try {
    resume = await getPublishedResumeBySlug(slug);
  } catch (error) {
    if (error instanceof HostedResumeStoreUnavailableError) {
      notFound();
    }

    throw error;
  }

  if (!resume) {
    notFound();
  }

  const document = parseCvMarkdown(resume.markdown);

  return (
    <main
      className="social-card-stage"
      style={{
        height: `${SOCIAL_CARD_LAYOUT.height}px`,
        width: `${SOCIAL_CARD_LAYOUT.width}px`,
      }}
    >
      <div
        className="cv-paper-frame cv-scaled-frame social-card-paper"
        style={{ "--cv-stage-scale": SOCIAL_CARD_PAGE_SCALE } as CSSProperties}
      >
        <ResumeDesktopSheet document={document} fitScale={resume.fitScale} interactive={false} />
      </div>

      {/* The screenshot must hold the card and nothing else, including the dev overlay. */}
      <style>{"nextjs-portal { display: none !important; }"}</style>
    </main>
  );
}
