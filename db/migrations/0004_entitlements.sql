create table if not exists billing_customers (
  user_id text primary key references auth_users(id) on delete cascade,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_subscriptions (
  id text primary key,
  user_id text not null references auth_users(id) on delete cascade,
  provider text not null,
  provider_subscription_id text not null,
  provider_customer_id text,
  plan_key text not null,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists account_plan_grants (
  id text primary key,
  user_id text not null references auth_users(id) on delete cascade,
  plan_key text not null,
  source text not null,
  reason text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists usage_events (
  id text primary key,
  user_id text references auth_users(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  action text not null,
  quantity integer not null default 1,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create unique index if not exists billing_subscriptions_provider_unique_idx
on billing_subscriptions(provider, provider_subscription_id);

create index if not exists billing_subscriptions_user_lookup_idx
on billing_subscriptions(user_id, status, current_period_end desc);

create index if not exists account_plan_grants_user_lookup_idx
on account_plan_grants(user_id, revoked_at, starts_at desc, expires_at desc);

create index if not exists usage_events_user_period_lookup_idx
on usage_events(user_id, action, occurred_at desc);

create index if not exists usage_events_project_period_lookup_idx
on usage_events(project_id, action, occurred_at desc);
