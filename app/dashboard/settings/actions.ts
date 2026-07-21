"use server";

import { revalidatePath } from "next/cache";
import { setSetting, WHOOP_SMOOTHING_KEY } from "@/lib/settings";

export async function saveWhoopSmoothing(value: number) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  await setSetting(WHOOP_SMOOTHING_KEY, v);
  // The WHOOP views are force-dynamic (re-read per request), but revalidate to
  // drop any cached RSC payloads so the change shows immediately.
  revalidatePath("/dashboard/whoop", "layout");
}
