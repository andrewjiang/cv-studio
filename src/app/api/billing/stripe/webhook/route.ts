import { NextResponse, type NextRequest } from "next/server";
import {
  BillingConfigurationError,
  BillingValidationError,
  constructStripeWebhookEvent,
  processStripeWebhookEvent,
} from "@/app/_lib/billing";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    const event = constructStripeWebhookEvent({
      payload,
      signature,
    });
    const result = await processStripeWebhookEvent(event);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BillingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof BillingConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: "Invalid Stripe webhook." }, { status: 400 });
  }
}
