import type { ReactNode } from "react";
import { TINYCV_NOINDEX_METADATA } from "@/app/_lib/site-metadata";
import { requireAdminSession } from "@/app/_lib/admin-auth";

export const metadata = TINYCV_NOINDEX_METADATA;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();

  return children;
}
