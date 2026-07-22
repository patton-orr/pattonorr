"use server";

import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/whoop-sync";

// Result of a manual "Sync now". Returned (never thrown) so a failure surfaces
// inline instead of crashing the page as an unhandled server-action error.
export type SyncState = {
  ok: boolean;
  message: string;
  reconnect?: boolean; // true when the fix is to re-authorize WHOOP
};

// Manual "Sync now" from the dashboard. Runs under the signed-in user's
// session (gated by the proxy), so no CRON_SECRET needed here. Takes no args;
// useActionState calls it with (prevState, formData), both of which are ignored.
export async function syncNow(): Promise<SyncState> {
  try {
    const r = await runSync();
    revalidatePath("/dashboard/whoop");
    revalidatePath("/dashboard/whoop-revised");
    const n = r.cycles + r.recoveries + r.sleeps + r.workouts;
    return {
      ok: true,
      message: n
        ? `Synced — ${n} record${n === 1 ? "" : "s"} updated.`
        : "Synced — already up to date.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return {
      ok: false,
      message,
      reconnect: /reconnect|not connected|expired|authoriz/i.test(message),
    };
  }
}
