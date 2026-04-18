import { describe, expect, it } from "vitest";
import {
  getCheckoutMode,
  getStripePriceEnvKey,
  inferCheckoutPlanFromPriceId,
  isCheckoutPlanKey,
  isStripeSubscriptionStatus,
} from "@/app/_lib/billing-core";

describe("billing-core", () => {
  it("accepts only paid checkout plan keys", () => {
    expect(isCheckoutPlanKey("founder")).toBe(true);
    expect(isCheckoutPlanKey("pro")).toBe(true);
    expect(isCheckoutPlanKey("free")).toBe(false);
    expect(isCheckoutPlanKey("enterprise")).toBe(false);
  });

  it("maps plans to Stripe checkout modes", () => {
    expect(getCheckoutMode("founder")).toBe("payment");
    expect(getCheckoutMode("pro")).toBe("subscription");
  });

  it("maps plans to Stripe price env vars", () => {
    expect(getStripePriceEnvKey("founder")).toBe("STRIPE_FOUNDER_PRICE_ID");
    expect(getStripePriceEnvKey("pro")).toBe("STRIPE_PRO_ANNUAL_PRICE_ID");
  });

  it("recognizes Stripe subscription statuses we persist", () => {
    expect(isStripeSubscriptionStatus("active")).toBe(true);
    expect(isStripeSubscriptionStatus("trialing")).toBe(true);
    expect(isStripeSubscriptionStatus("incomplete_expired")).toBe(true);
    expect(isStripeSubscriptionStatus("paused")).toBe(true);
    expect(isStripeSubscriptionStatus("ended")).toBe(false);
  });

  it("infers checkout plans from configured price IDs", () => {
    expect(inferCheckoutPlanFromPriceId({
      founderPriceId: "price_founder",
      priceId: "price_founder",
      proAnnualPriceId: "price_pro",
    })).toBe("founder");

    expect(inferCheckoutPlanFromPriceId({
      founderPriceId: "price_founder",
      priceId: "price_pro",
      proAnnualPriceId: "price_pro",
    })).toBe("pro");

    expect(inferCheckoutPlanFromPriceId({
      founderPriceId: "price_founder",
      priceId: "price_other",
      proAnnualPriceId: "price_pro",
    })).toBeNull();
  });
});
