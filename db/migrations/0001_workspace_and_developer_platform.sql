create table if not exists resumes (
  id text primary key,
  slug text not null unique,
  title text not null,
  title_is_custom boolean not null default false,
  markdown text not null,
  fit_scale double precision not null default 1,
  published_markdown text,
  published_fit_scale double precision,
  is_published boolean not null default false,
  editor_token_hash text not null,
  template_key text not null default 'engineer',
  created_via text not null default 'workspace',
  last_compiler_input_format text,
  source_project_id text,
  public_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists workspaces (
  id text primary key,
  current_resume_id text references resumes(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_resume_memberships (
  workspace_id text not null references workspaces(id),
  resume_id text not null references resumes(id),
  attached_via text not null,
  last_opened_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, resume_id)
);

create table if not exists projects (
  id text primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_api_keys (
  id text primary key,
  project_id text not null references projects(id),
  label text not null,
  key_prefix text not null,
  key_hash text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists project_resume_memberships (
  project_id text not null references projects(id),
  resume_id text not null references resumes(id),
  attached_via text not null,
  external_resume_id text,
  client_reference_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, resume_id)
);

create table if not exists resume_edit_claims (
  id text primary key,
  resume_id text not null references resumes(id),
  project_id text references projects(id),
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists pdf_jobs (
  id text primary key,
  project_id text not null references projects(id),
  resume_id text not null references resumes(id),
  status text not null,
  error_code text,
  error_message text,
  pdf_storage_key text,
  pdf_blob bytea,
  content_type text,
  file_name text,
  requested_page_size text,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  idempotency_key text,
  updated_at timestamptz not null default now()
);

create table if not exists webhook_endpoints (
  id text primary key,
  project_id text not null references projects(id),
  url text not null,
  description text,
  secret_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists webhook_deliveries (
  id text primary key,
  webhook_endpoint_id text not null references webhook_endpoints(id),
  event_type text not null,
  event_id text not null,
  status_code integer,
  attempt_count integer not null default 0,
  last_error text,
  next_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists api_idempotency_keys (
  id text primary key,
  project_id text not null references projects(id),
  operation text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_body jsonb,
  status_code integer,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists self_serve_bootstrap_attempts (
  id text primary key,
  fingerprint_hash text not null,
  outcome text not null,
  created_at timestamptz not null default now()
);

alter table resumes
add column if not exists created_via text not null default 'workspace';

alter table resumes
add column if not exists last_compiler_input_format text;

alter table resumes
add column if not exists source_project_id text;

alter table resumes
add column if not exists public_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists project_api_keys_key_hash_idx
on project_api_keys(key_hash);

create unique index if not exists project_resume_memberships_external_resume_idx
on project_resume_memberships(project_id, external_resume_id)
where external_resume_id is not null;

create unique index if not exists webhook_endpoints_project_url_idx
on webhook_endpoints(project_id, url);

create unique index if not exists api_idempotency_keys_unique_idx
on api_idempotency_keys(project_id, operation, idempotency_key);

create index if not exists pdf_jobs_project_lookup_idx
on pdf_jobs(project_id, resume_id, requested_at desc);

create index if not exists workspace_resume_memberships_lookup_idx
on workspace_resume_memberships(workspace_id, deleted_at, last_opened_at desc);

create index if not exists self_serve_bootstrap_attempts_fingerprint_created_idx
on self_serve_bootstrap_attempts (fingerprint_hash, created_at desc);
