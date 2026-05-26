import Link from "next/link";
import type { ReactNode } from "react";
import type {
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
        <TrafficMetric label="7d views" value={payload.traffic7d.pageViews} />
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
        <TrafficPanel title="Top pages">
          <PageTable rows={payload.topPages24h.topPages.slice(0, compact ? 6 : 10)} />
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
