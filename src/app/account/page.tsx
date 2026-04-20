import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AccountAuthPanel,
  AccountBillingRefresh,
  AccountSignOutButton,
  BillingCheckoutButton,
  BillingPortalButton,
  CopyAccountPublicLinkButton,
  SetPrimaryResumeButton,
  SubdomainClaimForm,
} from "@/app/_components/account-client-actions";
import { AppHeader } from "@/app/_components/app-header";
import { CheckIcon } from "@/app/_components/icons";
import { auth } from "@/app/_lib/auth";
import {
  getAccountDashboard,
  type AccountDashboardPayload,
  type AccountResumeSummary,
} from "@/app/_lib/account-store";
import {
  getBillingLaunchState,
  type BillingLaunchState,
} from "@/app/_lib/billing";
import { getUserEntitlements } from "@/app/_lib/entitlements";
import type { EntitlementResolution } from "@/app/_lib/entitlements-core";
import { getWorkspace } from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const workspaceId = await readWorkspaceCookie();
  const workspace = workspaceId ? await getWorkspace(workspaceId) : null;
  const hasWorkspaceResumes = Boolean(workspace?.resumes.length);
  const currentEditorHref = workspace?.currentResumeId
    ? `/studio/${workspace.currentResumeId}`
    : null;

  if (!session?.user?.id) {
    return (
      <AccountShell currentEditorHref={currentEditorHref}>
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
            <section className="rounded-[2rem] border border-black/8 bg-white/80 p-7 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:p-10">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#065f46]">
                Account access
              </p>
              <h1 className="mt-5 max-w-xl text-[2.55rem] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-[3.4rem]">
                Your resumes, everywhere you work.
              </h1>
              <p className="mt-5 max-w-2xl text-[1rem] font-medium leading-7 text-slate-600">
                Sign in to save drafts across devices, keep your published links together, and manage paid publishing features from one place.
              </p>

              <div className="mt-8 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-3">
                <AccountValue title="Sync across devices" />
                <AccountValue title="Remove branding" />
                <AccountValue title="Manage publishing" />
              </div>
            </section>

            <AccountAuthPanel
              hasWorkspaceResumes={hasWorkspaceResumes}
              socialProviders={{
                github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
                google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
              }}
            />
          </div>
        </div>
      </AccountShell>
    );
  }

  const entitlementResolution = await getUserEntitlements(session.user.id);
  const dashboard = await getAccountDashboard(session.user.id, entitlementResolution);
  const billingLaunchState = await getBillingLaunchState();
  const accountResumeIds = new Set(dashboard.resumes.map((resume) => resume.id));
  const hasUnclaimedWorkspaceResumes = Boolean(
    workspace?.resumes.some((resume) => !accountResumeIds.has(resume.id)),
  );

  return (
    <AccountShell currentEditorHref={currentEditorHref}>
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <SettingsNav />

        <div className="min-w-0 space-y-6">
          <OverviewCard
            currentEditorHref={currentEditorHref}
            dashboard={dashboard}
            entitlementResolution={entitlementResolution}
            userEmail={session.user.email}
            userName={session.user.name || "Tiny CV"}
          />

          <BillingStatusNotice
            billingStatus={resolvedSearchParams.billing}
            dashboard={dashboard}
            entitlementResolution={entitlementResolution}
            hasUnclaimedWorkspaceResumes={hasUnclaimedWorkspaceResumes}
          />

          <section className="scroll-mt-24" id="resumes">
            <ResumeList
              currentResumeId={dashboard.currentResumeId}
              resumes={dashboard.resumes}
            />
          </section>

          <section className="scroll-mt-24" id="publishing">
          <PublishingIdentityCard
            dashboard={dashboard}
            entitlementResolution={entitlementResolution}
            subdomainsEnabled={process.env.TINYCV_SUBDOMAINS_ENABLED === "true"}
          />
          </section>

          <section className="scroll-mt-24" id="billing">
            <PlanStatusCard
              billingLaunchState={billingLaunchState}
              entitlementResolution={entitlementResolution}
              hasWorkspaceResumes={hasUnclaimedWorkspaceResumes}
            />
          </section>

          <section className="scroll-mt-24" id="settings">
            <SettingsCard
              userEmail={session.user.email}
              userName={session.user.name || "Tiny CV"}
            />
          </section>
        </div>
      </div>
    </AccountShell>
  );
}

