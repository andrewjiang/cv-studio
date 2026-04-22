-- Tiny CV uses server-side Postgres access. Browser clients should never read
-- or mutate application tables directly through Supabase's public API roles.

do $$
declare
  table_record record;
begin
  for table_record in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'alter table %I.%I enable row level security',
      table_record.schema_name,
      table_record.table_name
    );
  end loop;
end
$$;

do $$
begin
  if to_regrole('anon') is not null then
    execute 'revoke usage on schema public from anon';
    execute 'revoke all privileges on all tables in schema public from anon';
    execute 'revoke all privileges on all sequences in schema public from anon';
    execute 'revoke all privileges on all functions in schema public from anon';
    execute 'alter default privileges in schema public revoke all on tables from anon';
    execute 'alter default privileges in schema public revoke all on sequences from anon';
    execute 'alter default privileges in schema public revoke all on functions from anon';
  end if;

  if to_regrole('authenticated') is not null then
    execute 'revoke usage on schema public from authenticated';
    execute 'revoke all privileges on all tables in schema public from authenticated';
    execute 'revoke all privileges on all sequences in schema public from authenticated';
    execute 'revoke all privileges on all functions in schema public from authenticated';
    execute 'alter default privileges in schema public revoke all on tables from authenticated';
    execute 'alter default privileges in schema public revoke all on sequences from authenticated';
    execute 'alter default privileges in schema public revoke all on functions from authenticated';
  end if;
end
$$;
