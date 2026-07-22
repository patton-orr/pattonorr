"use server";

import { revalidatePath } from "next/cache";
import {
  setSetting,
  setUserSetting,
  setUserTheme,
  type ThemeId,
  WHOOP_SMOOTHING_KEY,
  FAITH_AUTO_HIGHLIGHT_KEY,
  HOME_SHOW_WEATHER_KEY,
} from "@/lib/settings";
import { currentUserId } from "@/lib/current-user";

// WHOOP smoothing is the admin's own chart preference — global, not per-user.
export async function saveWhoopSmoothing(value: number) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  await setSetting(WHOOP_SMOOTHING_KEY, v);
  // The WHOOP views are force-dynamic (re-read per request), but revalidate to
  // drop any cached RSC payloads so the change shows immediately.
  revalidatePath("/dashboard/whoop", "layout");
}

export async function saveAutoHighlight(on: boolean) {
  await setUserSetting(
    await currentUserId(),
    FAITH_AUTO_HIGHLIGHT_KEY,
    Boolean(on),
  );
  // The reader reads this per request; revalidate so it takes effect next load.
  revalidatePath("/bible", "layout");
}

export async function saveShowWeather(on: boolean) {
  await setUserSetting(await currentUserId(), HOME_SHOW_WEATHER_KEY, Boolean(on));
  revalidatePath("/dashboard");
}

export async function saveTheme(theme: ThemeId) {
  await setUserTheme(await currentUserId(), theme);
  // The accent is applied by the dashboard layout, so refresh the whole shell.
  revalidatePath("/dashboard", "layout");
}
