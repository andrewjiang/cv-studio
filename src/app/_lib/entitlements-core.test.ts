import { describe, expect, it } from "vitest";
import {
  getHighestPlanKey,
  isPlanKey,
  resolveEntitlements,
} from "@/app/_lib/entitlements-core";

describe("entitlements-core", () => {
  it("defaults anonymous account state to the free plan", () => {
    const resolution = resolveEntitlements({});

    expect(resolution.plan.key).toBe("free");
    expect(resolution.source.source).toBe("default");
    expect(resolution.entitlements.removeBranding).toBe(false);
    expect(resolution.entitlements.apiProjectsLimit).toBe(1);
  });

  it("uses an active Pro subscription", () => {
    const resolution = resolveEntitlements({
      subscription: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2027-04-17T00:00:00.000Z",
        planKey: "pro",
        status: "active",
      },
    });

    expect(resolution.plan.key).toBe("pro");
    expect(resolution.source.source).toBe("subscription");
    expect(resolution.entitlements.removeBranding).toBe(true);
    expect(resolution.entitlements.customSubdomainLimit).toBe(1);
  });

  it("ignores inactive subscriptions", () => {
    const resolution = resolveEntitlements({
      subscription: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2027-04-17T00:00:00.000Z",
        planKey: "pro",
        status: "canceled",
      },
    });

    expect(resolution.plan.key).toBe("free");
    expect(resolution.source.source).toBe("default");
  });

  it("prefers an active founder grant over a Pro subscription", () => {
    const resolution = resolveEntitlements({
      grant: {
        expiresAt: null,
        planKey: "founder",
      },
      subscription: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2027-04-17T00:00:00.000Z",
        planKey: "pro",
        status: "active",
      },
    });

    expect(resolution.plan.key).toBe("founder");
    expect(resolution.source.source).toBe("grant");
    expect(resolution.entitlements.customDomainLimit).toBe(1);
    expect(resolution.entitlements.monthlyPdfExports).toBe(250);
  });

  it("orders paid plans by entitlement priority", () => {
    expect(getHighestPlanKey(["free", "pro"])).toBe("pro");
    expect(getHighestPlanKey(["free", "founder", "pro"])).toBe("founder");
    expect(getHighestPlanKey(["free"])).toBe("free");
  });

  it("validates supported plan keys", () => {
    expect(isPlanKey("free")).toBe(true);
    expect(isPlanKey("pro")).toBe(true);
    expect(isPlanKey("founder")).toBe(true);
    expect(isPlanKey("enterprise")).toBe(false);
  });
});
