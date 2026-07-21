import crypto from "node:crypto";

// WHOOP API integration. Pure logic only — no next/headers here, so cookie
// reads/writes stay at the route-handler layer (predictable Set-Cookie) and
// swapping the token store (cookie -> DB) later is a contained change.

const API_BASE = "https://api.prod.whoop.com/developer";
const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

// `offline` is what gets us a refresh_token; the rest are read scopes.
export const WHOOP_SCOPES = [
  "offline",
  "read:recovery",
  "read:sleep",
  "read:cycles",
  "read:workout",
  "read:profile",
];

export const TOKEN_COOKIE = "whoop_token";
export const STATE_COOKIE = "whoop_oauth_state";
export const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type TokenBundle = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
};

function clientId() {
  const v = process.env.WHOOP_CLIENT_ID;
  if (!v) throw new Error("WHOOP_CLIENT_ID is not set");
  return v;
}

function clientSecret() {
  const v = process.env.WHOOP_CLIENT_SECRET;
  if (!v) throw new Error("WHOOP_CLIENT_SECRET is not set");
  return v;
}

// --- Token encryption (AES-256-GCM, key derived from AUTH_SECRET) ---

function encryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptTokens(tokens: TokenBundle): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([
    cipher.update(JSON.stringify(tokens), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptTokens(value: string): TokenBundle | null {
  try {
    const raw = Buffer.from(value, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString("utf8")) as TokenBundle;
  } catch {
    return null;
  }
}

// --- OAuth ---

export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: WHOOP_SCOPES.join(" "),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

function toBundle(json: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}): TokenBundle {
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<TokenBundle> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`WHOOP token exchange failed (${res.status})`);
  }
  return toBundle(await res.json());
}

async function refreshTokens(refreshToken: string): Promise<TokenBundle> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      scope: "offline",
    }),
  });
  if (!res.ok) {
    throw new Error(`WHOOP token refresh failed (${res.status})`);
  }
  return toBundle(await res.json());
}

/**
 * Returns a valid access token, refreshing if it's within 60s of expiry.
 * If a refresh happened, the second element is the new bundle to persist.
 */
export async function ensureAccessToken(
  tokens: TokenBundle,
): Promise<{ accessToken: string; refreshed: TokenBundle | null }> {
  if (Date.now() < tokens.expires_at - 60_000) {
    return { accessToken: tokens.access_token, refreshed: null };
  }
  const next = await refreshTokens(tokens.refresh_token);
  return { accessToken: next.access_token, refreshed: next };
}

// --- Data ---

export type WhoopSummary = {
  profile: { first_name: string; last_name: string } | null;
  recovery: { score: number; hrv_milli: number; resting_hr: number } | null;
  sleep: { performance: number | null; asleep_hours: number } | null;
  strain: { strain: number } | null;
};

async function get<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`WHOOP GET ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

type ScoredRecord<S> = { score_state: string; score?: S };
type Page<T> = { records?: T[] };

/** Fetch the latest recovery, sleep, cycle, and profile. Individual failures
 *  degrade to null rather than failing the whole panel. */
export async function fetchSummary(accessToken: string): Promise<WhoopSummary> {
  const [profileR, recoveryR, sleepR, cycleR] = await Promise.allSettled([
    get<{ first_name: string; last_name: string }>(
      "/v2/user/profile/basic",
      accessToken,
    ),
    get<Page<ScoredRecord<{
      recovery_score: number;
      hrv_rmssd_milli: number;
      resting_heart_rate: number;
    }>>>("/v2/recovery?limit=1", accessToken),
    get<Page<ScoredRecord<{
      sleep_performance_percentage: number | null;
      stage_summary: {
        total_in_bed_time_milli: number;
        total_awake_time_milli: number;
      };
    }>>>("/v2/activity/sleep?limit=1", accessToken),
    get<Page<ScoredRecord<{ strain: number }>>>(
      "/v2/cycle?limit=1",
      accessToken,
    ),
  ]);

  const first = <T,>(r: PromiseSettledResult<Page<ScoredRecord<T>>>) =>
    r.status === "fulfilled" ? r.value.records?.[0] : undefined;

  const rec = first(recoveryR);
  const slp = first(sleepR);
  const cyc = first(cycleR);

  return {
    profile: profileR.status === "fulfilled" ? profileR.value : null,
    recovery:
      rec?.score_state === "SCORED" && rec.score
        ? {
            score: rec.score.recovery_score,
            hrv_milli: rec.score.hrv_rmssd_milli,
            resting_hr: rec.score.resting_heart_rate,
          }
        : null,
    sleep:
      slp?.score_state === "SCORED" && slp.score
        ? {
            performance: slp.score.sleep_performance_percentage,
            asleep_hours:
              (slp.score.stage_summary.total_in_bed_time_milli -
                slp.score.stage_summary.total_awake_time_milli) /
              3_600_000,
          }
        : null,
    strain:
      cyc?.score_state === "SCORED" && cyc.score
        ? { strain: cyc.score.strain }
        : null,
  };
}
