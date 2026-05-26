import {
  AdminStoreUnavailableError,
  getAdminJobs,
} from "@/app/_lib/admin-store";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminShell,
  AdminUnavailable,
  StatusPill,
  adminPanelClass,
  formatAdminDate,
  statusTone,
} from "@/app/admin/_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  let jobs;

  try {
    jobs = await getAdminJobs();
  } catch (error) {
    if (error instanceof AdminStoreUnavailableError) {
      return <AdminUnavailable />;
    }

    throw error;
  }

  return (
    <AdminShell currentPath="/admin/jobs">
      <AdminPageHeader title="Jobs" />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className={adminPanelClass}>
          <h2 className="text-base font-bold text-slate-950">PDF</h2>
          <div className="mt-4 divide-y divide-black/5">
            {jobs.pdfJobs.length > 0 ? jobs.pdfJobs.map((job) => (
              <div className="py-3" key={job.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-950">{job.resumeTitle ?? job.resumeId}</p>
                  <StatusPill tone={statusTone(job.status)}>{job.status}</StatusPill>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {job.projectSlug ?? "-"} · {formatAdminDate(job.updatedAt)}
                </p>
                {job.errorMessage ? (
                  <p className="mt-2 rounded-[0.85rem] bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">
                    {job.errorCode ? `${job.errorCode}: ` : ""}{job.errorMessage}
                  </p>
                ) : null}
              </div>
            )) : <AdminEmptyState label="No active PDF jobs." />}
          </div>
        </section>

        <section className={adminPanelClass}>
          <h2 className="text-base font-bold text-slate-950">Webhooks</h2>
          <div className="mt-4 divide-y divide-black/5">
            {jobs.webhookDeliveries.length > 0 ? jobs.webhookDeliveries.map((delivery) => (
              <div className="py-3" key={delivery.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-950">{delivery.eventType}</p>
                  <StatusPill tone={delivery.attemptCount >= 3 ? "red" : "amber"}>
                    {delivery.attemptCount} tries
                  </StatusPill>
                </div>
                <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                  {delivery.endpointUrl}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {delivery.projectSlug ?? "-"} · next {formatAdminDate(delivery.nextAttemptAt)}
                </p>
                {delivery.lastError ? (
                  <p className="mt-2 rounded-[0.85rem] bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">
                    {delivery.statusCode ? `${delivery.statusCode}: ` : ""}{delivery.lastError}
                  </p>
                ) : null}
              </div>
            )) : <AdminEmptyState label="No webhook retries." />}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
