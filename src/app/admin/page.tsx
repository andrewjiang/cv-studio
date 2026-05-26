import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminAnalyticsSnapshot } from "@/app/_lib/admin-analytics";
import { getLatestAdminAnalyticsSnapshot } from "@/app/_lib/admin-analytics";
import {
  AdminActivity,
  AdminMetric,
  AdminPaidAccount,
  AdminPaymentReceipt,
  AdminPdfJobSummary,
  AdminResumeSummary,
  AdminStoreUnavailableError,
  AdminUserSummary,
  AdminWebhookDeliverySummary,
  getAdminActivity,
  getAdminJobs,
  getAdminOverview,
  getAdminPaidAccounts,
  getAdminPaymentReceipts,
  searchAdminResumes,
  searchAdminUsers,
} from "@/app/_lib/admin-store";
import { AdminTrafficView } from "@/app/admin/_components/admin-traffic-view";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminShell,
  AdminUnavailable,
  StatusPill,
  adminButtonClass,
  adminInputClass,
  adminPanelClass,
  formatAdminDate,
  formatAdminNumber,
  planTone,
  statusTone,
} from "@/app/admin/_components/admin-ui";

export const dynamic = "force-dynamic";

type AdminTabKey = "activity" | "jobs" | "paid" | "payments" | "resumes" | "traffic" | "users";
type AdminTabData =
  | { tab: "activity"; activity: AdminActivity[] }
  | { tab: "jobs"; jobs: { pdfJobs: AdminPdfJobSummary[]; webhookDeliveries: AdminWebhookDeliverySummary[] } }
  | { tab: "paid"; paidAccounts: AdminPaidAccount[] }
  | { tab: "payments"; payments: AdminPaymentReceipt[] }
  | { tab: "resumes"; resumes: AdminResumeSummary[] }
  | { tab: "traffic"; snapshot: AdminAnalyticsSnapshot | null }
  | { tab: "users"; users: AdminUserSummary[] };

const ADMIN_TABS: { href?: string; key: AdminTabKey; label: string; metricKey?: AdminMetric["key"] }[] = [
  { href: "/admin/traffic", key: "traffic", label: "Visitors / Page views" },
  { key: "users", label: "Users", metricKey: "users" },
  { href: "/admin/resumes", key: "resumes", label: "CVs", metricKey: "resumes" },
  { key: "paid", label: "Subscriptions / Paid", metricKey: "paid" },
  { href: "/admin/jobs", key: "jobs", label: "Jobs / Webhooks" },
  { key: "payments", label: "Payments", metricKey: "payments" },
  { key: "activity", label: "Activity" },
];

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; tab?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = getActiveTab(resolvedSearchParams.tab);
  const query = (resolvedSearchParams.q ?? "").trim();
  let overview: Awaited<ReturnType<typeof getAdminOverview>>;
  let analyticsSnapshot: AdminAnalyticsSnapshot | null;
  let tableData: Awaited<ReturnType<typeof getTabData>>;

  try {
    [overview, analyticsSnapshot] = await Promise.all([
      getAdminOverview(),
      getLatestAdminAnalyticsSnapshot(),
    ]);
    tableData = await getTabData(activeTab, query, analyticsSnapshot);
  } catch (error) {
    if (error instanceof AdminStoreUnavailableError) {
      return <AdminUnavailable />;
    }

    throw error;
  }

  const metrics = new Map(overview.metrics.map((metric) => [metric.key, metric]));
  const jobsValue = overview.issues.reduce((sum, issue) => sum + issue.count, 0);

  return (
    <AdminShell currentPath="/admin">
      <AdminPageHeader title="Overview" />

      <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <nav className={`${adminPanelClass} p-3 sm:p-3`}>
            <div className="grid gap-2">
              {ADMIN_TABS.map((tab) => {
                const metric = tab.metricKey ? metrics.get(tab.metricKey) : null;
                const value = tab.key === "jobs"
                  ? jobsValue
                  : tab.key === "traffic"
                    ? analyticsSnapshot?.payload.traffic24h.pageViews ?? null
                    : metric?.value ?? null;
                const detail = tabDetail(tab.key, metric, overview.issues, analyticsSnapshot);

                return (
                  <SidebarTab
                    active={activeTab === tab.key}
                    detail={detail}
                    key={tab.key}
                    tab={tab.key}
                    title={tab.label}
                    value={value}
                  />
                );
              })}
            </div>
          </nav>
        </aside>

        <section className={`${adminPanelClass} min-w-0`}>
          <TableHeader
            activeTab={activeTab}
            href={ADMIN_TABS.find((tab) => tab.key === activeTab)?.href}
            query={query}
          />
          <TabTable activeTab={activeTab} data={tableData} />
        </section>
      </div>
    </AdminShell>
  );
}

