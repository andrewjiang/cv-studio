import { notFound } from "next/navigation";
import { CvStudio } from "@/app/_components/cv-studio";
import {
  getHostedResumeForEdit,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";

export const dynamic = "force-dynamic";

export default async function HostedStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ resumeId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { resumeId } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  let resume = null;

  try {
    resume = await getHostedResumeForEdit({
      editorToken: token,
      resumeId,
    });
  } catch (error) {
    if (error instanceof HostedResumeStoreUnavailableError) {
      notFound();
    }

    throw error;
  }

  if (!resume) {
    notFound();
  }

  return <CvStudio initialHostedResume={resume} />;
}
