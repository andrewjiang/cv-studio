import "server-only";

import postgres from "postgres";
import Stripe from "stripe";
import {
  getCheckoutMode,
  getFounderPassLimit,
  getFounderPassRemaining,
  getStripePriceEnvKey,
  inferCheckoutPlanFromPriceId,
  isCheckoutPlanKey,
  isStripeSubscriptionStatus,
  type CheckoutPlanKey,
} from "@/app/_lib/billing-core";
import {
  recordUsageEvent,
  type UsageEventInput,
} from "@/app/_lib/usage-events";

type SqlClient = postgres.Sql | postgres.TransactionSql;

type BillingCustomerRow = {
  stripe_customer_id: string | null;
  user_id: string;
};

export type BillingLaunchState = {
  founderPassAvailable: boolean;
  founderPassLimit: number;
  founderPassRemaining: number;
  founderPassSold: number;
  stripeMode: "live" | "test" | "unconfigured";
};

export type AccountBillingManagementSummary = {
  hasStripeCustomer: boolean;
  portalAvailable: boolean;
};

export class BillingConfigurationError extends Error {
  constructor(message = "Tiny CV billing is not configured.") {
    super(message);
    this.name = "BillingConfigurationError";
  }
}

export class BillingValidationError extends Error {
  constructor(message = "Invalid billing request.") {
    super(message);
    this.name = "BillingValidationError";
  }
}

export class BillingProviderError extends Error {
  constructor(message = "Billing provider request failed.") {
    super(message);
    this.name = "BillingProviderError";
  }
}

let billingSql: postgres.Sql | null = null;
let stripeClient: Stripe | null = null;

export async function createBillingCheckoutSession(input: {
  email?: string | null;
  name?: string | null;
  planKey: CheckoutPlanKey;
  userId: string;
}) {
  const stripe = getStripeClient();

  if (input.planKey === "founder") {
    const launchState = await getBillingLaunchState();

    if (!launchState.founderPassAvailable) {
      throw new BillingValidationError("Founder Pass is sold out. Annual Pro is still available.");
    }
  }

  const priceId = await getStripePriceId(stripe, input.planKey);
  const customerId = await getOrCreateStripeCustomer({
    email: input.email,
    name: input.name,
    userId: input.userId,
  });
  const mode = getCheckoutMode(input.planKey);
  const appUrl = getAppUrl();
  const metadata = {
    planKey: input.planKey,
    tinycvUserId: input.userId,
    userId: input.userId,
  };

  const session = await stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    cancel_url: `${appUrl}/account?billing=cancelled`,
    client_reference_id: input.userId,
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata,
    mode,
    payment_intent_data: mode === "payment" ? { metadata } : undefined,
    subscription_data: mode === "subscription" ? { metadata } : undefined,
    success_url: `${appUrl}/account?billing=success`,
  }).catch((error: unknown) => {
    throw new BillingProviderError(error instanceof Error
      ? error.message
      : "Stripe checkout session creation failed.");
  });

  if (!session.url) {
    throw new BillingProviderError("Stripe did not return a checkout URL.");
  }

  await recordUsageEvent({
    action: "billing.checkout_started",
    metadata: {
      checkout_mode: mode,
      plan_key: input.planKey,
      stripe_livemode: session.livemode,
      stripe_session_id: session.id,
    },
    userId: input.userId,
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

export async function getBillingLaunchState(): Promise<BillingLaunchState> {
  const founderPassLimit = getFounderPassLimit();
  const founderPassSold = process.env.DATABASE_URL
    ? await getFounderPassSoldCount()
    : 0;
  const founderPassRemaining = getFounderPassRemaining({
    limit: founderPassLimit,
    sold: founderPassSold,
  });

  return {
    founderPassAvailable: founderPassRemaining > 0,
    founderPassLimit,
    founderPassRemaining,
    founderPassSold,
    stripeMode: getStripeMode(),
  };
}

export async function getAccountBillingManagementSummary(userId: string): Promise<AccountBillingManagementSummary> {
  if (!process.env.DATABASE_URL) {
    return {
      hasStripeCustomer: false,
      portalAvailable: false,
    };
  }

  const customerId = await getStripeCustomerIdForUser(userId);

  return {
    hasStripeCustomer: Boolean(customerId),
    portalAvailable: Boolean(customerId && process.env.STRIPE_SECRET_KEY?.trim()),
  };
}

export async function createBillingPortalSession(input: {
  userId: string;
}) {
  const stripe = getStripeClient();
  const customerId = await getStripeCustomerIdForUser(input.userId);

  if (!customerId) {
    throw new BillingValidationError("No Stripe customer exists for this account yet.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/account`,
  }).catch((error: unknown) => {
    throw new BillingProviderError(error instanceof Error
      ? error.message
      : "Stripe billing portal session creation failed.");
  });

  return {
    portalUrl: session.url,
  };
}

export function constructStripeWebhookEvent(input: {
  payload: string;
  signature: string | null;
}) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new BillingConfigurationError("STRIPE_WEBHOOK_SECRET is required for Stripe webhooks.");
  }

  if (!input.signature) {
    throw new BillingValidationError("Missing Stripe signature header.");
  }

  return getStripeClient().webhooks.constructEvent(
    input.payload,
    input.signature,
    webhookSecret,
  );
}

