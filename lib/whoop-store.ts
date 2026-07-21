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

/** Load tokens, refresh if near expiry (persisting the rotated bundle), and
 *  return a valid access token — or null if not connected / refresh failed. */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;
  try {
    const { accessToken, refreshed } = await ensureAccessToken(tokens);
    if (refreshed) await saveTokens(refreshed);
    return accessToken;
  } catch {
    return null;
  }
}
