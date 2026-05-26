import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminStoreUnavailableError,
  getAdminUserDetail,
} from "@/app/_lib/admin-store";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminShell,
  AdminUnavailable,
  StatusPill,
  adminPanelClass,
  formatAdminDate,
  formatAdminNumber,
  planTone,
  statusTone,
} from "@/app/admin/_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  let user;

  try {
    user = await getAdminUserDetail(userId);
  } catch (error) {
    if (error instanceof AdminStoreUnavailableError) {
      return <AdminUnavailable />;
    }

    throw error;
  }

  if (!user) {
    notFound();
  }

  return (
    <AdminShell currentPath="/admin/users">
      <AdminPageHeader
        action={<StatusPill tone={planTone(user.planKey)}>{user.planKey}</StatusPill>}
        eyebrow={user.email}
        title={user.name || "User"}
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr]">
        <section className={adminPanelClass}>
          <h2 className="text-base font-bold text-slate-950">Account</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <DetailRow label="User ID" value={user.id} />
            <DetailRow label="Created" value={formatAdminDate(user.createdAt)} />
            <DetailRow label="Updated" value={formatAdminDate(user.updatedAt)} />
            <DetailRow label="Stripe" value={user.billingCustomer?.stripeCustomerId ?? "-"} />
            <DetailRow label="Project" value={user.project?.slug ?? "-"} />
            <DetailRow label="API keys" value={user.project ? formatAdminNumber(user.project.activeApiKeyCount) : "-"} />
          </dl>
        </section>

        <section className={adminPanelClass}>
          <h2 className="text-base font-bold text-slate-950">CVs</h2>
          <div className="mt-4 divide-y divide-black/5">
            {user.resumes.length > 0 ? user.resumes.map((resume) => (
              <div className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center" key={resume.id}>
                <div>
                  <p className="text-sm font-bold text-slate-950">{resume.title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{resume.slug} · {resume.templateKey}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusPill tone={resume.isPublished ? "green" : "slate"}>
                    {resume.isPublished ? "published" : "draft"}
                  </StatusPill>
                  {resume.publicUrl ? (
                    <Link className="text-xs font-bold text-[#065f46] hover:text-[#064e3b]" href={resume.publicUrl}>
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
            )) : <AdminEmptyState label="No CVs." />}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className={adminPanelClass}>
          <h2 className="text-base font-bold text-slate-950">Grants</h2>
          <div className="mt-4 space-y-3">
            {user.grants.length > 0 ? user.grants.map((grant) => (
              <div className="rounded-[0.9rem] bg-white/65 p-3" key={`${grant.source}:${grant.createdAt}`}>
                <div className="flex items-center justify-between gap-2">
                  <StatusPill tone={grant.revokedAt ? "red" : planTone(grant.planKey)}>{grant.planKey}</StatusPill>
                  <span className="text-xs font-bold text-slate-400">{formatAdminDate(grant.createdAt)}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{grant.source}</p>
              </div>
            )) : <AdminEmptyState label="No grants." />}
          </div>
        </section>

        <section className={adminPanelClass}>
          <h2 className="text-base font-bold text-slate-950">Billing</h2>
          <div className="mt-4 space-y-3">
            {user.subscriptions.length > 0 ? user.subscriptions.map((subscription) => (
              <div className="rounded-[0.9rem] bg-white/65 p-3" key={subscription.providerSubscriptionId}>
                <div className="flex items-center justify-between gap-2">
                  <StatusPill tone={statusTone(subscription.status)}>{subscription.status}</StatusPill>
                  <span className="text-xs font-bold text-slate-400">{subscription.planKey}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Ends {formatAdminDate(subscription.currentPeriodEnd)}
                </p>
              </div>
            )) : <AdminEmptyState label="No subscriptions." />}
          </div>
        </section>

        <section className={adminPanelClass}>
          <h2 className="text-base font-bold text-slate-950">Usage</h2>
          <div className="mt-4 space-y-2">
            {user.usage.length > 0 ? user.usage.map((usage) => (
              <div className="flex items-center justify-between gap-3 rounded-[0.9rem] bg-white/65 px-3 py-2.5" key={usage.action}>
                <span className="text-xs font-bold text-slate-700">{usage.action}</span>
                <StatusPill>{formatAdminNumber(usage.quantity)}</StatusPill>
              </div>
            )) : <AdminEmptyState label="No recent usage." />}
          </div>
        </section>
      </div>

      <section className={`${adminPanelClass} mt-5`}>
        <h2 className="text-base font-bold text-slate-950">Domains</h2>
        <div className="mt-4 divide-y divide-black/5">
          {user.domains.length > 0 ? user.domains.map((domain) => (
            <div className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center" key={`${domain.hostname}:${domain.resumeId}`}>
              <div>
                <p className="text-sm font-bold text-slate-950">{domain.hostname}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{domain.domainType}</p>
              </div>
              <StatusPill tone={statusTone(domain.status)}>{domain.status}</StatusPill>
            </div>
          )) : <AdminEmptyState label="No domains." />}
        </div>
      </section>
    </AdminShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-black/5 pb-2 last:border-0 sm:grid-cols-[7rem_1fr]">
      <dt className="font-bold text-slate-400">{label}</dt>
      <dd className="break-all font-semibold text-slate-700">{value}</dd>
    </div>
  );
}
