alter table billing_subscriptions
add constraint billing_subscriptions_provider_check
check (provider in ('stripe', 'manual', 'x402'));

alter table billing_subscriptions
add constraint billing_subscriptions_plan_key_check
check (plan_key in ('pro', 'founder'));

alter table billing_subscriptions
add constraint billing_subscriptions_status_check
check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid'));

alter table account_plan_grants
add constraint account_plan_grants_plan_key_check
check (plan_key in ('pro', 'founder'));

alter table account_plan_grants
add constraint account_plan_grants_source_check
check (source in ('manual', 'founder_pass', 'promotion', 'support'));

alter table usage_events
add constraint usage_events_quantity_positive_check
check (quantity > 0);
