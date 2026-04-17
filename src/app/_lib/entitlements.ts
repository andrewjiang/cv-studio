import "server-only";

import postgres from "postgres";
import {
  isPlanKey,
  resolveEntitlements,
  type EntitlementResolution,
} from "@/app/_lib/entitlements-core";

type BillingSubscriptionRow = {
  cancel_at_period_end: boolean;
  current_period_end: Date | string | null;
  plan_key: string;
  status: string;
};

type AccountPlanGrantRow = {
  expires_at: Date | string | null;
  plan_key: string;
};

let entitlementSql: postgres.Sql | null = null;

export async function getUserEntitlements(userId: string): Promise<EntitlementResolution> {
  const sql = getEntitlementSql();
  const [grant] = await sql<AccountPlanGrantRow[]>`
    select
      plan_key,
      expires_at
    from account_plan_grants
    where user_id = ${userId}
      and revoked_at is null
      and starts_at <= now()
      and (expires_at is null or expires_at > now())
    order by
      case plan_key
        when 'founder' then 1
        when 'pro' then 2
        else 99
      end,
      expires_at desc nulls first,
      created_at desc
    limit 1
  `;

  if (grant && isPlanKey(grant.plan_key)) {
    return resolveEntitlements({
      grant: {
        expiresAt: formatNullableTimestamp(grant.expires_at),
        planKey: grant.plan_key,
      },
    });
  }

  const [subscription] = await sql<BillingSubscriptionRow[]>`
    select
      plan_key,
      status,
      current_period_end,
      cancel_at_period_end
    from billing_subscriptions
    where user_id = ${userId}
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
    order by
      case plan_key
        when 'founder' then 1
        when 'pro' then 2
        else 99
      end,
      current_period_end desc nulls first,
      updated_at desc
    limit 1
  `;

  if (subscription && isPlanKey(subscription.plan_key)) {
    return resolveEntitlements({
      subscription: {
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: formatNullableTimestamp(subscription.current_period_end),
        planKey: subscription.plan_key,
        status: subscription.status,
      },
    });
  }

  return resolveEntitlements({});
}

function getEntitlementSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Tiny CV entitlements.");
  }

  entitlementSql ??= postgres(process.env.DATABASE_URL, {
    max: 3,
    prepare: false,
  });

  return entitlementSql;
}

function formatNullableTimestamp(value: Date | string | null) {
  return value ? (value instanceof Date ? value : new Date(value)).toISOString() : null;
}
