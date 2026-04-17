import { notFound } from "next/navigation";
import { EditClaimConsumeBridge } from "@/app/_components/edit-claim-consume-bridge";

export const dynamic = "force-dynamic";

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ claimId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { claimId } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  return <EditClaimConsumeBridge claimId={claimId} token={token} />;
}
