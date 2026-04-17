import { DeveloperDocsClient } from "@/app/_components/developer-docs-client";
import {
  DEVELOPER_DOC_RESOURCES,
  DEVELOPER_ENDPOINT_DOCS,
} from "@/app/_lib/developer-platform-docs";
import { TINYCV_AGENT_COOKBOOK, TINYCV_MARKDOWN_GUIDE } from "@/app/_lib/developer-platform-guides";

export const dynamic = "force-static";

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
