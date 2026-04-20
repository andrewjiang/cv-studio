create table if not exists resume_domains (
  id text primary key,
  user_id text not null references auth_users(id) on delete cascade,
  resume_id text not null references resumes(id),
  hostname text not null,
  domain_type text not null,
  status text not null,
  provider text not null,
  provider_domain_id text,
  verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_domains_domain_type_check
    check (domain_type in ('tinycv_subdomain', 'custom_domain')),
  constraint resume_domains_status_check
    check (status in ('active', 'pending', 'disabled', 'needs_configuration', 'verification_failed')),
  constraint resume_domains_provider_check
    check (provider in ('vercel', 'cloudflare', 'manual'))
);

create unique index if not exists resume_domains_active_hostname_idx
  on resume_domains (lower(hostname))
  where disabled_at is null;

create index if not exists resume_domains_user_type_idx
  on resume_domains (user_id, domain_type, disabled_at);

create index if not exists resume_domains_resume_idx
  on resume_domains (resume_id);
