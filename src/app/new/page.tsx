import { WorkspaceBootstrap } from "@/app/_components/workspace-bootstrap";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";

const TEMPLATE_KEYS: TemplateKey[] = ["engineer", "designer", "sales", "founder"];

function readTemplateKey(value: string | string[] | undefined): TemplateKey | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return TEMPLATE_KEYS.includes(candidate as TemplateKey) ? candidate as TemplateKey : null;
}

export default async function NewResumePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string | string[] }>;
}) {
  const workspaceId = await readWorkspaceCookie();
  const params = await searchParams;
  const initialTemplateKey = readTemplateKey(params.template);

  return (
    <WorkspaceBootstrap
      allowLegacyImport={!workspaceId && !initialTemplateKey}
      initialTemplateKey={initialTemplateKey}
    />
  );
}
