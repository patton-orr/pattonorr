import { getSql } from "@/lib/db";

// Generic key/value app settings backed by Postgres, so preferences follow
// the user across iPhone / iPad / desktop rather than living per-device.

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const sql = getSql();
  try {
    const rows = await sql`SELECT value FROM app_settings WHERE key = ${key}`;
    if (!rows.length) return fallback;
    return rows[0].value as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown) {
  const sql = getSql();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${sql.json(value as never)}, now())
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()`;
}

// --- Per-user (personal) settings ---
// Personal data is namespaced by the signed-in user's id so one person never
// reads another's. Callers resolve the id via currentUserId() and pass it in;
// a null id (no session) reads the fallback and writes nothing.

const userKey = (userId: string, key: string) => `u:${userId}:${key}`;
export const userPrefix = (userId: string, keyPrefix: string) =>
  `u:${userId}:${keyPrefix}`;

export async function getUserSetting<T>(
  userId: string | null,
  key: string,
  fallback: T,
): Promise<T> {
  if (!userId) return fallback;
  return getSetting<T>(userKey(userId, key), fallback);
}

export async function setUserSetting(
  userId: string | null,
  key: string,
  value: unknown,
) {
  if (!userId) return;
  await setSetting(userKey(userId, key), value);
}

// All settings whose key starts with `prefix` (e.g. per-chapter note rows like
// `bible.notes:<ref>`). The prefix embeds the user's email (e.g.
// `u:<email>:bible.notes:`), and emails can legitimately contain `_`, which is a
// single-char LIKE wildcard — so we escape `\ % _` and match with ESCAPE. Without
// this, a user `a_b@x.com` would also match `aXb@x.com`'s rows, leaking another
// user's private notes/highlights (the isolation model treats these as private).
export async function getSettingsByPrefix<T>(
  prefix: string,
): Promise<{ key: string; value: T }[]> {
  const sql = getSql();
  const escaped = prefix.replace(/[\\%_]/g, (c) => `\\${c}`);
  try {
    const rows = await sql`
      SELECT key, value FROM app_settings
      WHERE key LIKE ${escaped + "%"} ESCAPE '\\'`;
    return rows.map((r) => ({ key: r.key as string, value: r.value as T }));
  } catch {
    return [];
  }
}

// --- WHOOP chart preferences ---

export const WHOOP_SMOOTHING_KEY = "whoop.smoothing";
export const WHOOP_SMOOTHING_DEFAULT = 40; // 0 = sharp polyline, 100 = max curve

export async function getWhoopSmoothing(): Promise<number> {
  const v = await getSetting<number>(WHOOP_SMOOTHING_KEY, WHOOP_SMOOTHING_DEFAULT);
  return Math.max(0, Math.min(100, Number(v) || 0));
}

// --- Faith / Bible reader preferences ---

export const FAITH_AUTO_HIGHLIGHT_KEY = "faith.autoHighlight";

// When on, selecting text in the reader creates a highlight immediately with
// the default color — no color-picker confirm. Off by default. Per-user.
export async function getFaithAutoHighlight(
  userId: string | null,
): Promise<boolean> {
  return getUserSetting<boolean>(userId, FAITH_AUTO_HIGHLIGHT_KEY, false);
}

// --- Color theme (per-user accent scheme) ---

export const THEME_KEY = "app.theme";
export const THEMES = [
  "standard",
  "unc-normal",
  "unc-bold",
  "vandy-normal",
  "vandy-bold",
] as const;
export type ThemeId = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemeId = "standard";
const isTheme = (v: unknown): v is ThemeId =>
  typeof v === "string" && (THEMES as readonly string[]).includes(v);

export async function getUserTheme(userId: string | null): Promise<ThemeId> {
  const t = await getUserSetting<ThemeId>(userId, THEME_KEY, DEFAULT_THEME);
  return isTheme(t) ? t : DEFAULT_THEME;
}

export async function setUserTheme(userId: string | null, theme: ThemeId) {
  await setUserSetting(userId, THEME_KEY, isTheme(theme) ? theme : DEFAULT_THEME);
}

// --- Navigation preferences ---

export const NAV_TOPBAR_HIDDEN_KEY = "nav.topbarHidden";

// Section keys hidden from the horizontal top bar (they still show in the full
// hamburger menu). Default: none hidden.
export async function getNavTopbarHidden(): Promise<string[]> {
  const v = await getSetting<string[]>(NAV_TOPBAR_HIDDEN_KEY, []);
  return Array.isArray(v) ? v.map(String) : [];
}

export async function setNavTopbarHidden(hidden: string[]) {
  await setSetting(NAV_TOPBAR_HIDDEN_KEY, [...new Set(hidden.map(String))]);
}

// Section-key order for the two navs, kept independent: the full hamburger menu
// and the horizontal top bar. Empty/missing = default (source) order. Keys not
// present are appended in default order by applyNavOrder, so adding a section
// later needs no migration.
export const NAV_MENU_ORDER_KEY = "nav.menuOrder";
export const NAV_TOPBAR_ORDER_KEY = "nav.topbarOrder";

async function getOrder(key: string): Promise<string[]> {
  const v = await getSetting<string[]>(key, []);
  return Array.isArray(v) ? [...new Set(v.map(String))] : [];
}

export const getNavMenuOrder = () => getOrder(NAV_MENU_ORDER_KEY);
export const getNavTopbarOrder = () => getOrder(NAV_TOPBAR_ORDER_KEY);

export async function setNavMenuOrder(order: string[]) {
  await setSetting(NAV_MENU_ORDER_KEY, [...new Set(order.map(String))]);
}

export async function setNavTopbarOrder(order: string[]) {
  await setSetting(NAV_TOPBAR_ORDER_KEY, [...new Set(order.map(String))]);
}

// --- Home preferences ---

export const HOME_SHOW_WEATHER_KEY = "home.showWeather";

// Whether the weather widget shows on the dashboard home. Off by default.
// Per-user.
export async function getHomeShowWeather(
  userId: string | null,
): Promise<boolean> {
  return getUserSetting<boolean>(userId, HOME_SHOW_WEATHER_KEY, false);
}
