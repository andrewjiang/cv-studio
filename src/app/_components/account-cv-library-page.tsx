import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountResumeCard } from "@/app/_components/account-resume-card";
import { AccountShell } from "@/app/_components/account-shell";
import { brandPrimaryButtonClass } from "@/app/_components/button-classes";
import { getAccountDashboard } from "@/app/_lib/account-store";
import { auth } from "@/app/_lib/auth";
import { getUserEntitlements } from "@/app/_lib/entitlements";

export async function AccountCvLibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/account");
  }

  const entitlementResolution = await getUserEntitlements(session.user.id);
  const dashboard = await getAccountDashboard(session.user.id, entitlementResolution);

  const sortedResumes = [...dashboard.resumes].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const searchQuery = (resolvedSearchParams.q ?? "").trim();
  const filteredResumes = searchQuery
    ? sortedResumes.filter((resume) => resume.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedResumes;

  return (
    <AccountShell currentEditorHref={dashboard.currentResumeId ? `/studio/${dashboard.currentResumeId}` : null}>
      <div className="mx-auto max-w-6xl antialiased">
        <header className="mb-10 flex flex-col gap-4 border-b border-black/5 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 text-wrap-balance">
            My CVs
          </h1>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <form action="/cvs" className="relative w-full sm:w-72" method="GET">
              <input
                className="h-11 w-full rounded-full border border-black/10 bg-white px-4 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#065f46]/35 focus:ring-2 focus:ring-[#065f46]/10"
                defaultValue={searchQuery}
                name="q"
                placeholder="Search CVs"
                type="search"
              />
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 21l-4.35-4.35m1.6-5.15a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </form>
            <Link
              className={`${brandPrimaryButtonClass} h-11 px-5 text-sm shadow-lg shadow-[#065f46]/20 hover:scale-[1.02]`}
              href="/new"
            >
              + New CV
            </Link>
          </div>
        </header>

        {filteredResumes.length > 0 ? (
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResumes.map((resume, index) => (
              <div
                key={resume.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <AccountResumeCard resume={resume} />
              </div>
            ))}
          </div>
        ) : sortedResumes.length > 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-black/10 bg-white/50 p-8 text-center">
            <h2 className="text-xl font-bold text-slate-950">No CVs match your search.</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Try a different title or clear the search.
            </p>
            <Link
              className="mt-5 inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              href="/cvs"
            >
              Clear search
            </Link>
          </div>
        ) : (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-black/5 bg-white/40 p-12 text-center animate-in fade-in zoom-in-95 duration-700">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-950 text-wrap-balance">No CVs yet.</h2>
            <p className="mt-2 max-w-sm text-base font-medium text-slate-500 leading-relaxed text-wrap-pretty">
              Start by creating your first CV or importing your existing markdown content.
            </p>
            <Link
              className={`${brandPrimaryButtonClass} mt-8 px-8 py-3 text-sm shadow-lg shadow-[#065f46]/20 hover:scale-105`}
              href="/new"
            >
              Start your first CV
            </Link>
          </div>
        )}
      </div>
    </AccountShell>
  );
}
