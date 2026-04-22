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
  const statements = [];
  let statement = "";
  let quote = null;
  let dollarQuote = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
    const next = contents[index + 1];

    if (inLineComment) {
      statement += char;
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      statement += char;
      if (char === "*" && next === "/") {
        statement += next;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (dollarQuote) {
      if (contents.startsWith(dollarQuote, index)) {
        statement += dollarQuote;
        index += dollarQuote.length - 1;
        dollarQuote = null;
      } else {
        statement += char;
      }
      continue;
    }

    if (quote) {
      statement += char;

      if (char === quote) {
        if ((quote === "'" || quote === "\"") && next === quote) {
          statement += next;
          index += 1;
          continue;
        }

        quote = null;
      }

      continue;
    }

    if (char === "-" && next === "-") {
      statement += char + next;
      index += 1;
      inLineComment = true;
      continue;
    }

    if (char === "/" && next === "*") {
      statement += char + next;
      index += 1;
      inBlockComment = true;
      continue;
    }

    if (char === "'" || char === "\"") {
      statement += char;
      quote = char;
      continue;
    }

    const dollarMatch = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(contents.slice(index));
    if (dollarMatch) {
      dollarQuote = dollarMatch[0];
      statement += dollarQuote;
      index += dollarQuote.length - 1;
      continue;
    }

    if (char === ";") {
      const trimmed = statement.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      statement = "";
      continue;
    }

    statement += char;
  }

  const trimmed = statement.trim();
  if (trimmed) {
    statements.push(trimmed);
  }

  return statements;
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
