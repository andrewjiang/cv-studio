import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/_lib/auth";
import {
  BillingConfigurationError,
  BillingProviderError,
  BillingValidationError,
  createBillingCheckoutSession,
} from "@/app/_lib/billing";
import { isCheckoutPlanKey } from "@/app/_lib/billing-core";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({
      error: "Sign in before starting checkout.",
    }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    planKey?: unknown;
  };

  if (!isCheckoutPlanKey(body.planKey)) {
    return NextResponse.json({
      error: "Choose Founder Pass or Annual Pro.",
    }, { status: 400 });
  }

  try {
    const checkout = await createBillingCheckoutSession({
      email: session.user.email,
      name: session.user.name,
      planKey: body.planKey,
      userId: session.user.id,
    });

    return NextResponse.json(checkout);
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
