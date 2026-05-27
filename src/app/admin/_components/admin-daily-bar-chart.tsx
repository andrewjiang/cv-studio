"use client";

import { useMemo, useState } from "react";
import type { AdminAnalyticsDailyPageRow } from "@/app/_lib/admin-analytics";
import { formatAdminNumber } from "@/app/admin/_components/admin-ui";

export function AdminDailyBarChart({
  rows,
  tone,
}: {
  rows: AdminAnalyticsDailyPageRow[];
  tone: "blue" | "green";
}) {
  const visibleRows = useMemo(() => rows.slice(-30), [rows]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (visibleRows.length === 0) {
    return null;
  }

  const maxViews = Math.max(...visibleRows.map((row) => row.pageViews), 1);
  const totalViews = visibleRows.reduce((sum, row) => sum + row.pageViews, 0);
  const activeRow = activeIndex === null ? null : visibleRows[activeIndex] ?? null;
  const barClass = tone === "green"
    ? "bg-[#065f46] hover:bg-[#047857] focus-visible:bg-[#047857]"
    : "bg-[#2563eb] hover:bg-[#1d4ed8] focus-visible:bg-[#1d4ed8]";

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
          {formatAdminNumber(totalViews)}
        </p>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">30 days</p>
      </div>
      <div
        className="relative flex h-44 items-end gap-1 rounded-[1rem] border border-black/6 bg-white/65 px-3 pb-3 pt-4"
        onMouseLeave={() => setActiveIndex(null)}
      >
        {activeRow ? (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-[0.8rem] border border-black/8 bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
            <p className="text-xs font-bold text-slate-950">{formatTrafficDate(activeRow.date)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {formatAdminNumber(activeRow.pageViews)} views · {formatAdminNumber(activeRow.visitors)} visitors
            </p>
          </div>
        ) : null}
        {visibleRows.map((row, index) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={row.date}>
            <div className="flex h-32 w-full items-end">
              <button
                aria-label={`${formatTrafficDate(row.date)}: ${formatAdminNumber(row.pageViews)} views, ${formatAdminNumber(row.visitors)} visitors`}
                className={`w-full rounded-t outline-none transition ${barClass} focus-visible:ring-2 focus-visible:ring-slate-950/20`}
                onBlur={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                style={{ height: `${Math.max(2, (row.pageViews / maxViews) * 100)}%` }}
                type="button"
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
