import type { ReactNode } from "react";
import { TINYCV_NOINDEX_METADATA } from "@/app/_lib/site-metadata";

export const metadata = TINYCV_NOINDEX_METADATA;

export default function ClaimLayout({ children }: { children: ReactNode }) {
  return children;
}
