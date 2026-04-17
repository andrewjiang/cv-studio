import { DEVELOPER_ENDPOINT_DOCS, buildCurlExample, buildLlmsManifest } from "@/app/_lib/developer-platform-docs";
import { TINYCV_AGENT_COOKBOOK, TINYCV_MARKDOWN_GUIDE } from "@/app/_lib/developer-platform-guides";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const sections = [
    buildLlmsManifest(origin),
    "",
    "## Endpoint Reference",
    "",
    ...DEVELOPER_ENDPOINT_DOCS.flatMap((endpoint) => {
      return [
        `### ${endpoint.summary}`,
        "",
        `- Method: ${endpoint.method}`,
        `- Path: ${origin}${endpoint.path}`,
        `- Auth: ${endpoint.auth}`,
        endpoint.idempotent ? "- Idempotent: true" : "- Idempotent: false",
        "",
        endpoint.description,
        "",
        "```bash",
        buildCurlExample(endpoint),
        "```",
        "",
      ];
    }),
    "## Tiny CV Markdown Guide",
    "",
    TINYCV_MARKDOWN_GUIDE,
    "",
    "## Tiny CV Agent Cookbook",
    "",
    TINYCV_AGENT_COOKBOOK,
  ];

  return new Response(sections.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