async function getTabData(
  activeTab: AdminTabKey,
  query: string,
  analyticsSnapshot: AdminAnalyticsSnapshot | null,
): Promise<AdminTabData> {
  if (activeTab === "traffic") {
    return { snapshot: analyticsSnapshot, tab: "traffic" };
  }

  if (activeTab === "users") {
    return { tab: "users", users: await searchAdminUsers(query, 50) };
  }

  if (activeTab === "resumes") {
    return { resumes: await searchAdminResumes(query, 50), tab: "resumes" };
  }

  if (activeTab === "paid") {
    return { paidAccounts: await getAdminPaidAccounts(50), tab: "paid" };
  }

  if (activeTab === "jobs") {
    return { jobs: await getAdminJobs(), tab: "jobs" };
  }

  if (activeTab === "payments") {
    return { payments: await getAdminPaymentReceipts(50), tab: "payments" };
  }

  return { activity: await getAdminActivity(50), tab: "activity" };
}

function tabDetail(
  tabKey: AdminTabKey,
  metric: AdminMetric | null | undefined,
  issues: { count: number; label: string }[],
  analyticsSnapshot: AdminAnalyticsSnapshot | null,
) {
  if (tabKey === "jobs") {
    return issues.map((issue) => `${issue.count} ${issue.label.toLowerCase()}`).join(" · ");
  }

  if (tabKey === "traffic") {
    const visitors = analyticsSnapshot?.payload.traffic24h.visitors;
    return visitors === undefined
      ? "No analytics snapshot"
      : `${formatAdminNumber(visitors)} visitors 24h`;
  }

  return metric?.detail ?? "Recent events";
}

