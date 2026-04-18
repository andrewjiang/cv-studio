create table if not exists billing_webhook_events (
  id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table billing_subscriptions
drop constraint if exists billing_subscriptions_status_check;

alter table billing_subscriptions
add constraint billing_subscriptions_status_check
check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'));
