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
// the default color — no color-picker confirm. Off by default.
export async function getFaithAutoHighlight(): Promise<boolean> {
  return getSetting<boolean>(FAITH_AUTO_HIGHLIGHT_KEY, false);
}

// --- Home preferences ---

export const HOME_SHOW_WEATHER_KEY = "home.showWeather";

// Whether the weather widget shows on the dashboard home. On by default.
export async function getHomeShowWeather(): Promise<boolean> {
  return getSetting<boolean>(HOME_SHOW_WEATHER_KEY, true);
}
