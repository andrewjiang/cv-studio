create unique index if not exists resumes_editor_token_hash_idx
on resumes(editor_token_hash);

create index if not exists workspace_resume_memberships_resume_idx
on workspace_resume_memberships(resume_id);
