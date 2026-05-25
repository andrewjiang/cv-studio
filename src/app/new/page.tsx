import { WorkspaceBootstrap } from "@/app/_components/workspace-bootstrap";
import type { BlogProductIntent } from "@/app/_lib/blog-product-intent-analytics";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";
import { readWorkspaceCookie } from "@/app/_lib/workspace-cookie";

export const dynamic = "force-dynamic";

const BLOG_CTA_KEYS: BlogProductIntent[] = [
  "agent_guide",
  "pdf",
  "public_link",
  "start_writing",
  "template",
];
const TEMPLATE_KEYS: TemplateKey[] = ["engineer", "designer", "sales", "founder"];

function readTemplateKey(value: string | string[] | undefined): TemplateKey | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return TEMPLATE_KEYS.includes(candidate as TemplateKey) ? candidate as TemplateKey : null;
}

function readBlogCta(value: string | string[] | undefined): BlogProductIntent | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return BLOG_CTA_KEYS.includes(candidate as BlogProductIntent) ? candidate as BlogProductIntent : null;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewResumePage({
  searchParams,
}: {
  searchParams: Promise<{
    blog?: string | string[];
    blog_cta?: string | string[];
    source?: string | string[];
    template?: string | string[];
  }>;
}) {
  const workspaceId = await readWorkspaceCookie();
  const params = await searchParams;
  const initialTemplateKey = readTemplateKey(params.template);
  const blogSlug = readParam(params.blog);
  const blogCta = readBlogCta(params.blog_cta);
  const source = readParam(params.source);

  return (
    <WorkspaceBootstrap
      allowLegacyImport={!workspaceId && !initialTemplateKey}
      initialBlogAttribution={source === "blog" ? {
        blogSlug: blogSlug || null,
        cta: blogCta,
        linkUrl: "/new",
        surface: "new_resume_page",
      } : null}
      initialTemplateKey={initialTemplateKey}
    />
  );
}