export async function processStripeWebhookEvent(event: Stripe.Event) {
  const stripe = getStripeClient();
  const sql = getBillingSql();
  const expandedSubscription = event.type === "checkout.session.completed"
    ? await getCheckoutSessionSubscription(stripe, event.data.object as Stripe.Checkout.Session)
    : null;

  const result = await sql.begin(async (tx) => {
    const [inserted] = await tx<{ id: string }[]>`
      insert into billing_webhook_events (
        id,
        event_type,
        livemode,
        processed_at,
        created_at
      ) values (
        ${event.id},
        ${event.type},
        ${event.livemode},
        ${null},
        ${new Date()}
      )
      on conflict (id) do nothing
      returning id
    `;

    if (!inserted) {
      return {
        eventId: event.id,
        processed: false,
        usageEvent: null,
      };
    }

    let usageEvent: UsageEventInput | null = null;

    if (event.type === "checkout.session.completed") {
      usageEvent = await handleCheckoutSessionCompleted(
        tx,
        event.data.object as Stripe.Checkout.Session,
        expandedSubscription,
      );
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await upsertStripeSubscription(tx, event.data.object as Stripe.Subscription);
    }

    await tx`
      update billing_webhook_events
      set processed_at = ${new Date()}
      where id = ${event.id}
    `;

    return {
      eventId: event.id,
      processed: true,
      usageEvent,
    };
  });

  if (result.usageEvent) {
    await recordUsageEvent(result.usageEvent);
  }

  return {
    eventId: result.eventId,
    processed: result.processed,
  };
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new BillingConfigurationError("STRIPE_SECRET_KEY is required for Stripe billing.");
  }

  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

function getBillingSql() {
  if (!process.env.DATABASE_URL) {
    throw new BillingConfigurationError("DATABASE_URL is required for Tiny CV billing.");
  }

  billingSql ??= postgres(process.env.DATABASE_URL, {
    max: 5,
    prepare: false,
  });

  return billingSql;
}

async function getStripePriceId(stripe: Stripe, planKey: CheckoutPlanKey) {
  const envKey = getStripePriceEnvKey(planKey);
  const configuredId = process.env[envKey]?.trim();

  if (!configuredId) {
    throw new BillingConfigurationError(`${envKey} is required for Stripe billing.`);
  }

  if (configuredId.startsWith("price_")) {
    return configuredId;
  }

  if (!configuredId.startsWith("prod_")) {
    throw new BillingConfigurationError(`${envKey} must be a Stripe price_ or product prod_ id.`);
  }

  const product = await stripe.products.retrieve(configuredId, {
    expand: ["default_price"],
  }).catch((error: unknown) => {
    throw new BillingProviderError(error instanceof Error
      ? error.message
      : `Could not resolve ${envKey} product default price.`);
  });
  const defaultPrice = product.default_price;

  if (typeof defaultPrice === "string" && defaultPrice.startsWith("price_")) {
    return defaultPrice;
  }

  if (
    defaultPrice &&
    typeof defaultPrice === "object" &&
    "id" in defaultPrice &&
    typeof defaultPrice.id === "string"
  ) {
    return defaultPrice.id;
  }

  throw new BillingConfigurationError(`${envKey} product does not have a default Stripe price.`);
}

