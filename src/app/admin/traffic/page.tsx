import { getLatestAdminAnalyticsSnapshot } from "@/app/_lib/admin-analytics";
import { AdminStoreUnavailableError } from "@/app/_lib/admin-store";
import {
  AdminPageHeader,
  AdminShell,
  AdminUnavailable,
} from "@/app/admin/_components/admin-ui";
import { AdminTrafficView } from "@/app/admin/_components/admin-traffic-view";

export const dynamic = "force-dynamic";

export default async function AdminTrafficPage() {
  let snapshot;

  try {
    snapshot = await getLatestAdminAnalyticsSnapshot();
  } catch (error) {
    if (error instanceof AdminStoreUnavailableError) {
      return <AdminUnavailable />;
    }

    throw error;
  }

  return (
    <AdminShell currentPath="/admin/traffic">
      <AdminPageHeader title="Traffic" />
      <AdminTrafficView snapshot={snapshot} />
    </AdminShell>
  );
}
