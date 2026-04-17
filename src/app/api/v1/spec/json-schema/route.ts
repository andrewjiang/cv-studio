import { NextResponse } from "next/server";
import { RESUME_JSON_SCHEMA } from "@/app/_lib/developer-resume-input";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(RESUME_JSON_SCHEMA);
}