async function getOrCreateStripeCustomer(input: {
  email?: string | null;
  name?: string | null;
  userId: string;
}) {
  const sql = getBillingSql();
  const [existing] = await sql<BillingCustomerRow[]>`
    select user_id, stripe_customer_id
    from billing_customers
    where user_id = ${input.userId}
    limit 1
  `;

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const customer = await getStripeClient().customers.create({
    email: input.email || undefined,
    metadata: {
      tinycvUserId: input.userId,
      userId: input.userId,
    },
    name: input.name || undefined,
  });

  const [upserted] = await sql<BillingCustomerRow[]>`
    insert into billing_customers (
      user_id,
      stripe_customer_id,
      created_at,
      updated_at
    ) values (
      ${input.userId},
      ${customer.id},
      ${new Date()},
      ${new Date()}
    )
    on conflict (user_id)
    do update set
      stripe_customer_id = coalesce(billing_customers.stripe_customer_id, excluded.stripe_customer_id),
      updated_at = excluded.updated_at
    returning user_id, stripe_customer_id
  `;

  if (!upserted?.stripe_customer_id) {
    throw new BillingProviderError("Could not create a Stripe customer.");
  }

  return upserted.stripe_customer_id;
}

async function getStripeCustomerIdForUser(userId: string) {
  const sql = getBillingSql();
  const [existing] = await sql<BillingCustomerRow[]>`
    select user_id, stripe_customer_id
    from billing_customers
    where user_id = ${userId}
    limit 1
  `;

  return existing?.stripe_customer_id ?? null;
}

async function handleCheckoutSessionCompleted(
  sql: SqlClient,
  session: Stripe.Checkout.Session,
  expandedSubscription: Stripe.Subscription | null,
): Promise<UsageEventInput | null> {
  const metadata = session.metadata ?? {};
  const userId = metadata.userId || metadata.tinycvUserId;
  const planKey = metadata.planKey;

  if (!userId || !isCheckoutPlanKey(planKey)) {
    return null;
  }

  const customerId = getStripeCustomerId(session.customer);

  if (customerId) {
    await upsertBillingCustomer(sql, userId, customerId);
  }

  if (planKey === "founder" && session.payment_status === "paid") {
    await grantFounderPass(sql, {
      customerId,
      session,
      userId,
    });
  } else if (planKey === "pro" && expandedSubscription) {
    await upsertStripeSubscription(sql, expandedSubscription);
  }

  return {
    action: "billing.checkout_completed",
    metadata: {
      checkout_mode: session.mode,
      payment_status: session.payment_status,
      plan_key: planKey,
      stripe_customer_id: customerId,
      stripe_livemode: session.livemode,
      stripe_session_id: session.id,
      stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
    },
    userId,
  };
}

async function grantFounderPass(
  sql: SqlClient,
  input: {
    customerId: string | null;
    session: Stripe.Checkout.Session;
    userId: string;
  },
) {
  const now = new Date();
  const grantId = `stripe_checkout:${input.session.id}`;

  await sql`
    insert into account_plan_grants (
      id,
      user_id,
      plan_key,
      source,
      reason,
      starts_at,
      expires_at,
      revoked_at,
      metadata,
      created_at,
      updated_at
    ) values (
      ${grantId},
      ${input.userId},
      ${"founder"},
      ${"founder_pass"},
      ${"Stripe Founder Pass checkout"},
      ${now},
      ${null},
      ${null},
      ${getBillingSql().json({
        amount_total: input.session.amount_total,
        currency: input.session.currency,
        stripe_customer_id: input.customerId,
        stripe_session_id: input.session.id,
      } as postgres.JSONValue)},
      ${now},
      ${now}
    )
    on conflict (id)
    do update set
      revoked_at = null,
      updated_at = excluded.updated_at
  `;
}

