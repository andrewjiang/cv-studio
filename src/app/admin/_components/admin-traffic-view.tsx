import Link from "next/link";
import type { ReactNode } from "react";
import type {
  AdminAnalyticsDailyPageRow,
  AdminAnalyticsPageRow,
  AdminAnalyticsSnapshot,
  AdminAnalyticsSourceRow,
} from "@/app/_lib/admin-analytics";
import {
  displayAnalyticsLocation,
  isAdminAnalyticsStale,
} from "@/app/_lib/admin-analytics";
import {
  AdminEmptyState,
  StatusPill,
  formatAdminDate,
  formatAdminNumber,
} from "@/app/admin/_components/admin-ui";

export function AdminTrafficView({
  compact = false,
  snapshot,
}: {
  compact?: boolean;
  snapshot: AdminAnalyticsSnapshot | null;
}) {
  if (!snapshot) {
    return (
      <AdminEmptyState label="No analytics snapshot yet. Run pnpm analytics:refresh." />
    );
  }

  const stale = isAdminAnalyticsStale(snapshot);
  const payload = snapshot.payload;
  const dailyRows = compact ? payload.daily.slice(-7) : payload.daily.slice(-14);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={stale ? "amber" : "green"}>
            {stale ? "stale" : "fresh"}
          </StatusPill>
          <StatusPill>{formatAdminDate(snapshot.generatedAt)}</StatusPill>
        </div>
        {compact ? (
          <Link
            className="text-sm font-bold text-[#065f46] hover:text-[#064e3b]"
            href="/admin/traffic"
          >
            Full traffic
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TrafficMetric label="Visitors" value={payload.traffic24h.visitors} />
        <TrafficMetric label="Page views" value={payload.traffic24h.pageViews} />
        <TrafficMetric label="Resume views" value={payload.resumePages24h.pageViews} />
        <TrafficMetric label="Blog views 30d" value={sumDailyViews(payload.blogDaily30d)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TrafficPanel title="Resume views">
          <DailyBarChart rows={payload.resumePagesDaily30d} tone="green" />
        </TrafficPanel>
        <TrafficPanel title="Blog views">
          <DailyBarChart rows={payload.blogDaily30d} tone="blue" />
        </TrafficPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TrafficPanel title="Daily page views">
          <DailyTable rows={dailyRows} />
        </TrafficPanel>
        <TrafficPanel title="Traffic sources">
          <SourceTable rows={payload.sources24h.slice(0, compact ? 6 : 10)} />
        </TrafficPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TrafficPanel title="Resume pages">
          <PageTable rows={payload.resumePages24h.topPages.slice(0, compact ? 6 : 10)} />
        </TrafficPanel>
        <TrafficPanel title="Blog pages">
          <PageTable rows={payload.blogPages30d.topPages.slice(0, compact ? 6 : 10)} />
        </TrafficPanel>
      </div>
    </div>
  );
}

function TrafficMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1rem] border border-black/6 bg-white/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
        {formatAdminNumber(value)}
      </p>
    </div>
  );
}

function TrafficPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="min-w-0 border-t border-black/5 pt-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DailyTable({
  rows,
}: {
  rows: { date: string; pageViews: number; sessions: number; visitors: number }[];
}) {
  if (rows.length === 0) {
    return <AdminEmptyState label="No daily rows." />;
  }

  const maxViews = Math.max(...rows.map((row) => row.pageViews), 1);

  return (
    <ResponsiveTable minWidth="520px">
      <thead>
        <tr>
          <TableHead>Date</TableHead>
          <TableHead>Views</TableHead>
          <TableHead>Visitors</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {rows.map((row) => (
          <tr key={row.date}>
            <TableCell>{formatTrafficDate(row.date)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <span className="w-14 text-slate-950">{formatAdminNumber(row.pageViews)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-[#065f46]"
                    style={{ width: `${Math.max(4, (row.pageViews / maxViews) * 100)}%` }}
                  />
                </span>
              </div>
            </TableCell>
            <TableCell>{formatAdminNumber(row.visitors)}</TableCell>
          </tr>
        ))}
      </tbody>
    </ResponsiveTable>
  );
}

function DailyBarChart({
  rows,
  tone,
}: {
  rows: AdminAnalyticsDailyPageRow[];
  tone: "blue" | "green";
}) {
  if (rows.length === 0) {
    return <AdminEmptyState label="No page views." />;
  }

  const visibleRows = rows.slice(-30);
  const maxViews = Math.max(...visibleRows.map((row) => row.pageViews), 1);
  const totalViews = sumDailyViews(visibleRows);
  const barClass = tone === "green" ? "bg-[#065f46]" : "bg-[#2563eb]";

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
          {formatAdminNumber(totalViews)}
        </p>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">30 days</p>
      </div>
      <div className="flex h-44 items-end gap-1 rounded-[1rem] border border-black/6 bg-white/65 px-3 pb-3 pt-4">
        {visibleRows.map((row) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={row.date}>
            <div className="flex h-32 w-full items-end">
              <div
                aria-label={`${formatTrafficDate(row.date)}: ${formatAdminNumber(row.pageViews)} views`}
                className={`w-full rounded-t ${barClass}`}
                title={`${formatTrafficDate(row.date)}: ${formatAdminNumber(row.pageViews)} views`}
                style={{ height: `${Math.max(2, (row.pageViews / maxViews) * 100)}%` }}
              />
            </div>
            <span className="h-3 text-[0.625rem] font-bold leading-3 text-slate-400">
              {formatChartTick(row.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceTable({ rows }: { rows: AdminAnalyticsSourceRow[] }) {
  if (rows.length === 0) {
    return <AdminEmptyState label="No sources." />;
  }

  return (
    <ResponsiveTable minWidth="560px">
      <thead>
        <tr>
          <TableHead>Source</TableHead>
          <TableHead>Visitors</TableHead>
          <TableHead>Views</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {rows.map((row) => (
          <tr key={row.source}>
            <TableCell>{row.source}</TableCell>
            <TableCell>{formatAdminNumber(row.visitors)}</TableCell>
            <TableCell>{formatAdminNumber(row.pageViews)}</TableCell>
          </tr>
        ))}
      </tbody>
    </ResponsiveTable>
  );
}

function PageTable({ rows }: { rows: AdminAnalyticsPageRow[] }) {
  if (rows.length === 0) {
    return <AdminEmptyState label="No pages." />;
  }

  return (
    <ResponsiveTable minWidth="640px">
      <thead>
        <tr>
          <TableHead>Page</TableHead>
          <TableHead>Views</TableHead>
          <TableHead>Visitors</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {rows.map((row) => (
          <tr key={row.location}>
            <TableCell>
              <Link
                className="font-bold text-slate-950 hover:text-[#065f46]"
                href={row.location}
              >
                {displayAnalyticsLocation(row.location)}
              </Link>
            </TableCell>
            <TableCell>{formatAdminNumber(row.pageViews)}</TableCell>
            <TableCell>{formatAdminNumber(row.visitors)}</TableCell>
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

function formatTrafficDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatChartTick(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const day = date.getUTCDate();
  return day === 1 || day % 5 === 0 ? String(day) : "";
}

function sumDailyViews(rows: AdminAnalyticsDailyPageRow[]) {
  return rows.reduce((sum, row) => sum + row.pageViews, 0);
}
