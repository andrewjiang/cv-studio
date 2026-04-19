import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/_lib/auth";
import { recordUsageEvent } from "@/app/_lib/usage-events";

const ALLOWED_ACCOUNT_EVENTS = new Set([
  "account.sign_in",
  "account.sign_up",
]);

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({
      error: "Sign in before recording account events.",
    }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    action?: unknown;
    metadata?: unknown;
  };

  if (typeof body.action !== "string" || !ALLOWED_ACCOUNT_EVENTS.has(body.action)) {
    return NextResponse.json({
      error: "Unsupported analytics event.",
    }, { status: 400 });
  }

  await recordUsageEvent({
    action: body.action,
    metadata: isRecord(body.metadata) ? body.metadata : {},
    userId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