async function upsertStripeSubscription(sql: SqlClient, subscription: Stripe.Subscription) {
  const customerId = getStripeCustomerId(subscription.customer);
  const userId = subscription.metadata.userId ||
    subscription.metadata.tinycvUserId ||
    (customerId ? await findUserIdByStripeCustomer(sql, customerId) : null);
  const planKey = getSubscriptionPlanKey(subscription);

  if (!userId || planKey !== "pro" || !isStripeSubscriptionStatus(subscription.status)) {
    return;
  }

  if (customerId) {
    await upsertBillingCustomer(sql, userId, customerId);
  }

  const now = new Date();
  const period = getSubscriptionPeriod(subscription);

  await sql`
    insert into billing_subscriptions (
      id,
      user_id,
      provider,
      provider_subscription_id,
      provider_customer_id,
      plan_key,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      canceled_at,
      created_at,
      updated_at
    ) values (
      ${`stripe_subscription:${subscription.id}`},
      ${userId},
      ${"stripe"},
      ${subscription.id},
      ${customerId},
      ${planKey},
      ${subscription.status},
      ${period.currentPeriodStart},
      ${period.currentPeriodEnd},
      ${subscription.cancel_at_period_end},
      ${toDate(subscription.canceled_at)},
      ${now},
      ${now}
    )
    on conflict (provider, provider_subscription_id)
    do update set
      provider_customer_id = excluded.provider_customer_id,
      plan_key = excluded.plan_key,
      status = excluded.status,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      canceled_at = excluded.canceled_at,
      updated_at = excluded.updated_at
  `;
}

async function upsertBillingCustomer(
  sql: SqlClient,
  userId: string,
  stripeCustomerId: string,
) {
  await sql`
    insert into billing_customers (
      user_id,
      stripe_customer_id,
      created_at,
      updated_at
    ) values (
      ${userId},
      ${stripeCustomerId},
      ${new Date()},
      ${new Date()}
    )
    on conflict (user_id)
    do update set
      stripe_customer_id = excluded.stripe_customer_id,
      updated_at = excluded.updated_at
  `;
}

async function findUserIdByStripeCustomer(sql: SqlClient, stripeCustomerId: string) {
  const [row] = await sql<{ user_id: string }[]>`
    select user_id
    from billing_customers
    where stripe_customer_id = ${stripeCustomerId}
    limit 1
  `;

  return row?.user_id ?? null;
}

async function getFounderPassSoldCount() {
  const sql = getBillingSql();
  const [row] = await sql<{ count: number | string }[]>`
    select count(*) as count
    from account_plan_grants
    where plan_key = 'founder'
      and source = 'founder_pass'
      and revoked_at is null
      and starts_at <= now()
      and (expires_at is null or expires_at > now())
  `;

  return Number(row?.count ?? 0);
}

async function getCheckoutSessionSubscription(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (session.mode !== "subscription" || typeof session.subscription !== "string") {
    return null;
  }

  return await stripe.subscriptions.retrieve(session.subscription);
}

function getSubscriptionPlanKey(subscription: Stripe.Subscription): CheckoutPlanKey | null {
  const metadataPlanKey = subscription.metadata.planKey;

  if (isCheckoutPlanKey(metadataPlanKey)) {
    return metadataPlanKey;
  }

  return inferCheckoutPlanFromPriceId({
    founderPriceId: process.env.STRIPE_FOUNDER_PRICE_ID?.trim(),
    priceId: subscription.items.data[0]?.price.id,
    proAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID?.trim(),
  });
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const subscriptionItem = subscription.items.data[0];

  return {
    currentPeriodEnd: toDate(subscriptionItem?.current_period_end),
    currentPeriodStart: toDate(subscriptionItem?.current_period_start),
  };
}

function getStripeCustomerId(customer: Stripe.Checkout.Session["customer"] | Stripe.Subscription["customer"]) {
  if (!customer) {
    return null;
  }

  return typeof customer === "string" ? customer : customer.id;
}

function toDate(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function getAppUrl() {
  const appUrl =
    process.env.TINYCV_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_TINYCV_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `http://localhost:${process.env.PORT || "3000"}`;

  return appUrl.replace(/\/+$/, "");
}

function getStripeMode(): BillingLaunchState["stripeMode"] {
  const key = process.env.STRIPE_SECRET_KEY?.trim();

  if (!key) {
    return "unconfigured";
  }

  return key.startsWith("sk_live_") ? "live" : "test";
}
