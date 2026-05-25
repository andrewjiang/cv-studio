import type { Metadata } from "next";
import { DeveloperDocsClient } from "@/app/_components/developer-docs-client";
import {
  DEVELOPER_DOC_RESOURCES,
  DEVELOPER_ENDPOINT_DOCS,
} from "@/app/_lib/developer-platform-docs";
import { TINYCV_AGENT_COOKBOOK, TINYCV_MARKDOWN_GUIDE } from "@/app/_lib/developer-platform-guides";
import {
  TINYCV_DEVELOPER_DOCS_DESCRIPTION,
  TINYCV_DEVELOPER_DOCS_PATH,
} from "@/app/_lib/site-metadata";

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: {
    canonical: TINYCV_DEVELOPER_DOCS_PATH,
  },
  description: TINYCV_DEVELOPER_DOCS_DESCRIPTION,
  openGraph: {
    description: TINYCV_DEVELOPER_DOCS_DESCRIPTION,
    title: "Tiny CV Developer Docs",
    url: TINYCV_DEVELOPER_DOCS_PATH,
  },
  title: "Developer Docs",
  twitter: {
    card: "summary_large_image",
    description: TINYCV_DEVELOPER_DOCS_DESCRIPTION,
    title: "Tiny CV Developer Docs",
  },
};

export default function DevelopersPage() {
  return (
    <DeveloperDocsClient
      agentCookbook={TINYCV_AGENT_COOKBOOK}
      endpointDocs={DEVELOPER_ENDPOINT_DOCS}
      markdownGuide={TINYCV_MARKDOWN_GUIDE}
      resources={DEVELOPER_DOC_RESOURCES}
    />
  );
}
