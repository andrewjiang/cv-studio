import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to check database security.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});

try {
  const tables = await sql`
    select c.relname as table_name, c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
    order by c.relname
  `;

  const exposedTableGrants = await sql`
    select table_name, grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
    order by table_name, grantee, privilege_type
  `;

  const exposedRoutineGrants = await sql`
    select routine_name, grantee, privilege_type
    from information_schema.role_routine_grants
    where routine_schema = 'public'
      and grantee in ('anon', 'authenticated')
    order by routine_name, grantee, privilege_type
  `;

  const rlsDisabledTables = tables.filter((table) => !table.rls_enabled);

  if (rlsDisabledTables.length > 0 || exposedTableGrants.length > 0 || exposedRoutineGrants.length > 0) {
    if (rlsDisabledTables.length > 0) {
      console.error("Public tables without RLS:");
      for (const table of rlsDisabledTables) {
        console.error(`- ${table.table_name}`);
      }
    }

    if (exposedTableGrants.length > 0) {
      console.error("Table grants exposed to Supabase browser API roles:");
      for (const grant of exposedTableGrants) {
        console.error(`- ${grant.table_name}: ${grant.grantee} ${grant.privilege_type}`);
      }
    }

    if (exposedRoutineGrants.length > 0) {
      console.error("Routine grants exposed to Supabase browser API roles:");
      for (const grant of exposedRoutineGrants) {
        console.error(`- ${grant.routine_name}: ${grant.grantee} ${grant.privilege_type}`);
      }
    }

    process.exit(1);
  }

  console.log(`Supabase public API lockdown verified for ${tables.length} public tables.`);
} finally {
  await sql.end({ timeout: 5 });
}

async function loadEnvFile(fileName) {
  try {
    const contents = await readFile(path.join(repoRoot, fileName), "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

      process.env[key] ??= value;
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}
