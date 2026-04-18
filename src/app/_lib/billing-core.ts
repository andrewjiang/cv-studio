import type { PlanKey } from "@/app/_lib/entitlements-core";

export type CheckoutPlanKey = Exclude<PlanKey, "free">;

export type StripeSubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "paused"
  | "trialing"
  | "unpaid";

const CHECKOUT_PLAN_KEYS = new Set<CheckoutPlanKey>(["founder", "pro"]);
const STRIPE_SUBSCRIPTION_STATUSES = new Set<StripeSubscriptionStatus>([
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
]);

export function isCheckoutPlanKey(value: unknown): value is CheckoutPlanKey {
  return typeof value === "string" && CHECKOUT_PLAN_KEYS.has(value as CheckoutPlanKey);
}

export function getCheckoutMode(planKey: CheckoutPlanKey) {
  return planKey === "founder" ? "payment" : "subscription";
}

export function getStripePriceEnvKey(planKey: CheckoutPlanKey) {
  return planKey === "founder"
    ? "STRIPE_FOUNDER_PRICE_ID"
    : "STRIPE_PRO_ANNUAL_PRICE_ID";
}

export function isStripeSubscriptionStatus(value: string): value is StripeSubscriptionStatus {
  return STRIPE_SUBSCRIPTION_STATUSES.has(value as StripeSubscriptionStatus);
}

export function inferCheckoutPlanFromPriceId(input: {
  founderPriceId?: string | null;
  priceId?: string | null;
  proAnnualPriceId?: string | null;
}): CheckoutPlanKey | null {
  if (input.priceId && input.priceId === input.founderPriceId) {
    return "founder";
  }

  if (input.priceId && input.priceId === input.proAnnualPriceId) {
    return "pro";
  }

  return null;
}
