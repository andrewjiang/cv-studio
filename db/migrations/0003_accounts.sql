create table if not exists auth_users (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_sessions (
  id text primary key,
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  user_id text not null references auth_users(id) on delete cascade
);

create index if not exists auth_sessions_user_id_idx
on auth_sessions(user_id);

create table if not exists auth_accounts (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references auth_users(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auth_accounts_user_id_idx
on auth_accounts(user_id);

create table if not exists auth_verifications (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auth_verifications_identifier_idx
on auth_verifications(identifier);

create table if not exists user_profiles (
  user_id text primary key references auth_users(id) on delete cascade,
  current_resume_id text references resumes(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_resume_memberships (
  user_id text not null references auth_users(id) on delete cascade,
  resume_id text not null references resumes(id),
  attached_via text not null,
  last_opened_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, resume_id)
);

create index if not exists user_resume_memberships_user_lookup_idx
on user_resume_memberships(user_id, deleted_at, last_opened_at desc);

create index if not exists user_resume_memberships_resume_id_idx
on user_resume_memberships(resume_id);
