alter table webhook_deliveries
add column if not exists payload jsonb;

alter table webhook_deliveries
add column if not exists signature text;

alter table webhook_deliveries
add column if not exists updated_at timestamptz not null default now();

create table if not exists api_rate_limit_events (
  id text primary key,
  action text not null,
  subject_type text not null,
  subject_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists resumes_slug_lower_idx
on resumes(lower(slug));

create index if not exists api_rate_limit_events_lookup_idx
on api_rate_limit_events(subject_type, subject_hash, action, created_at desc);

create index if not exists webhook_deliveries_due_idx
on webhook_deliveries(delivered_at, next_attempt_at, attempt_count, created_at);
