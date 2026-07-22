import { getSql } from "@/lib/db";
import {
  decryptTokens,
  encryptTokens,
  ensureAccessToken,
  type TokenBundle,
} from "@/lib/whoop";

// DB-backed token store (single-user, one row). Replaces the cookie so the
// cron sync can refresh + call WHOOP without a browser.

export async function saveTokens(tokens: TokenBundle, whoopUserId?: number) {
  const sql = getSql();
  const enc = encryptTokens(tokens);
  await sql`
    INSERT INTO whoop_account (id, whoop_user_id, tokens, updated_at)
    VALUES ('me', ${whoopUserId ?? null}, ${enc}, now())
    ON CONFLICT (id) DO UPDATE SET
      tokens = excluded.tokens,
      whoop_user_id = COALESCE(excluded.whoop_user_id, whoop_account.whoop_user_id),
      updated_at = now()`;
}

export async function loadTokens(): Promise<TokenBundle | null> {
  const sql = getSql();
  const rows = await sql`SELECT tokens FROM whoop_account WHERE id = 'me'`;
  if (!rows.length) return null;
  return decryptTokens(rows[0].tokens);
}

export async function clearTokens() {
  const sql = getSql();
  await sql`DELETE FROM whoop_account WHERE id = 'me'`;
}

export async function isConnected(): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`SELECT 1 FROM whoop_account WHERE id = 'me' LIMIT 1`;
  return rows.length > 0;
}

// A stable 64-bit key for the token-refresh advisory lock. Any constant works
// as long as it's unique among advisory locks used in this database.
const REFRESH_LOCK_KEY = 827400001;

/** Load tokens, refresh if near expiry (persisting the rotated bundle), and
 *  return a valid access token — or null if not connected / refresh failed.
 *
 *  WHOOP rotates the refresh token on every use and treats reuse of a spent one
 *  as a breach — revoking the whole chain. So two refreshes racing on the same
 *  token would permanently kill the connection (this is what a rapidly-clicked
 *  "Sync now", or an overlapping cron + manual sync, used to do). To prevent
 *  that, the refresh is single-flighted behind a transaction-level advisory
 *  lock shared by every serverless instance: exactly one caller refreshes; the
 *  rest wait, then re-read and use the token it just saved. */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;
  // Fast path: the current token is still comfortably valid, so no refresh and
  // no lock — the common case never contends.
  if (Date.now() < tokens.expires_at - 60_000) return tokens.access_token;

  const sql = getSql();
  try {
    return await sql.begin(async (tx) => {
      // Serialize refreshes across all instances. pg_advisory_xact_lock auto-
      // releases at commit and lives on the transaction's own connection, so
      // it's safe through Neon's pooled (pgbouncer) endpoint.
      await tx`SELECT pg_advisory_xact_lock(${REFRESH_LOCK_KEY})`;

      // Double-checked: while we waited, another caller may have refreshed.
      const rows = await tx`SELECT tokens FROM whoop_account WHERE id = 'me'`;
      if (!rows.length) return null;
      const current = decryptTokens(rows[0].tokens);
      if (!current) return null;
      if (Date.now() < current.expires_at - 60_000) return current.access_token;

      // We hold the lock and the token really is near expiry — refresh once.
      const { accessToken, refreshed } = await ensureAccessToken(current);
      if (refreshed) {
        const enc = encryptTokens(refreshed);
        await tx`
          UPDATE whoop_account
          SET tokens = ${enc}, updated_at = now()
          WHERE id = 'me'`;
      }
      return accessToken;
    });
  } catch (e) {
    // Refresh failed (expired/revoked refresh token, WHOOP outage, bad creds).
    // Surface it in the server logs; callers get null and treat it as "needs
    // reconnect" rather than crashing.
    console.error("WHOOP getValidAccessToken failed:", e);
    return null;
  }
}
