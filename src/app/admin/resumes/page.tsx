import Link from "next/link";
import {
  AdminResumeSummary,
  AdminStoreUnavailableError,
  searchAdminResumes,
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
} from "@/app/admin/_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminResumesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams)?.q ?? "").trim();
  let resumes: AdminResumeSummary[];

  try {
    resumes = await searchAdminResumes(query);
  } catch (error) {
    if (error instanceof AdminStoreUnavailableError) {
      return <AdminUnavailable />;
    }

    throw error;
  }

  return (
    <AdminShell currentPath="/admin/resumes">
      <AdminPageHeader
        action={<AdminSearchForm action="/admin/resumes" defaultValue={query} placeholder="Title, slug, email, or CV id" />}
        title="CVs"
      />

      <section className={adminPanelClass}>
        {resumes.length > 0 ? (
          <>
            <div className="grid gap-3 sm:hidden">
              {resumes.map((resume) => (
                <article className="rounded-[1rem] border border-black/5 bg-white/65 p-4" key={resume.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{resume.title}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{resume.slug}</p>
                    </div>
                    <StatusPill tone={resume.isPublished ? "green" : "slate"}>
                      {resume.isPublished ? "published" : "draft"}
                    </StatusPill>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
                    <span className="truncate">{resume.ownerEmail ?? resume.createdVia}</span>
                    {resume.publicUrl ? (
                      <Link className="shrink-0 text-[#065f46] hover:text-[#064e3b]" href={resume.publicUrl}>
                        Open
                      </Link>
                    ) : (
                      <span>{formatAdminDate(resume.updatedAt)}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[880px] text-left">
                <thead>
                  <tr className="border-b border-black/5 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-3 py-3">CV</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Owner</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {resumes.map((resume) => (
                    <ResumeRow key={resume.id} resume={resume} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <AdminEmptyState label="No CVs found." />
        )}
      </section>
    </AdminShell>
  );
}

function ResumeRow({ resume }: { resume: AdminResumeSummary }) {
  return (
    <tr className="text-sm">
      <td className="px-3 py-3">
        <p className="font-bold text-slate-950">{resume.title}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">{resume.slug} · {resume.templateKey}</p>
      </td>
      <td className="px-3 py-3">
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
      </td>
      <td className="px-3 py-3 font-semibold text-slate-500">{resume.ownerEmail ?? "-"}</td>
      <td className="px-3 py-3">
        <p className="font-semibold text-slate-600">{resume.createdVia}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-400">{resume.projectSlug ?? "-"}</p>
      </td>
      <td className="px-3 py-3 font-semibold text-slate-500">{formatAdminDate(resume.updatedAt)}</td>
    </tr>
  );
}