function SettingsNav() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-28 space-y-1">
        <p className="px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-400">
          Account
        </p>
        <nav className="flex flex-col gap-1">
          <NavItem href="#overview" label="Overview" />
          <NavItem href="#resumes" label="Resumes" />
          <NavItem href="#publishing" label="Publishing" />
          <NavItem href="#billing" label="Billing" />
          <NavItem href="#settings" label="Settings" />
        </nav>
      </div>
    </aside>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="block rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-white/70 hover:text-slate-950 active:bg-white"
      href={href}
    >
      {label}
    </a>
  );
}

function OverviewCard({
  currentEditorHref,
  dashboard,
  entitlementResolution,
  userEmail,
  userName,
}: {
  currentEditorHref: string | null;
  dashboard: AccountDashboardPayload;
  entitlementResolution: EntitlementResolution;
  userEmail: string;
  userName: string;
}) {
  const isPaid = entitlementResolution.plan.key !== "free";
  const hasPublishedResume = dashboard.resumes.some((resume) => resume.isPublished);
  const primaryAction = getOverviewAction({
    currentEditorHref,
    hasPublishedResume,
    isPaid,
  });

  return (
    <section
      className="scroll-mt-24 rounded-[2rem] border border-black/8 bg-white/82 p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:p-8"
      id="overview"
    >
      <div className="flex flex-col gap-7 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            {userName}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">{userEmail}</p>
          <p className="mt-5 text-base font-medium leading-7 text-slate-600">
            {isPaid
              ? "Branding removal is active on account-owned published resumes."
              : "Public links include Tiny CV branding. Upgrade when you want a cleaner public identity."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[32rem]">
          <OverviewMetric label="Plan" value={entitlementResolution.plan.label} />
          <OverviewMetric label="Resumes" value={String(dashboard.resumes.length)} />
          <OverviewMetric
            label="Primary"
            value={dashboard.primaryResumeId ? "Selected" : "Not set"}
          />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 border-t border-black/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold leading-6 text-slate-500">
          {dashboard.publishing.primaryPublicUrl
            ? `Primary public link: ${dashboard.publishing.primaryPublicUrl}`
            : "Choose a published resume as your primary public identity."}
        </p>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-[#065f46] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#044e3a]"
          href={primaryAction.href}
        >
          {primaryAction.label}
        </Link>
      </div>
    </section>
  );
}

function getOverviewAction({
  currentEditorHref,
  hasPublishedResume,
  isPaid,
}: {
  currentEditorHref: string | null;
  hasPublishedResume: boolean;
  isPaid: boolean;
}) {
  if (!isPaid) {
    return { href: "#billing", label: "Upgrade" };
  }

  if (hasPublishedResume) {
    return { href: "#publishing", label: "Manage publishing" };
  }

  return {
    href: currentEditorHref ?? "/new",
    label: "Publish a resume",
  };
}

function BillingStatusNotice({
  billingStatus,
  dashboard,
  entitlementResolution,
  hasUnclaimedWorkspaceResumes,
}: {
  billingStatus?: string;
  dashboard: AccountDashboardPayload;
  entitlementResolution: EntitlementResolution;
  hasUnclaimedWorkspaceResumes: boolean;
}) {
  if (billingStatus === "success") {
    const paidPlanActive = entitlementResolution.plan.key !== "free";

    if (!paidPlanActive) {
      return (
        <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">Payment received.</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                Stripe is confirming the purchase. This usually takes a moment.
              </p>
            </div>
            <AccountBillingRefresh active />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-[1.5rem] border border-[#065f46]/15 bg-[#ecfdf5] p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              {entitlementResolution.plan.label} is active.
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              Your published account resumes now use paid publishing settings.
            </p>
          </div>
          {dashboard.publishing.primaryPublicUrl ? (
            <CopyAccountPublicLinkButton
              label="Copy primary link"
              publicUrl={dashboard.publishing.primaryPublicUrl}
            />
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PurchaseChecklistItem
            complete={!hasUnclaimedWorkspaceResumes}
            label="Claim browser drafts"
          />
          <PurchaseChecklistItem
            complete={dashboard.resumes.some((resume) => resume.isPublished)}
            label="Publish a resume"
          />
          <PurchaseChecklistItem
            complete={Boolean(dashboard.primaryResumeId)}
            label="Choose primary resume"
          />
          <PurchaseChecklistItem
            complete={Boolean(dashboard.publishing.primaryPublicUrl)}
            label="Copy public link"
          />
        </div>
      </div>
    );
  }

  if (billingStatus === "cancelled") {
    return (
      <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-bold text-slate-950">Checkout cancelled.</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
          No payment was taken. You can restart checkout when you are ready.
        </p>
      </div>
    );
  }

  return null;
}

function PurchaseChecklistItem({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[1rem] border border-[#065f46]/10 bg-white/72 px-3 py-2.5">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${complete ? "bg-[#065f46] text-white" : "bg-slate-200 text-slate-400"}`}>
        <CheckIcon className="h-3 w-3" />
      </span>
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
  );
}

function ResumeList({
  currentResumeId,
  resumes,
}: {
  currentResumeId: string | null;
  resumes: AccountResumeSummary[];
}) {
  return (
    <section className="rounded-[2rem] border border-black/8 bg-white/82 p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Resumes
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Your resume library
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Save role-specific versions, publish the ones you need, and choose one as your primary link.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-[#065f46] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#044e3a] active:scale-[0.98]"
          href="/new"
        >
          New resume
        </Link>
      </div>

      {resumes.length > 0 ? (
        <div className="mt-6 divide-y divide-black/6 overflow-hidden rounded-[1.35rem] border border-black/8 bg-white/60">
          {resumes.map((resume) => (
            <ResumeRow
              currentResumeId={currentResumeId}
              key={resume.id}
              resume={resume}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.35rem] border border-dashed border-black/10 bg-black/[0.02] p-10 text-center">
          <h3 className="text-lg font-bold text-slate-950">No account resumes yet.</h3>
          <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-slate-500">
            Start a new resume or claim the drafts already stored in this browser.
          </p>
        </div>
      )}
    </section>
  );
}

function ResumeRow({
  currentResumeId,
  resume,
}: {
  currentResumeId: string | null;
  resume: AccountResumeSummary;
}) {
  return (
    <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-slate-950">{resume.title}</h3>
          {currentResumeId === resume.id ? <StatusPill label="Current" tone="green" /> : null}
          {resume.isPrimary ? <StatusPill label="Primary" tone="gold" /> : null}
          <StatusPill label={resume.isPublished ? "Published" : "Draft"} tone={resume.isPublished ? "green" : "slate"} />
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          {resume.publicUrl ? (
            <>
              <span className="font-medium text-slate-400">URL:</span> {resume.publicUrl}
              <span className="mx-2 text-slate-300">/</span>
            </>
          ) : null}
          <span className="font-medium text-slate-400">Template:</span> {formatTemplateKey(resume.templateKey)}
          <span className="mx-2 text-slate-300">/</span>
          <span className="font-medium text-slate-400">Updated:</span> {formatShortDate(resume.updatedAt)}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {resume.publicUrl ? (
          <>
            <Link
              className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-50"
              href={resume.publicUrl}
            >
              View public
            </Link>
            <CopyAccountPublicLinkButton publicUrl={resume.publicUrl} />
            <SetPrimaryResumeButton
              isPrimary={resume.isPrimary}
              resumeId={resume.id}
            />
          </>
        ) : (
          <span className="rounded-full border border-black/8 bg-[#fbf7f0] px-4 py-2.5 text-sm font-bold text-slate-500">
            Publish before primary
          </span>
        )}
        <Link
          className="rounded-full bg-[#065f46] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#044e3a]"
          href={`/account/resumes/${resume.id}/open`}
        >
          Open editor
        </Link>
      </div>
    </div>
  );
}

function PublishingIdentityCard({
  dashboard,
  entitlementResolution,
  subdomainsEnabled,
}: {
  dashboard: AccountDashboardPayload;
  entitlementResolution: EntitlementResolution;
  subdomainsEnabled: boolean;
}) {
  const primaryResume = dashboard.primaryResumeId
    ? dashboard.resumes.find((resume) => resume.id === dashboard.primaryResumeId) ?? null
    : null;
  const isPaid = entitlementResolution.plan.key !== "free";

  return (
    <section className="rounded-[2rem] border border-black/8 bg-white/82 p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Publishing
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Public identity
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
            Choose the published resume that represents your account. Your tiny.cv subdomain can point here too.
          </p>
        </div>

        {dashboard.publishing.primaryPublicUrl ? (
          <CopyAccountPublicLinkButton
            label="Copy primary link"
            publicUrl={dashboard.publishing.primaryPublicUrl}
          />
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
        <div className="rounded-[1.35rem] border border-black/8 bg-[#fbf7f0] p-5">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">
            Primary resume
          </p>
          {primaryResume ? (
            <>
              <h3 className="mt-3 text-xl font-bold text-slate-950">{primaryResume.title}</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {dashboard.publishing.primaryPublicUrl}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-50"
                  href={dashboard.publishing.primaryPublicUrl ?? "/"}
                >
                  View public
                </Link>
                <Link
                  className="rounded-full bg-[#065f46] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#044e3a]"
                  href={`/account/resumes/${primaryResume.id}/open`}
                >
                  Open editor
                </Link>
              </div>
            </>
          ) : (
            <>
              <h3 className="mt-3 text-xl font-bold text-slate-950">No primary resume selected.</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Publish a resume, then set it as primary from your resume library.
              </p>
            </>
          )}
        </div>

        <div className="space-y-3">
          <PublishingFeatureRow
            detail={isPaid ? "Active on account-owned public resumes." : "Upgrade to remove Tiny CV branding."}
            label="Branding"
            value={dashboard.publishing.brandingRemoved ? "Removed" : "Tiny CV"}
          />
          <PublishingFeatureRow
            detail={dashboard.publishing.subdomain.included
              ? !subdomainsEnabled
                ? "Included in your plan. Setup unlocks after wildcard DNS is enabled."
                : dashboard.publishing.subdomain.hostname
                ? "Active and pointing at your selected published resume."
                : "Claim one clean tiny.cv address for your public resume."
              : "Upgrade to claim a subdomain."}
            label="Subdomain"
            value={dashboard.publishing.subdomain.hostname ?? (dashboard.publishing.subdomain.included ? subdomainsEnabled ? "Included" : "Coming next" : "Not included")}
          />
          {subdomainsEnabled && dashboard.publishing.subdomain.included && primaryResume ? (
            <div className="rounded-[1.1rem] border border-black/8 bg-white/70 p-4">
              <p className="text-sm font-bold text-slate-950">
                {dashboard.publishing.subdomain.hostname ? "Manage subdomain" : "Claim a subdomain"}
              </p>
              <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
                Use letters, numbers, or hyphens. You can change the name later.
              </p>
              <SubdomainClaimForm
                currentHostname={dashboard.publishing.subdomain.hostname}
                resumeId={primaryResume.id}
              />
            </div>
          ) : null}
          <PublishingFeatureRow
            detail={dashboard.publishing.customDomain.included
              ? "Founder custom domain access is planned after subdomains."
              : "Custom domains are reserved for Founder access later."}
            label="Custom domain"
            value={dashboard.publishing.customDomain.included ? "Founder access" : "Later"}
          />
        </div>
      </div>
    </section>
  );
}

function PublishingFeatureRow({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-black/8 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-950">{label}</p>
        <p className="text-right text-sm font-bold text-[#065f46] break-all">{value}</p>
      </div>
      <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function PlanStatusCard({
  billingLaunchState,
  entitlementResolution,
  hasWorkspaceResumes,
}: {
  billingLaunchState: BillingLaunchState;
  entitlementResolution: EntitlementResolution;
  hasWorkspaceResumes: boolean;
}) {
  const { entitlements, plan, source } = entitlementResolution;

  return (
    <section className="rounded-[2rem] border border-black/8 bg-white/82 p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="flex flex-col gap-7 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Billing
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
              {plan.label}
            </h2>
            {billingLaunchState.stripeMode === "test" ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-amber-800">
                Stripe test mode
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-sm font-medium leading-6 text-slate-600">
            {plan.marketingDescription}
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#065f46]">
            <CheckIcon className="h-4 w-4" />
            {formatEntitlementSource(source)}
          </div>
          {plan.key !== "free" ? (
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              Branding removal applies to public resumes attached to this account
              {hasWorkspaceResumes ? " after you claim this browser's drafts." : "."}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[32rem]">
          <PlanMetric
            label="Branding"
            value={entitlements.removeBranding ? "Removed" : "Tiny CV"}
          />
          <PlanMetric
            label="Subdomain"
            value={entitlements.customSubdomainLimit > 0 ? "Included" : "None"}
          />
          <PlanMetric
            label="Custom domain"
            value={entitlements.customDomainLimit > 0 ? "Planned" : "None"}
          />
          <PlanMetric
            label="PDF exports"
            value={`${entitlements.monthlyPdfExports}/mo`}
          />
        </div>
      </div>

      {plan.key === "free" ? (
        <div className="mt-7 flex flex-col gap-5 rounded-[1.35rem] border border-[#065f46]/15 bg-[#ecfdf5] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-bold text-[#064e3b]">
              Founder Pass: {billingLaunchState.founderPassRemaining} of {billingLaunchState.founderPassLimit} spots left.
            </p>
            <p className="mt-1 text-sm font-medium leading-6 text-[#064e3b]/80">
              One-time $100 for lifetime access. Annual Pro is $40/year. Paid plans remove branding and unlock Pro limits.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <BillingCheckoutButton
              disabled={!billingLaunchState.founderPassAvailable}
              disabledReason="Founder Pass is sold out. Annual Pro is still available."
              planKey="founder"
            >
              Buy Founder Pass
            </BillingCheckoutButton>
            <BillingCheckoutButton planKey="pro" variant="secondary">
              Start Annual Pro
            </BillingCheckoutButton>
          </div>
        </div>
      ) : source.source === "subscription" ? (
        <div className="mt-7 flex flex-col gap-5 rounded-[1.35rem] border border-black/8 bg-[#fbf7f0] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h3 className="text-sm font-bold text-slate-950">Billing management</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
              Manage payment methods, invoices, and subscription changes in Stripe.
            </p>
          </div>
          <BillingPortalButton />
        </div>
      ) : null}
    </section>
  );
}

function SettingsCard({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}) {
  return (
    <section className="rounded-[2rem] border border-black/8 bg-white/82 p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Settings
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-slate-950">
            {userName}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">{userEmail}</p>
        </div>
        <AccountSignOutButton />
      </div>
    </section>
  );
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-black/8 bg-[#fbf7f0] p-4">
      <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-base font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-black/8 bg-[#fbf7f0] p-4">
      <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-base font-bold text-slate-950">{value}</p>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "gold" | "green" | "slate";
}) {
  const toneClass = {
    gold: "bg-amber-50 text-amber-800",
    green: "bg-[#065f46]/10 text-[#065f46]",
    slate: "bg-slate-100 text-slate-500",
  }[tone];

  return (
    <span className={`rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] ${toneClass}`}>
      {label}
    </span>
  );
}

function formatEntitlementSource(source: EntitlementResolution["source"]) {
  if (source.source === "grant") {
    return source.expiresAt
      ? `Granted access through ${formatShortDate(source.expiresAt)}.`
      : "Lifetime access is active.";
  }

  if (source.source === "subscription") {
    if (source.cancelAtPeriodEnd && source.currentPeriodEnd) {
      return `Active until ${formatShortDate(source.currentPeriodEnd)}.`;
    }

    return source.currentPeriodEnd
      ? `Renews ${formatShortDate(source.currentPeriodEnd)}.`
      : "Subscription is active.";
  }

  return "Free plan is active.";
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTemplateKey(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function AccountShell({
  children,
  currentEditorHref,
}: {
  children: ReactNode;
  currentEditorHref: string | null;
}) {
  return (
    <main className="app-shell min-h-screen bg-[#f7f3ec] text-slate-900">
      <AppHeader continueEditingHref={currentEditorHref} isAccountPage />

      <div className="mx-auto w-full max-w-[108rem] px-4 py-5 sm:px-5 lg:px-8 lg:py-7">
        {children}
      </div>
    </main>
  );
}

function AccountValue({ title }: { title: string }) {
  return (
    <div className="rounded-[1rem] border border-black/8 bg-white/70 px-4 py-3">
      {title}
    </div>
  );
}
