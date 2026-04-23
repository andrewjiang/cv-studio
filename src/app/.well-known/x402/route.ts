import { NextResponse } from "next/server";
import { parseDiscoveryOwnershipProofs } from "@/app/_lib/machine-payments";

export const dynamic = "force-dynamic";

const PAID_RESOURCES = [
  "POST /api/v1/paid/resumes",
  "POST /api/v1/paid/agent-finish",
  "POST /api/v1/paid/resumes/{resume_id}/pdf-jobs",
];

export function GET() {
  return NextResponse.json({
    description: "Tiny CV paid machine-payment endpoints for creating, publishing, and exporting resumes.",
    instructions: "Use /openapi.json as the canonical schema. Paid routes support x402 and MPP. Agent Finish returns a hosted Tiny CV URL, claim link, queued PDF job, and receipt.",
    mppResources: PAID_RESOURCES,
    ownershipProofs: parseDiscoveryOwnershipProofs(),
    resources: PAID_RESOURCES,
    version: 1,
  });
}
