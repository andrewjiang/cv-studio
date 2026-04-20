import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  buildPublicResumeMetadata,
  PublicResumeRenderer,
} from "@/app/_components/public-resume-renderer";
import {
  getPublishedResumeBySlug,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";
import { resolveHost } from "@/app/_lib/resume-domains";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let resume = null;

  try {
    resume = await getPublishedResumeBySlug(slug);
  } catch (error) {
    if (error instanceof HostedResumeStoreUnavailableError) {
      return {
        title: "Resume not found | Tiny CV",
      };
    }

    throw error;
  }

  if (!resume) {
    return {
      title: "Resume not found | Tiny CV",
    };
  }

  return await buildPublicResumeMetadata(resume);
}

export default async function PublicResumePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ print?: string }>;
}) {
  const requestHeaders = await headers();
  const hostResolution = await resolveHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );

  if (hostResolution.kind === "resume_domain") {
    redirect("/");
  }

  if (hostResolution.kind === "unknown") {
    notFound();
  }

  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const print = resolvedSearchParams.print;
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

  const isPrintView = print === "1" || print === "true";

  return <PublicResumeRenderer print={isPrintView} resume={resume} />;
}
