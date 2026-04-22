import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyAccountCvsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = (resolvedSearchParams.q ?? "").trim();

  redirect(query ? `/cvs?q=${encodeURIComponent(query)}` : "/cvs");
}
