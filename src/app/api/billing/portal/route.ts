import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/_lib/auth";
import {
  BillingConfigurationError,
  BillingProviderError,
  BillingValidationError,
  createBillingPortalSession,
} from "@/app/_lib/billing";

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({
      error: "Sign in before managing billing.",
    }, { status: 401 });
  }

  try {
    const portal = await createBillingPortalSession({
      userId: session.user.id,
    });

    return NextResponse.json(portal);
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
