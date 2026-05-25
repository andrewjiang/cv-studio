import { permanentRedirect } from "next/navigation";
import { TINYCV_DEVELOPER_DOCS_PATH } from "@/app/_lib/site-metadata";

export const dynamic = "force-static";

export default function DocumentationAliasPage() {
  permanentRedirect(TINYCV_DEVELOPER_DOCS_PATH);
}
