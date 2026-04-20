create table if not exists user_publication_settings (
  user_id text primary key references auth_users(id) on delete cascade,
  primary_resume_id text references resumes(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

