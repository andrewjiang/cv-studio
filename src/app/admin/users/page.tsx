import Link from "next/link";
import {
  AdminStoreUnavailableError,
  AdminUserSummary,
  searchAdminUsers,
} from "@/app/_lib/admin-store";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSearchForm,
  AdminShell,
  AdminUnavailable,
  StatusPill,
  adminPanelClass,
  formatAdminDate,
  formatAdminNumber,
  planTone,
} from "@/app/admin/_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams)?.q ?? "").trim();
  let users: AdminUserSummary[];

  try {
    users = await searchAdminUsers(query);
  } catch (error) {
    if (error instanceof AdminStoreUnavailableError) {
      return <AdminUnavailable />;
    }

    throw error;
  }

  return (
    <AdminShell currentPath="/admin/users">
      <AdminPageHeader
        action={<AdminSearchForm action="/admin/users" defaultValue={query} placeholder="Email, name, or user id" />}
        title="Users"
      />

      <section className={adminPanelClass}>
        {users.length > 0 ? (
          <>
            <div className="grid gap-3 sm:hidden">
              {users.map((user) => (
                <Link
                  className="rounded-[1rem] border border-black/5 bg-white/65 p-4 transition hover:bg-white"
                  href={`/admin/users/${user.id}`}
                  key={user.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{user.email}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{user.name}</p>
                    </div>
                    <StatusPill tone={planTone(user.planKey)}>{user.planKey}</StatusPill>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>{formatAdminNumber(user.resumeCount)} CVs</span>
                    <span>{formatAdminDate(user.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-black/5 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">CVs</th>
                    <th className="px-3 py-3">Project</th>
                    <th className="px-3 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {users.map((user) => (
                    <tr className="text-sm" key={user.id}>
                      <td className="px-3 py-3">
                        <Link className="font-bold text-slate-950 hover:text-[#065f46]" href={`/admin/users/${user.id}`}>
                          {user.email}
                        </Link>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{user.name}</p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill tone={planTone(user.planKey)}>{user.planKey}</StatusPill>
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-700">{formatAdminNumber(user.resumeCount)}</td>
                      <td className="px-3 py-3 font-semibold text-slate-500">{user.projectSlug ?? "-"}</td>
                      <td className="px-3 py-3 font-semibold text-slate-500">{formatAdminDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <AdminEmptyState label="No users found." />
        )}
      </section>
    </AdminShell>
  );
}