function SidebarTab({
  active,
  detail,
  tab,
  title,
  value,
}: {
  active: boolean;
  detail: string;
  tab: AdminTabKey;
  title: string;
  value: number | null;
}) {
  return (
    <Link
      className={`rounded-[1rem] border p-3 transition ${
        active
          ? "border-[#065f46]/15 bg-[#ecfdf5] shadow-sm"
          : "border-black/5 bg-white/65 hover:bg-white"
      }`}
      href={`/admin?tab=${tab}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-bold ${active ? "text-[#065f46]" : "text-slate-700"}`}>{title}</p>
        {value !== null ? (
          <p className="text-xl font-semibold tracking-[-0.04em] text-slate-950">
            {formatAdminNumber(value)}
          </p>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{detail}</p>
    </Link>
  );
}

function TableHeader({
  activeTab,
  href,
  query,
}: {
  activeTab: AdminTabKey;
  href?: string;
  query: string;
}) {
  const searchable = activeTab === "users" || activeTab === "resumes";
  const title = ADMIN_TABS.find((tab) => tab.key === activeTab)?.label ?? "Table";

  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-black/5 pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {ADMIN_TABS.map((tab) => (
            <Link
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                activeTab === tab.key
                  ? "bg-[#065f46] !text-white"
                  : "border border-black/8 bg-white text-slate-600 hover:text-slate-950"
              }`}
              href={`/admin?tab=${tab.key}`}
              key={tab.key}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {searchable ? (
          <form action="/admin" className="flex flex-col gap-2 sm:w-[28rem] sm:flex-row" method="GET">
            <input name="tab" type="hidden" value={activeTab} />
            <input
              className={adminInputClass}
              defaultValue={query}
              name="q"
              placeholder={activeTab === "users" ? "Email, name, or user id" : "Title, slug, email, or CV id"}
              type="search"
            />
            <button className={`${adminButtonClass} sm:w-auto`} type="submit">
              Search
            </button>
          </form>
        ) : null}
        {href ? (
          <Link className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50" href={href}>
            Full page
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function TabTable({
  activeTab,
  data,
}: {
  activeTab: AdminTabKey;
  data: AdminTabData;
}) {
  if (activeTab === "users" && data.tab === "users") {
    return <UsersTable users={data.users} />;
  }

  if (activeTab === "traffic" && data.tab === "traffic") {
    return <AdminTrafficView compact snapshot={data.snapshot} />;
  }

  if (activeTab === "resumes" && data.tab === "resumes") {
    return <ResumesTable resumes={data.resumes} />;
  }

  if (activeTab === "paid" && data.tab === "paid") {
    return <PaidTable paidAccounts={data.paidAccounts} />;
  }

  if (activeTab === "jobs" && data.tab === "jobs") {
    return <JobsTable jobs={data.jobs} />;
  }

  if (activeTab === "payments" && data.tab === "payments") {
    return <PaymentsTable payments={data.payments} />;
  }

  if (data.tab === "activity") {
    return <ActivityTable activity={data.activity} />;
  }

  return <AdminEmptyState label="No rows." />;
}

function UsersTable({ users }: { users: AdminUserSummary[] }) {
  if (users.length === 0) {
    return <AdminEmptyState label="No users." />;
  }

  return (
    <ResponsiveTable minWidth="860px">
      <thead>
        <tr>
          <TableHead>User</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>CVs</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Joined</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {users.map((user) => (
          <tr key={user.id}>
            <TableCell>
              <Link className="font-bold text-slate-950 hover:text-[#065f46]" href={`/admin/users/${user.id}`}>
                {user.email}
              </Link>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{user.name}</p>
            </TableCell>
            <TableCell><StatusPill tone={planTone(user.planKey)}>{user.planKey}</StatusPill></TableCell>
            <TableCell>{formatAdminNumber(user.resumeCount)}</TableCell>
            <TableCell>{user.projectSlug ?? "-"}</TableCell>
            <TableCell>{formatAdminDate(user.createdAt)}</TableCell>
          </tr>
        ))}
      </tbody>
    </ResponsiveTable>
  );
}

function ResumesTable({ resumes }: { resumes: AdminResumeSummary[] }) {
  if (resumes.length === 0) {
    return <AdminEmptyState label="No CVs." />;
  }

  return (
    <ResponsiveTable minWidth="980px">
      <thead>
        <tr>
          <TableHead>CV</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Updated</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {resumes.map((resume) => (
          <tr key={resume.id}>
            <TableCell>
              <p className="font-bold text-slate-950">{resume.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{resume.slug} · {resume.templateKey}</p>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={resume.isPublished ? "green" : "slate"}>
                  {resume.isPublished ? "published" : "draft"}
                </StatusPill>
                {resume.publicUrl ? (
                  <Link className="text-xs font-bold text-[#065f46] hover:text-[#064e3b]" href={resume.publicUrl}>
                    Open
                  </Link>
                ) : null}
              </div>
            </TableCell>
            <TableCell>{resume.ownerEmail ?? "-"}</TableCell>
            <TableCell>{resume.createdVia}{resume.projectSlug ? ` · ${resume.projectSlug}` : ""}</TableCell>
            <TableCell>{formatAdminDate(resume.updatedAt)}</TableCell>
          </tr>
        ))}
      </tbody>
    </ResponsiveTable>
  );
}

function PaidTable({ paidAccounts }: { paidAccounts: AdminPaidAccount[] }) {
  if (paidAccounts.length === 0) {
    return <AdminEmptyState label="No paid accounts." />;
  }

  return (
    <ResponsiveTable minWidth="860px">
      <thead>
        <tr>
          <TableHead>Account</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {paidAccounts.map((account) => (
          <tr key={`${account.source}:${account.userId}:${account.createdAt}`}>
            <TableCell>
              <Link className="font-bold text-slate-950 hover:text-[#065f46]" href={`/admin/users/${account.userId}`}>
                {account.email}
              </Link>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{account.name}</p>
            </TableCell>
            <TableCell><StatusPill tone={planTone(account.planKey)}>{account.planKey}</StatusPill></TableCell>
            <TableCell>{account.source}</TableCell>
            <TableCell><StatusPill tone={statusTone(account.status)}>{account.status}</StatusPill></TableCell>
            <TableCell>{formatAdminDate(account.createdAt)}</TableCell>
          </tr>
        ))}
      </tbody>
    </ResponsiveTable>
  );
}

function JobsTable({
  jobs,
}: {
  jobs: {
    pdfJobs: AdminPdfJobSummary[];
    webhookDeliveries: AdminWebhookDeliverySummary[];
  };
}) {
  const rows = [
    ...jobs.pdfJobs.map((job) => ({
      detail: job.projectSlug ?? "PDF",
      error: job.errorMessage,
      id: `pdf:${job.id}`,
      label: job.resumeTitle ?? job.resumeId,
      status: job.status,
      timestamp: job.updatedAt,
      type: "PDF",
    })),
    ...jobs.webhookDeliveries.map((delivery) => ({
      detail: delivery.endpointUrl,
      error: delivery.lastError,
      id: `webhook:${delivery.id}`,
      label: delivery.eventType,
      status: `${delivery.attemptCount} tries`,
      timestamp: delivery.updatedAt,
      type: "Webhook",
    })),
  ];

  if (rows.length === 0) {
    return <AdminEmptyState label="No active jobs or webhook retries." />;
  }

  return (
    <ResponsiveTable minWidth="940px">
      <thead>
        <tr>
          <TableHead>Type</TableHead>
          <TableHead>Item</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Error</TableHead>
          <TableHead>Updated</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {rows.map((row) => (
          <tr key={row.id}>
            <TableCell>{row.type}</TableCell>
            <TableCell>
              <p className="font-bold text-slate-950">{row.label}</p>
              <p className="mt-0.5 max-w-[24rem] truncate text-xs font-semibold text-slate-500">{row.detail}</p>
            </TableCell>
            <TableCell><StatusPill tone={row.status.includes("failed") || row.status.includes("3") ? "red" : statusTone(row.status)}>{row.status}</StatusPill></TableCell>
            <TableCell>{row.error ?? "-"}</TableCell>
            <TableCell>{formatAdminDate(row.timestamp)}</TableCell>
          </tr>
        ))}
      </tbody>
    </ResponsiveTable>
  );
}

function PaymentsTable({ payments }: { payments: AdminPaymentReceipt[] }) {
  if (payments.length === 0) {
    return <AdminEmptyState label="No payments." />;
  }

  return (
    <ResponsiveTable minWidth="900px">
      <thead>
        <tr>
          <TableHead>Route</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Protocol</TableHead>
          <TableHead>Payer</TableHead>
          <TableHead>Created</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {payments.map((payment) => (
          <tr key={payment.id}>
            <TableCell>{payment.routeKey}</TableCell>
            <TableCell>{payment.amountUsd} {payment.currency}</TableCell>
            <TableCell>{payment.protocol}{payment.network ? ` · ${payment.network}` : ""}</TableCell>
            <TableCell>{payment.payer ?? "-"}</TableCell>
            <TableCell>{formatAdminDate(payment.createdAt)}</TableCell>
          </tr>
        ))}
      </tbody>
    </ResponsiveTable>
  );
}

function ActivityTable({ activity }: { activity: AdminActivity[] }) {
  if (activity.length === 0) {
    return <AdminEmptyState label="No activity." />;
  }

  return (
    <ResponsiveTable minWidth="860px">
      <thead>
        <tr>
          <TableHead>Action</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Occurred</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {activity.map((item) => (
          <tr key={`${item.action}:${item.occurredAt}:${item.userEmail ?? item.projectSlug ?? "system"}`}>
            <TableCell>{item.action}</TableCell>
            <TableCell>{item.userEmail || item.projectSlug || "system"}</TableCell>
            <TableCell>{formatAdminNumber(item.quantity)}</TableCell>
            <TableCell>{formatAdminDate(item.occurredAt)}</TableCell>
          </tr>
        ))}
      </tbody>
    </ResponsiveTable>
  );
}

function ResponsiveTable({
  children,
  minWidth,
}: {
  children: ReactNode;
  minWidth: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: ReactNode }) {
  return (
    <td className="px-3 py-3 font-semibold text-slate-600">
      {children}
    </td>
  );
}

function getActiveTab(tab: string | undefined): AdminTabKey {
  return ADMIN_TABS.some((candidate) => candidate.key === tab)
    ? tab as AdminTabKey
    : "users";
}
