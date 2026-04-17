import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(repoRoot, "db", "migrations");

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});

try {
  await sql`
    create table if not exists schema_migrations (
      id text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `;

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const id = file.replace(/\.sql$/, "");
    const contents = await readFile(path.join(migrationsDir, file), "utf8");
    const checksum = createHash("sha256").update(contents).digest("hex");
    const [existing] = await sql`
      select checksum
      from schema_migrations
      where id = ${id}
      limit 1
    `;

    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(`Migration ${file} has changed since it was applied.`);
      }

      console.log(`Skipping ${file}`);
      continue;
    }

    const statements = splitSqlStatements(contents);

    await sql.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement);
      }

      await tx`
        insert into schema_migrations (id, checksum)
        values (${id}, ${checksum})
      `;
    });

    console.log(`Applied ${file}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}

function splitSqlStatements(contents) {
  return contents
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
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
