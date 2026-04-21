create table if not exists account_developer_projects (
  user_id text primary key references auth_users(id) on delete cascade,
  project_id text not null unique references projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_developer_projects_project_idx
on account_developer_projects(project_id);
