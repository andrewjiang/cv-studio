import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/_lib/auth";
import { recordUsageEvent } from "@/app/_lib/usage-events";
import { readWorkspaceCookieFromRequest } from "@/app/_lib/workspace-cookie";

const ALLOWED_ACCOUNT_EVENTS = new Set([
  "account.sign_in",
  "account.sign_up",
]);

const ALLOWED_WORKSPACE_EVENTS = new Set([
  "first_publish_success_viewed",
  "share_link_copied",
  "pdf_download_succeeded",
  "account_cta_clicked",
  "view_live_clicked",
  "continue_editing_clicked",
]);

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const body = await request.json().catch(() => ({})) as {
    action?: unknown;
    metadata?: unknown;
  };

  if (typeof body.action !== "string") {
    return NextResponse.json({
      error: "Unsupported analytics event.",
    }, { status: 400 });
  }

  const metadata = isRecord(body.metadata) ? body.metadata : {};

  if (ALLOWED_ACCOUNT_EVENTS.has(body.action)) {
    if (!session?.user?.id) {
      return NextResponse.json({
        error: "Sign in before recording account events.",
      }, { status: 401 });
    }

    await recordUsageEvent({
      action: body.action,
      metadata,
      userId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  }

  if (!ALLOWED_WORKSPACE_EVENTS.has(body.action)) {
    return NextResponse.json({
      error: "Unsupported analytics event.",
    }, { status: 400 });
  }

  const workspaceId = readWorkspaceCookieFromRequest(request);

  if (!workspaceId) {
    return NextResponse.json({
      error: "Missing workspace cookie.",
    }, { status: 401 });
  }

  await recordUsageEvent({
    action: body.action,
    metadata: {
      ...metadata,
      workspace_id: workspaceId,
    },
    userId: session?.user?.id ?? null,
  });

  return NextResponse.json({ ok: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
