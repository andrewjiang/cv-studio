import { NextResponse } from "next/server";
import { getResumeTemplate } from "@/app/_lib/resume-templates";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

export const dynamic = "force-static";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/v1/templates/[key]">,
) {
  const { key } = await context.params;

  if (!isTemplateKey(key)) {
    return NextResponse.json({
      error: "Template not found.",
    }, { status: 404 });
  }

  const template = getResumeTemplate(key);
  return NextResponse.json(template);
}

function isTemplateKey(value: string): value is TemplateKey {
  return value === "engineer" || value === "designer" || value === "sales" || value === "founder";
}
