import postgres from "postgres";

// Single Postgres client. Standard wire protocol via postgres.js — no
// provider-specific APIs, so the database can move off Neon by changing only
// DATABASE_URL. `prepare: false` keeps it compatible with pgbouncer-style
// pooled connection strings (Neon's pooled endpoint).

const g = globalThis as unknown as { _sql?: ReturnType<typeof postgres> };

// Neon's Vercel integration may inject a URL with `channel_binding=require`,
// which postgres.js doesn't support. Strip it (sslmode is preserved) so the
// connection works regardless of which variant the platform provides.
function sanitize(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

export function getSql() {
  if (g._sql) return g._sql;
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const url = sanitize(raw);
  // Memoize on globalThis in every environment: reused across dev hot-reloads
  // and across requests in a warm serverless instance, so we don't open a new
  // connection pool per invocation.
  g._sql = postgres(url, { prepare: false });
  return g._sql;
}
