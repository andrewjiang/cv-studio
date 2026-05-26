create table if not exists admin_analytics_snapshots (
  id text primary key,
  source text not null default 'ga4',
  property_id text not null,
  generated_at timestamptz not null,
  period_hours integer not null default 6,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_analytics_snapshots_generated_at_idx
on admin_analytics_snapshots(generated_at desc);
