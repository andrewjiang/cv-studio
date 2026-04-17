import { NextResponse } from "next/server";
import { TINYCV_MARKDOWN_GUIDE } from "@/app/_lib/developer-platform-guides";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    format: "markdown",
    guide: TINYCV_MARKDOWN_GUIDE,
  });
}
