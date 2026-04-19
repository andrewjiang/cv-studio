import { headers } from "next/headers";
import Link from "next/link";
import {
  AccountAuthPanel,
  AccountClaimButton,
  AccountSignOutButton,
  BillingCheckoutButton,
  BillingPortalButton,
} from "@/app/_components/account-client-actions";
import { auth } from "@/app/_lib/auth";
import { getAccountDashboard } from "@/app/_lib/account-store";
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_24rem] lg:items-start">
          <section className="rounded-[1.5rem] border border-black/8 bg-white/82 p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#065f46]">
              Account settings
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Save your drafts across browsers.
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">
              Sign in to connect this browser&apos;s resumes to your account. The editor still works anonymously; accounts keep billing, branding removal, and future publishing features tied to you.
            </p>

            <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-3">
              <AccountValue title="Claim browser drafts" />
              <AccountValue title="Use another device" />
              <AccountValue title="Manage paid features" />
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
      </AccountShell>
    );
  }

  const dashboard = await getAccountDashboard(session.user.id);
  const entitlementResolution = await getUserEntitlements(session.user.id);
  const billingLaunchState = await getBillingLaunchState();
  const accountResumeIds = new Set(dashboard.resumes.map((resume) => resume.id));
  const hasUnclaimedWorkspaceResumes = Boolean(
    workspace?.resumes.some((resume) => !accountResumeIds.has(resume.id)),
  );

  return (
    <AccountShell currentEditorHref={currentEditorHref}>
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
        <SettingsNav />

        <div className="min-w-0 space-y-6">
          <section
            className="rounded-[1.5rem] border border-black/8 bg-white/82 p-5 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:p-6"
            id="account"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#065f46]">
                  Account settings
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
                  {session.user.name || "Tiny CV"}
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {session.user.email}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {currentEditorHref ? (
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-[#065f46] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#044e3a] sm:hidden"
                    href={currentEditorHref}
                  >
                    Back to editor
                  </Link>
                ) : null}
                <AccountSignOutButton />
              </div>
            </div>
          </section>

          <AccountClaimButton hasWorkspaceResumes={hasUnclaimedWorkspaceResumes} />

          <BillingStatusNotice
            billingStatus={resolvedSearchParams.billing}
            entitlementResolution={entitlementResolution}
          />

          <PlanStatusCard
            billingLaunchState={billingLaunchState}
            entitlementResolution={entitlementResolution}
            hasWorkspaceResumes={hasUnclaimedWorkspaceResumes}
          />

          <ResumeList
            currentResumeId={dashboard.currentResumeId}
            resumes={dashboard.resumes}
          />
        </div>
      </div>
    </AccountShell>
  );
}

function SettingsNav() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[5.75rem] rounded-[1.25rem] border border-black/8 bg-white/70 p-2 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
        <p className="px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-400">
          Settings
        </p>
        <a className="block rounded-[0.9rem] bg-[#065f46]/8 px-3 py-2 text-sm font-bold text-[#065f46]" href="#account">
          Account
        </a>
        <a className="block rounded-[0.9rem] px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950" href="#plan">
          Plan
        </a>
        <a className="block rounded-[0.9rem] px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950" href="#resumes">
          Resumes
        </a>
      </div>
    </aside>
  );
}

