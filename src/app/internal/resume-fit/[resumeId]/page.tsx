import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ResumeDesktopSheet } from "@/app/_components/resume-live-document";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import {
  DeveloperPlatformUnavailableError,
  getResumeForInternalFit,
} from "@/app/_lib/developer-platform-store";
import { isWorkerSecretAuthorized } from "@/app/_lib/worker-auth";

export const dynamic = "force-dynamic";

export default async function InternalResumeFitPage({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}) {
  const requestHeaders = await headers();
  const workerSecret = requestHeaders.get("x-tinycv-worker-secret")?.trim() ?? null;

  if (!isWorkerSecretAuthorized(workerSecret)) {
    notFound();
  }

  const { resumeId } = await params;
  let resume = null;

  try {
    resume = await getResumeForInternalFit(resumeId);
  } catch (error) {
    if (error instanceof DeveloperPlatformUnavailableError) {
      notFound();
    }

    throw error;
  }

  if (!resume) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white text-slate-950" data-fit-root>
      <ResumeDesktopSheet
        document={parseCvMarkdown(resume.markdown)}
        fitAttributes
        fitScale={1}
        interactive={false}
      />
    </main>
  );
}
