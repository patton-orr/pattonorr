"use server";

import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/whoop-sync";

// Manual "Sync now" from the dashboard. Runs under the signed-in user's
// session (gated by the proxy), so no CRON_SECRET needed here.
export async function syncNow() {
  await runSync();
  revalidatePath("/dashboard/whoop");
}
