import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  isActivationEventName,
  sanitizeActivationMetadata,
} from "@/app/_lib/activation-events";
import {
  ApiRateLimitError,
  ApiRateLimitUnavailableError,
  assertApiRateLimit,
} from "@/app/_lib/api-rate-limit";
import { auth } from "@/app/_lib/auth";
import { recordUsageEvent } from "@/app/_lib/usage-events";

const MAX_ANALYTICS_EVENT_BODY_BYTES = 4096;
const LEGACY_ACCOUNT_EVENTS = new Set([
  "account.sign_in",
  "account.sign_up",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await parseAnalyticsEventBody(request);
    const eventName = typeof body.eventName === "string" ? body.eventName : body.action;

    if (
      !isActivationEventName(eventName) &&
      !(typeof eventName === "string" && LEGACY_ACCOUNT_EVENTS.has(eventName))
    ) {
      return NextResponse.json({
        error: "Unsupported analytics event.",
      }, { status: 400 });
    }

    const metadata = sanitizeActivationMetadata(body.metadata);

    await assertApiRateLimit({
      action: "analytics:event",
      request,
      sessionId: metadata.session_id,
      workspaceId: metadata.workspace_id,
    });

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    await recordUsageEvent({
      action: eventName,
      metadata,
      userId: session?.user?.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAnalyticsEventError(error);
  }
}

async function parseAnalyticsEventBody(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > MAX_ANALYTICS_EVENT_BODY_BYTES) {
    throw new AnalyticsEventBodyTooLargeError();
  }

  const text = await request.text();

  if (new TextEncoder().encode(text).length > MAX_ANALYTICS_EVENT_BODY_BYTES) {
    throw new AnalyticsEventBodyTooLargeError();
  }

  return (text ? JSON.parse(text) : {}) as {
    action?: unknown;
    eventName?: unknown;
    metadata?: unknown;
  };
}

function handleAnalyticsEventError(error: unknown) {
  if (error instanceof AnalyticsEventBodyTooLargeError) {
    return NextResponse.json({ error: error.message }, { status: 413 });
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  if (error instanceof ApiRateLimitError) {
    return NextResponse.json(
      {
        error: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
      },
      {
        headers: {
          "Retry-After": String(error.retryAfterSeconds),
        },
        status: 429,
      },
    );
  }

  if (error instanceof ApiRateLimitUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }

  throw error;
}

class AnalyticsEventBodyTooLargeError extends Error {
  constructor() {
    super("Analytics event body is too large.");
    this.name = "AnalyticsEventBodyTooLargeError";
  }
}
