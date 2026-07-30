import type { HostedResumeEditorRecord } from "@/app/_lib/hosted-resume-types";

type ResumePublicationState = Pick<
  HostedResumeEditorRecord,
  "isPublished" | "markdown" | "publishedAt" | "updatedAt"
>;

export function hasUnpublishedResumeChanges(
  resume: ResumePublicationState,
  currentMarkdown: string,
) {
  if (!resume.isPublished || !resume.publishedAt) {
    return true;
  }

  if (currentMarkdown !== resume.markdown) {
    return true;
  }

  const publishedAt = Date.parse(resume.publishedAt);
  const updatedAt = Date.parse(resume.updatedAt);

  if (!Number.isFinite(publishedAt) || !Number.isFinite(updatedAt)) {
    return true;
  }

  return updatedAt > publishedAt;
}
