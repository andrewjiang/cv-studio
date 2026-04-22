import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AccountAuthPanel,
  AccountApiKeyCreateForm,
  AccountBillingRefresh,
  AccountSignOutButton,
  BillingCheckoutButton,
  BillingPortalButton,
  BillingSubscriptionActionButton,
  CopyAccountPublicLinkButton,
  SubdomainClaimForm,
} from "@/app/_components/account-client-actions";
import { AccountShell } from "@/app/_components/account-shell";
import { brandPrimaryButtonClass } from "@/app/_components/button-classes";
import { CheckIcon } from "@/app/_components/icons";
import { ResumePaperPreview } from "@/app/_components/resume-paper-preview";
import {
  getAccountDeveloperSettings,
  type AccountDeveloperSettings,
} from "@/app/_lib/account-developer-store";
import { auth } from "@/app/_lib/auth";
import {
  getAccountDashboard,
  type AccountDashboardPayload,
} from "@/app/_lib/account-store";
import {
  getAccountBillingManagementSummary,
  getBillingLaunchState,
  type AccountBillingHistoryItem,
  type AccountBillingManagementSummary,
  type BillingLaunchState,
} from "@/app/_lib/billing";
import { getUserEntitlements } from "@/app/_lib/entitlements";
import type { EntitlementResolution } from "@/app/_lib/entitlements-core";
import { getWorkspace } from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";
const ACCOUNT_PANEL_CLASS =
  "rounded-[1.6rem] border border-black/6 bg-white/76 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-6";

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
  const currentEditorHref = workspace?.currentResumeId
    ? `/studio/${workspace.currentResumeId}`
    : null;

  if (!session?.user?.id) {
    return (
      <AccountShell currentEditorHref={currentEditorHref}>
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center py-8">
          <div className="w-full">
            <AccountAuthPanel
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
  const developerSettings = await getAccountDeveloperSettings(session.user.id);
  const billingManagement = await getAccountBillingManagementSummary(session.user.id);
  const billingLaunchState = await getBillingLaunchState();
  const accountResumeIds = new Set(dashboard.resumes.map((resume) => resume.id));
  const hasUnclaimedWorkspaceResumes = Boolean(
    workspace?.resumes.some((resume) => !accountResumeIds.has(resume.id)),
  );

  return (
    <AccountShell currentEditorHref={currentEditorHref}>
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <AccountHeader
          userEmail={session.user.email}
          userName={session.user.name}
        />

        <BillingStatusNotice
          billingStatus={resolvedSearchParams.billing}
          dashboard={dashboard}
          entitlementResolution={entitlementResolution}
          hasUnclaimedWorkspaceResumes={hasUnclaimedWorkspaceResumes}
        />

        <section className="scroll-mt-24" id="publishing">
          <PublishingIdentityCard
            dashboard={dashboard}
            subdomainsEnabled={process.env.TINYCV_SUBDOMAINS_ENABLED === "true"}
          />
        </section>

        <section className="scroll-mt-24" id="billing">
          <PlanStatusCard
            billingManagement={billingManagement}
            billingLaunchState={billingLaunchState}
            entitlementResolution={entitlementResolution}
          />
        </section>

        <section className="scroll-mt-24" id="api">
          <DeveloperApiCard
            developerSettings={developerSettings}
          />
        </section>
      </div>
    </AccountShell>
  );
}

function AccountHeader({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName?: string | null;
}) {
  return (
    <header className={ACCOUNT_PANEL_CLASS}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Account
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {userName ? `${userName} · ` : ""}
            {userEmail}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            href="/cvs"
          >
            My CVs
          </Link>
          <AccountSignOutButton />
        </div>
      </div>
    </header>
  );
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
      <div className="rounded-[1.4rem] border border-[#065f46]/15 bg-[#ecfdf5] p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              {entitlementResolution.plan.label} is active.
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              Paid publishing settings are now active on your account.
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
            label="Publish a CV"
          />
          <PurchaseChecklistItem
            complete={Boolean(dashboard.primaryResumeId)}
            label="Choose primary CV"
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

function PublishingIdentityCard({
  dashboard,
  subdomainsEnabled,
}: {
  dashboard: AccountDashboardPayload;
  subdomainsEnabled: boolean;
}) {
  const primaryResume = dashboard.primaryResumeId
    ? dashboard.resumes.find((resume) => resume.id === dashboard.primaryResumeId) ?? null
    : null;
  const primarySubdomain = dashboard.publishing.subdomain.hostname;
  const primaryPublicUrl = dashboard.publishing.primaryPublicUrl;

  return (
    <section className={ACCOUNT_PANEL_CLASS}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Publishing
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Primary CV
          </h2>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
          href="/cvs"
        >
          Change primary
        </Link>
      </div>

      {primaryResume ? (
        <div className="mt-6 grid gap-6 rounded-[1.35rem] border border-black/8 bg-[#fbf7f0] p-5 sm:p-6 lg:grid-cols-[minmax(0,32rem)_minmax(22rem,1fr)] lg:items-start">
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <ResumePaperPreview
              className="!rounded-[0.24rem] !border-slate-200 shadow-[0_26px_58px_rgba(15,23,42,0.22)]"
              cropHeightRatio={1}
              fitScale={primaryResume.fitScale}
              markdown={primaryResume.markdown}
              mobileScale={0.38}
              scale={0.52}
              templateKey={primaryResume.templateKey}
            />
            <Link
              className="text-sm font-bold text-slate-600 underline decoration-black/15 underline-offset-4 transition hover:text-slate-950"
              href={`/cvs/${primaryResume.id}/open`}
            >
              Open editor
            </Link>
          </div>

          <div className="min-w-0 space-y-3 lg:min-w-[22rem]">
            <PublishedLinkRow
              action={primaryPublicUrl ? (
                <CopyAccountPublicLinkButton
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-slate-50"
                  label="Copy"
                  publicUrl={primaryPublicUrl}
                />
              ) : null}
              href={primaryPublicUrl}
              label="Public link"
            />
            <PublishedLinkRow
              action={primarySubdomain ? (
                <CopyAccountPublicLinkButton
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-slate-50"
                  label="Copy"
                  publicUrl={`https://${primarySubdomain}`}
                />
              ) : null}
              href={primarySubdomain ? `https://${primarySubdomain}` : null}
              label="Subdomain"
              value={primarySubdomain ?? (dashboard.publishing.subdomain.included ? "Not claimed" : "Not included")}
            />

            {subdomainsEnabled && dashboard.publishing.subdomain.included ? (
              <div className="rounded-[1rem] border border-black/8 bg-white/72 p-4">
                <p className="text-sm font-bold text-slate-950">
                  {primarySubdomain ? "Update subdomain" : "Claim subdomain"}
                </p>
                <SubdomainClaimForm
                  currentHostname={primarySubdomain}
                  resumeId={primaryResume.id}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[1.35rem] border border-black/8 bg-[#fbf7f0] p-5">
          <p className="text-lg font-bold text-slate-950">No primary CV selected.</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Pick a published CV from My CVs.
          </p>
          <Link
            className={`${brandPrimaryButtonClass} mt-4 px-4 py-2.5 text-sm`}
            href="/cvs"
          >
            Open My CVs
          </Link>
        </div>
      )}
    </section>
  );
}

function PublishedLinkRow({
  action,
  href,
  label,
  value,
}: {
  action?: ReactNode;
  href?: string | null;
  label: string;
  value?: string;
}) {
  const displayedValue = value ?? href;

  return (
    <div className="grid gap-2 rounded-[1rem] border border-black/8 bg-white/72 px-4 py-3 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      {href ? (
        <a
          className="min-w-0 break-all text-sm font-bold text-slate-950 underline decoration-black/15 underline-offset-4 transition hover:text-[#065f46]"
          href={href}
          rel="noreferrer"
          target="_blank"
        >
          {displayedValue}
        </a>
      ) : (
        <p className="text-sm font-bold text-slate-500">{displayedValue}</p>
      )}
      {action ? <div className="sm:justify-self-end">{action}</div> : null}
    </div>
  );
}

function PlanStatusCard({
  billingManagement,
  billingLaunchState,
  entitlementResolution,
}: {
  billingManagement: AccountBillingManagementSummary;
  billingLaunchState: BillingLaunchState;
  entitlementResolution: EntitlementResolution;
}) {
  const { plan, source } = entitlementResolution;
  const subscription = billingManagement.subscription;

  return (
    <section className={ACCOUNT_PANEL_CLASS}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#065f46]">
            Billing
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
              {plan.label}
            </h2>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm font-bold text-[#065f46]">
            <CheckIcon className="h-4 w-4" />
            {formatEntitlementSource(source)}
          </div>
        </div>
        {subscription ? (
          <BillingSubscriptionActionButton
            cancelAtPeriodEnd={!subscription.cancelAtPeriodEnd}
          />
        ) : null}
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
      ) : (
        <BillingManagementPanel
          billingManagement={billingManagement}
        />
      )}
    </section>
  );
}

function BillingManagementPanel({
  billingManagement,
}: {
  billingManagement: AccountBillingManagementSummary;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-[1.35rem] border border-black/8 bg-[#fbf7f0] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-950">Payment method</h3>
            {billingManagement.paymentMethod ? (
              <>
                <p className="mt-3 text-lg font-bold text-slate-950">
                  {formatCardBrand(billingManagement.paymentMethod.brand)} ending in {billingManagement.paymentMethod.last4}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Expires {String(billingManagement.paymentMethod.expMonth).padStart(2, "0")}/{billingManagement.paymentMethod.expYear}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                {billingManagement.hasStripeCustomer
                  ? "No saved card is available for this account yet."
                  : "No Stripe customer is linked to this account yet."}
              </p>
            )}
          </div>
          {billingManagement.portalAvailable ? (
            <div className="shrink-0">
              <BillingPortalButton>Update payment method</BillingPortalButton>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-black/8 bg-[#fbf7f0] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-950">Billing history</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
              Recent charges and invoice links.
            </p>
          </div>
        </div>

        {billingManagement.billingHistory.length > 0 ? (
          <div className="mt-4 divide-y divide-black/8 overflow-hidden rounded-[1rem] border border-black/8 bg-white/72">
            {billingManagement.billingHistory.map((item) => (
              <BillingHistoryRow item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-[1rem] border border-black/8 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-500">
            No billing history yet.
          </p>
        )}
      </div>
    </div>
  );
}

function BillingHistoryRow({ item }: { item: AccountBillingHistoryItem }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-slate-900">{item.label}</p>
        <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          {formatShortDate(item.createdAt)} · {item.status.replace(/_/g, " ")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-bold text-slate-950">
          {formatCurrency(item.amount, item.currency)}
        </p>
        {item.hostedInvoiceUrl ? (
          <a
            className="text-sm font-bold text-[#065f46] transition hover:text-[#044e34]"
            href={item.hostedInvoiceUrl}
            rel="noreferrer"
            target="_blank"
          >
            View
          </a>
        ) : null}
        {item.invoicePdf ? (
          <a
            className="text-sm font-bold text-[#065f46] transition hover:text-[#044e34]"
            href={item.invoicePdf}
            rel="noreferrer"
            target="_blank"
          >
            PDF
          </a>
        ) : null}
      </div>
    </div>
  );
}

function DeveloperApiCard({
  developerSettings,
}: {
  developerSettings: AccountDeveloperSettings;
}) {
  return (
    <section className={ACCOUNT_PANEL_CLASS}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#065f46]">
            API
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Developer access
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            href="/documentation"
          >
            Docs
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            href="/api/v1/openapi.json"
          >
            OpenAPI
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-[1.35rem] border border-black/8 bg-[#fbf7f0] p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1fr)]">
          <div>
            <h3 className="text-base font-bold text-slate-950">Create an API key</h3>
            <div className="mt-4">
              <AccountApiKeyCreateForm />
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-950">Existing keys</h3>
            {developerSettings.apiKeys.length > 0 ? (
              <div className="mt-4 space-y-2">
                {developerSettings.apiKeys.map((apiKey) => (
                  <div
                    className="flex flex-col gap-1 rounded-xl border border-black/8 bg-white/72 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    key={apiKey.id}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{apiKey.label}</p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-slate-500">
                        {apiKey.keyPrefix}...
                      </p>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      {apiKey.lastUsedAt ? `Used ${formatShortDate(apiKey.lastUsedAt)}` : `Created ${formatShortDate(apiKey.createdAt)}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-black/8 bg-white/72 px-3 py-2.5 text-sm font-semibold text-slate-500">
                No keys yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
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

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount === null || !currency) {
    return "—";
  }

  return new Intl.NumberFormat("en", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amount / 100);
}

function formatCardBrand(brand: string) {
  if (!brand) {
    return "Card";
  }

  return brand
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
