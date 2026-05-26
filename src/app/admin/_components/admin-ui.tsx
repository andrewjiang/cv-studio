import Link from "next/link";
import type { ReactNode } from "react";
import { AppHeaderBrand } from "@/app/_components/app-header";
import { brandPrimaryButtonClass } from "@/app/_components/button-classes";

export const adminPanelClass =
  "rounded-[1.35rem] border border-black/6 bg-white/78 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-5";

const adminHeaderClass =
  "sticky top-0 z-50 border-b border-black/5 bg-[#fbf7f0]/80 backdrop-blur-md";

const adminHeaderInnerClass =
  "mx-auto flex h-16 max-w-[108rem] items-center justify-between px-5 sm:px-8 lg:px-12";

export const adminInputClass =
  "h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#065f46]/35 focus:ring-2 focus:ring-[#065f46]/10";

export const adminButtonClass =
  `${brandPrimaryButtonClass} h-11 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#065f46]/25`;

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/traffic", label: "Traffic" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/resumes", label: "CVs" },
  { href: "/admin/jobs", label: "Jobs" },
];

export function AdminShell({
  children,
  currentPath = "/admin",
}: {
  children: ReactNode;
  currentPath?: string;
}) {
  return (
    <main className="app-shell min-h-screen bg-[#f7f3ec] text-slate-900">
      <header className={adminHeaderClass}>
        <div className={adminHeaderInnerClass}>
          <AppHeaderBrand />
          <nav className="flex items-center gap-1 rounded-full border border-black/6 bg-white/70 p-1">
            {adminNavItems.map((item) => {
              const active = currentPath === item.href;
              return (
                <Link
                  className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-bold transition ${
                    active
                      ? "bg-[#ecfdf5] text-[#065f46] shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[108rem] px-4 py-5 sm:px-5 lg:px-8 lg:py-7">
        {children}
      </div>
    </main>
  );
}

export function AdminPageHeader({
  action,
  eyebrow = "Admin",
  title,
}: {
  action?: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-black/5 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#065f46]">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

export function AdminSearchForm({
  action,
  defaultValue,
  placeholder,
}: {
  action: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <form action={action} className="flex w-full flex-col gap-2 sm:w-[28rem] sm:flex-row" method="GET">
      <input
        className={adminInputClass}
        defaultValue={defaultValue}
        name="q"
        placeholder={placeholder}
        type="search"
      />
      <button className={`${adminButtonClass} sm:w-auto`} type="submit">
        Search
      </button>
    </form>
  );
}

export function StatusPill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "amber" | "green" | "red" | "slate";
}) {
  const className = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    green: "border-[#065f46]/15 bg-[#ecfdf5] text-[#065f46]",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-black/8 bg-slate-50 text-slate-600",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

export function AdminEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-black/10 bg-white/55 p-8 text-center text-sm font-bold text-slate-500">
      {label}
    </div>
  );
}

export function AdminUnavailable() {
  return (
    <AdminShell>
      <div className="mx-auto max-w-xl py-12">
        <section className={adminPanelClass}>
          <StatusPill tone="amber">Setup</StatusPill>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Admin needs the database.
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Set DATABASE_URL and run migrations.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}

export function formatAdminDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatAdminNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

export function planTone(planKey: string) {
  return planKey === "free" ? "slate" : "green";
}

export function statusTone(status: string) {
  if (["active", "completed", "delivered", "published"].includes(status)) {
    return "green";
  }

  if (["failed", "canceled", "unpaid"].includes(status)) {
    return "red";
  }

  if (["queued", "processing", "pending", "past_due", "trialing"].includes(status)) {
    return "amber";
  }

  return "slate";
}
