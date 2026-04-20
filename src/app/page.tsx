import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicResumeRenderer } from "@/app/_components/public-resume-renderer";
import { TinyCvLandingPage } from "@/app/_components/tinycv-landing-page";
import { getBillingLaunchState } from "@/app/_lib/billing";
import { getWorkspace } from "@/app/_lib/hosted-resume-store";
import { resolveHost } from "@/app/_lib/resume-domains";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";

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
