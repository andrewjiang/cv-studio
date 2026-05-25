import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  isActivationEventName,
  sanitizeActivationMetadata,
} from "@/app/_lib/activation-events";
import { auth } from "@/app/_lib/auth";
import { recordUsageEvent } from "@/app/_lib/usage-events";

const LEGACY_ACCOUNT_EVENTS = new Set([
  "account.sign_in",
  "account.sign_up",
]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    action?: unknown;
    eventName?: unknown;
    metadata?: unknown;
  };
  const eventName = typeof body.eventName === "string" ? body.eventName : body.action;

  if (
    !isActivationEventName(eventName) &&
    !(typeof eventName === "string" && LEGACY_ACCOUNT_EVENTS.has(eventName))
  ) {
    return NextResponse.json({
      error: "Unsupported analytics event.",
    }, { status: 400 });
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  await recordUsageEvent({
    action: eventName,
    metadata: sanitizeActivationMetadata(body.metadata),
    userId: session?.user?.id,
  });

  return NextResponse.json({ ok: true });
}
