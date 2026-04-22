import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/_lib/auth";
import {
  BillingConfigurationError,
  BillingProviderError,
  BillingValidationError,
  updateAccountSubscriptionCancellation,
} from "@/app/_lib/billing";

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({
      error: "Sign in before managing your subscription.",
    }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    cancelAtPeriodEnd?: unknown;
  };

  if (typeof body.cancelAtPeriodEnd !== "boolean") {
    return NextResponse.json({
      error: "Choose whether to cancel or resume renewal.",
    }, { status: 400 });
  }

  try {
    const payload = await updateAccountSubscriptionCancellation({
      cancelAtPeriodEnd: body.cancelAtPeriodEnd,
      userId: session.user.id,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof BillingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof BillingConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof BillingProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    throw error;
  }
}
