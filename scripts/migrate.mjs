// Applies db/schema.sql to the database. Idempotent (CREATE TABLE IF NOT
// EXISTS). Run with: npm run db:migrate
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set (use: node --env-file=.env.local ...)");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, "../db/schema.sql"), "utf8");

const sql = postgres(url, { prepare: false });
try {
  await sql.unsafe(schema);
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'whoop_%'
    ORDER BY tablename`;
  console.log("Migration applied. Tables:", tables.map((t) => t.tablename).join(", "));
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