function BillingStatusNotice({
  billingStatus,
  entitlementResolution,
}: {
  billingStatus?: string;
  entitlementResolution: EntitlementResolution;
}) {
  if (billingStatus === "success") {
    const paidPlanActive = entitlementResolution.plan.key !== "free";

    return (
      <div className="rounded-[1.25rem] border border-[#065f46]/15 bg-[#ecfdf5] p-4">
        <h2 className="text-sm font-bold text-slate-950">
          {paidPlanActive ? "Payment complete." : "Payment received."}
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
          {paidPlanActive
            ? `${entitlementResolution.plan.label} is active on this account.`
            : "Stripe is confirming the payment. Refresh this page in a moment if the plan has not changed yet."}
        </p>
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
    <section
      className="rounded-[1.5rem] border border-black/8 bg-white/82 p-5 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:p-6"
      id="plan"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Current plan
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">
              {plan.label}
            </h2>
            {billingLaunchState.stripeMode === "test" ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-amber-800">
                Stripe test mode
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
            {plan.marketingDescription}
          </p>
          <p className="mt-3 text-sm font-bold text-slate-700">
            {formatEntitlementSource(source)}
          </p>
          {plan.key !== "free" ? (
            <p className="mt-2 text-sm font-semibold leading-6 text-[#065f46]">
              Branding removal applies to public resumes attached to this account
              {hasWorkspaceResumes ? " after you claim this browser's drafts." : "."}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[28rem]">
          <PlanMetric
            label="Branding"
            value={entitlements.removeBranding ? "Removed" : "Tiny CV"}
          />
          <PlanMetric
            label="Subdomain"
            value={entitlements.customSubdomainLimit > 0 ? "Included" : "None"}
          />
          <PlanMetric
            label="PDF exports"
            value={`${entitlements.monthlyPdfExports}/mo`}
          />
        </div>
      </div>

      {plan.key === "free" ? (
        <div className="mt-5 flex flex-col gap-4 rounded-[1.1rem] border border-[#065f46]/15 bg-[#ecfdf5] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#064e3b]">
              Founder Pass: {billingLaunchState.founderPassRemaining} of {billingLaunchState.founderPassLimit} spots left.
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#064e3b]/80">
              $100 lifetime for early users. Annual Pro is $40/year and stays available.
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
        <div className="mt-5 flex flex-col gap-4 rounded-[1.1rem] border border-black/8 bg-[#fbf7f0] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Manage payment methods, invoices, and subscription changes in Stripe.
          </p>
          <BillingPortalButton />
        </div>
      ) : null}
    </section>
  );
}

function ResumeList({
  currentResumeId,
  resumes,
}: {
  currentResumeId: string | null;
  resumes: Array<{
    id: string;
    isPublished: boolean;
    slug: string;
    templateKey: string;
    title: string;
  }>;
}) {
  return (
    <section id="resumes">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Resumes
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">Account resumes</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Open a resume and continue in the editor.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-[#065f46] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#044e3a]"
          href="/new"
        >
          New resume
        </Link>
      </div>

      {resumes.length > 0 ? (
        <div className="mt-4 divide-y divide-black/8 overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/82 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
          {resumes.map((resume) => (
            <div
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              key={resume.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-950">{resume.title}</h3>
                  {currentResumeId === resume.id ? (
                    <span className="rounded-full bg-[#065f46]/10 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#065f46]">
                      Current
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  /{resume.slug} · {resume.isPublished ? "Published" : "Draft"} · {resume.templateKey}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {resume.isPublished ? (
                  <Link
                    className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-50"
                    href={`/${resume.slug}`}
                  >
                    View public
                  </Link>
                ) : null}
                <Link
                  className="rounded-full bg-[#065f46] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#044e3a]"
                  href={`/account/resumes/${resume.id}/open`}
                >
                  Open editor
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[1.5rem] border border-black/8 bg-white/82 p-8 text-center shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
          <h3 className="text-lg font-bold text-slate-950">No account resumes yet.</h3>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
            Start a resume or claim the drafts already in this browser.
          </p>
        </div>
      )}
    </section>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-black/8 bg-[#fbf7f0] p-4">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-base font-bold text-slate-950">{value}</p>
    </div>
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

function AccountShell({
  children,
  currentEditorHref,
}: {
  children: React.ReactNode;
  currentEditorHref: string | null;
}) {
  return (
    <main className="app-shell min-h-screen bg-[#f7f3ec] text-slate-900">
      <header className="app-chrome sticky top-0 z-20 border-b border-black/8 bg-white/84 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[108rem] items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-8">
          <Link className="group flex items-center gap-2" href={currentEditorHref ?? "/new"}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#065f46] text-white shadow-sm transition group-hover:scale-105">
              <span className="text-[0.65rem] font-bold tracking-tight">CV</span>
            </div>
            <div>
              <p className="text-[0.76rem] font-bold uppercase leading-none tracking-[0.24em] text-slate-950">
                Tiny CV
              </p>
              <p className="mt-1 hidden text-[0.76rem] font-medium leading-none text-slate-500 sm:block">
                Account settings
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            {currentEditorHref ? (
              <Link
                className="hidden rounded-full border border-black/10 bg-white/92 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-white sm:inline-flex"
                href={currentEditorHref}
              >
                Back to editor
              </Link>
            ) : null}
            <Link
              className="rounded-full border border-black/10 bg-white/92 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-white"
              href="/new"
            >
              New resume
            </Link>
          </nav>
        </div>
      </header>

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
