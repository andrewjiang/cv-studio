import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/app/_lib/openapi";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json(buildOpenApiSpec(new URL(request.url).origin, {
    audience: "discovery",
  }));
}
