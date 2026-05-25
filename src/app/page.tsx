import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  buildPublicResumeMetadata,
  PublicResumeRenderer,
} from "@/app/_components/public-resume-renderer";
import { TinyCvLandingPage } from "@/app/_components/tinycv-landing-page";
import { getBillingLaunchState } from "@/app/_lib/billing";
import { getWorkspace } from "@/app/_lib/hosted-resume-store";
import { resolveHost } from "@/app/_lib/resume-domains";
import { TINYCV_APP_DESCRIPTION } from "@/app/_lib/site-metadata";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const hostResolution = await resolveHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );

  if (hostResolution.kind === "resume_domain") {
    return await buildPublicResumeMetadata(hostResolution.resume, {
      canonicalPath: "/",
    });
  }

  return {
    alternates: {
      canonical: "/",
    },
    description: TINYCV_APP_DESCRIPTION,
    openGraph: {
      description: TINYCV_APP_DESCRIPTION,
      title: "Tiny CV - The resume builder that stays on one page.",
      url: "/",
    },
    title: {
      absolute: "Tiny CV - The resume builder that stays on one page",
    },
  };
}

export default async function Home() {
  const requestHeaders = await headers();
  const hostResolution = await resolveHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );

  if (hostResolution.kind === "resume_domain") {
    return <PublicResumeRenderer resume={hostResolution.resume} />;
  }

  if (hostResolution.kind === "unknown") {
    notFound();
  }

  const workspaceId = await readWorkspaceCookie();
  const workspace = workspaceId ? await getWorkspace(workspaceId) : null;
  const continueEditingHref = workspace?.currentResumeId
    ? `/studio/${workspace.currentResumeId}`
    : null;
  const billingLaunchState = await getBillingLaunchState();

  return (
    <TinyCvLandingPage
      billingLaunchState={billingLaunchState}
      continueEditingHref={continueEditingHref}
    />
  );
}
