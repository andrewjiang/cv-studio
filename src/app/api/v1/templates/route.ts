import { NextResponse } from "next/server";
import { RESUME_TEMPLATES } from "@/app/_lib/resume-templates";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    templates: RESUME_TEMPLATES.map((template) => ({
      badge: template.badge,
      description: template.description,
      key: template.key,
      label: template.label,
    })),
  });
}
