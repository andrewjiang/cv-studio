export type PlanKey = "free" | "pro" | "founder";

export type Entitlements = {
  apiProjectsLimit: number;
  customDomainLimit: number;
  customSubdomainLimit: number;
  monthlyAiCredits: number;
  monthlyApiCreates: number;
  monthlyPdfExports: number;
  monthlyPdfJobs: number;
  removeBranding: boolean;
};

export type PlanCatalogEntry = {
  entitlements: Entitlements;
  interval: "none" | "year" | "lifetime";
  key: PlanKey;
  label: string;
  marketingDescription: string;
};

export type EntitlementSource =
  | {
      planKey: PlanKey;
      source: "grant";
      status: "active";
      expiresAt: string | null;
    }
  | {
      cancelAtPeriodEnd: boolean;
      currentPeriodEnd: string | null;
      planKey: PlanKey;
      source: "subscription";
      status: string;
    }
  | {
      planKey: "free";
      source: "default";
      status: "active";
    };

export type EntitlementResolution = {
  entitlements: Entitlements;
  plan: PlanCatalogEntry;
  source: EntitlementSource;
};

export const PLAN_CATALOG: Record<PlanKey, PlanCatalogEntry> = {
  free: {
    entitlements: {
      apiProjectsLimit: 1,
      customDomainLimit: 0,
      customSubdomainLimit: 0,
      monthlyAiCredits: 0,
      monthlyApiCreates: 25,
      monthlyPdfExports: 10,
      monthlyPdfJobs: 10,
      removeBranding: false,
    },
    interval: "none",
    key: "free",
    label: "Free",
    marketingDescription: "Markdown editing, standard public links, PDF export, and Tiny CV branding.",
  },
  pro: {
    entitlements: {
      apiProjectsLimit: 3,
      customDomainLimit: 0,
      customSubdomainLimit: 1,
      monthlyAiCredits: 50,
      monthlyApiCreates: 500,
      monthlyPdfExports: 100,
      monthlyPdfJobs: 100,
      removeBranding: true,
    },
    interval: "year",
    key: "pro",
    label: "Annual Pro",
    marketingDescription: "Premium themes, cleaner public pages, one active premium URL, Pro limits, and AI credits when editing ships.",
  },
  founder: {
    entitlements: {
      apiProjectsLimit: 5,
      customDomainLimit: 1,
      customSubdomainLimit: 1,
      monthlyAiCredits: 100,
      monthlyApiCreates: 1_000,
      monthlyPdfExports: 250,
      monthlyPdfJobs: 250,
      removeBranding: true,
    },
    interval: "lifetime",
    key: "founder",
    label: "Founder Pass",
    marketingDescription: "Permanent Tiny CV identity, lifetime premium publishing, branding removal, and early access to future Pro features.",
  },
};

const PAID_PLAN_PRIORITY: PlanKey[] = ["founder", "pro"];
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function resolveEntitlements(input: {
  grant?: {
    expiresAt: string | null;
    planKey: PlanKey;
  } | null;
  subscription?: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    planKey: PlanKey;
    status: string;
  } | null;
}): EntitlementResolution {
  if (input.grant && input.grant.planKey !== "free") {
    return {
      entitlements: PLAN_CATALOG[input.grant.planKey].entitlements,
      plan: PLAN_CATALOG[input.grant.planKey],
      source: {
        expiresAt: input.grant.expiresAt,
        planKey: input.grant.planKey,
        source: "grant",
        status: "active",
      },
    };
  }

  if (
    input.subscription &&
    input.subscription.planKey !== "free" &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(input.subscription.status)
  ) {
    return {
      entitlements: PLAN_CATALOG[input.subscription.planKey].entitlements,
      plan: PLAN_CATALOG[input.subscription.planKey],
      source: {
        cancelAtPeriodEnd: input.subscription.cancelAtPeriodEnd,
        currentPeriodEnd: input.subscription.currentPeriodEnd,
        planKey: input.subscription.planKey,
        source: "subscription",
        status: input.subscription.status,
      },
    };
  }

  return {
    entitlements: PLAN_CATALOG.free.entitlements,
    plan: PLAN_CATALOG.free,
    source: {
      planKey: "free",
      source: "default",
      status: "active",
    },
  };
}

export function getHighestPlanKey(planKeys: PlanKey[]): PlanKey {
  for (const planKey of PAID_PLAN_PRIORITY) {
    if (planKeys.includes(planKey)) {
      return planKey;
    }
  }

  return "free";
}

export function isPlanKey(value: string): value is PlanKey {
  return value === "free" || value === "pro" || value === "founder";
}
