import { NextResponse } from "next/server";
import {
  readMachinePaymentConfig,
  usdToAtomicUnits,
} from "@/app/_lib/machine-payments";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const config = readMachinePaymentConfig();

  return NextResponse.json({
    categories: ["developer-tools", "media"],
    description: "Tiny CV paid machine-payment endpoints for creating, publishing, and exporting resumes. Use /openapi.json as the canonical schema.",
    docs: {
      apiReference: `${origin}/openapi.json`,
      homepage: origin,
    },
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/paid/resumes",
        payment: {
          amount: usdToAtomicUnits(config.prices.createPublishUsd),
          currency: "USD",
        },
        summary: "Create and publish a standard Tiny CV resume.",
      },
      {
        method: "POST",
        path: "/api/v1/paid/agent-finish",
        payment: {
          amount: usdToAtomicUnits(config.prices.agentFinishUsd),
          currency: "USD",
        },
        summary: "Create a hosted resume, claim link, queued PDF job, and receipt.",
      },
      {
        method: "POST",
        path: "/api/v1/paid/resumes/{resume_id}/pdf-jobs",
        payment: {
          amount: usdToAtomicUnits(config.prices.pdfUsd),
          currency: "USD",
        },
        summary: "Queue a PDF export for a paid published resume.",
      },
    ],
    name: "Tiny CV Developer API",
    version: 1,
  });
}
