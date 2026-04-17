import { headers } from "next/headers";
import Link from "next/link";
import {
  AccountAuthPanel,
  AccountClaimButton,
  AccountSignOutButton,
} from "@/app/_components/account-client-actions";
import { auth } from "@/app/_lib/auth";
import { getAccountDashboard } from "@/app/_lib/account-store";
import { getUserEntitlements } from "@/app/_lib/entitlements";
import type { EntitlementResolution } from "@/app/_lib/entitlements-core";
import { getWorkspace } from "@/app/_lib/hosted-resume-store";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const workspaceId = await readWorkspaceCookie();
  const workspace = workspaceId ? await getWorkspace(workspaceId) : null;
  const hasWorkspaceResumes = Boolean(workspace?.resumes.length);

  if (!session?.user?.id) {
    return (
      <AccountShell>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,0.75fr)] lg:items-start">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.26em] text-[#065f46]">
              Account
            </p>
            <h1
              className="mt-5 text-[3.3rem] font-medium leading-[0.92] tracking-[-0.05em] text-slate-950 sm:text-[4.2rem]"
              style={{ fontFamily: "var(--font-display-newsreader)" }}
            >
              Keep your drafts across browsers.
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-slate-600">
              Sign in to attach this anonymous workspace to a user account. Anonymous editing still works; accounts give us the durable identity layer for Pro, subdomains, and hosted versions.
            </p>
            <div className="mt-8 grid gap-4 text-sm font-semibold text-slate-700 sm:grid-cols-3">
              <AccountValue title="Claim drafts" />
              <AccountValue title="Switch devices" />
              <AccountValue title="Prepare for Pro" />
            </div>
          </div>

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

  return (
    <AccountShell>
      <div className="flex flex-col gap-6 border-b border-black/8 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.26em] text-[#065f46]">
            Account
          </p>
          <h1
            className="mt-4 text-[2.7rem] font-medium leading-[0.95] tracking-[-0.045em] text-slate-950 sm:text-[3.5rem]"
            style={{ fontFamily: "var(--font-display-newsreader)" }}
          >
            {session.user.name || "Tiny CV"} workspace
          </h1>
          <p className="mt-4 text-base font-medium text-slate-600">
            {session.user.email}
          </p>
        </div>
        <AccountSignOutButton />
      </div>

      <div className="mt-8 space-y-8">
        <AccountClaimButton hasWorkspaceResumes={hasWorkspaceResumes} />

        <PlanStatusCard entitlementResolution={entitlementResolution} />

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Hosted drafts</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Open a resume to attach it to this browser and continue editing.
              </p>
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[#065f46] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#044e3a]"
              href="/new"
            >
              Start a new resume
            </Link>
          </div>

          {dashboard.resumes.length > 0 ? (
            <div className="mt-5 divide-y divide-black/8 overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/75">
              {dashboard.resumes.map((resume) => (
                <div
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  key={resume.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-950">{resume.title}</h3>
                      {dashboard.currentResumeId === resume.id ? (
                        <span className="rounded-full bg-[#065f46]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#065f46]">
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
                      className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                      href={`/account/resumes/${resume.id}/open`}
                    >
                      Open editor
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-black/8 bg-white/75 p-8 text-center">
              <h3 className="text-lg font-bold text-slate-950">No account drafts yet.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                Start a resume or claim the drafts already in this browser.
              </p>
            </div>
          )}
        </section>
      </div>
    </AccountShell>
  );
}

function PlanStatusCard({
  entitlementResolution,
}: {
  entitlementResolution: EntitlementResolution;
}) {
  const { entitlements, plan, source } = entitlementResolution;

  return (
    <section className="rounded-[1.75rem] border border-black/8 bg-white/75 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#065f46]">
            Plan
          </p>
          <h2
            className="mt-3 text-3xl font-medium tracking-[-0.04em] text-slate-950"
            style={{ fontFamily: "var(--font-display-newsreader)" }}
          >
            {plan.label}
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
            {plan.marketingDescription}
          </p>
          <p className="mt-4 text-sm font-bold text-slate-700">
            {formatEntitlementSource(source)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[30rem]">
          <PlanMetric
            label="Branding"
            value={entitlements.removeBranding ? "Removed" : "Tiny CV"}
          />
          <PlanMetric
            label="Subdomains"
            value={String(entitlements.customSubdomainLimit)}
          />
          <PlanMetric
            label="PDF exports"
            value={`${entitlements.monthlyPdfExports}/mo`}
          />
        </div>
      </div>

      {plan.key === "free" ? (
        <div className="mt-5 rounded-2xl border border-[#065f46]/15 bg-[#ecfdf5] px-4 py-3 text-sm font-semibold leading-6 text-[#064e3b]">
          Payments are the next slice: Founder Pass first, then annual Pro.
        </div>
      ) : null}
    </section>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-[#fbf7f0] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
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

function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fbf7f0] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Link className="group flex items-center gap-2" href="/">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#065f46] text-white shadow-sm transition group-hover:scale-105">
              <span className="text-[0.65rem] font-bold tracking-tight">CV</span>
            </div>
            <p className="text-[0.85rem] font-bold uppercase tracking-[0.28em] text-slate-950">
              Tiny CV
            </p>
          </Link>
          <Link
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-white"
            href="/new"
          >
            New resume
          </Link>
        </header>

        <div className="flex-1 py-14 sm:py-20">
          {children}
        </div>
      </div>
    </main>
  );
}

function AccountValue({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white/60 px-4 py-3">
      {title}
    </div>
  );
}
