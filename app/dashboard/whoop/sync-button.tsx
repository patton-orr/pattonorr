"use client";

import { useActionState } from "react";
import { syncNow, type SyncState } from "./actions";
import { fmtEastern } from "@/lib/format";

// Client "Sync now" that shows the result inline (success or error) instead of
// letting a failed server action crash the whole page. When the failure is an
// auth problem, it offers a one-click Reconnect.
export function SyncButton({
  lastSync,
  stack = false,
}: {
  lastSync?: string | null;
  stack?: boolean;
}) {
  const [state, formAction, pending] = useActionState<SyncState | null, FormData>(
    syncNow,
    null,
  );

  const status = state ? (
    <span
      className={`text-xs ${
        state.ok
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {state.message}
      {state.reconnect ? (
        <>
          {" "}
          <a href="/api/whoop/connect" className="font-medium underline">
            Reconnect
          </a>
        </>
      ) : null}
    </span>
  ) : lastSync ? (
    <span className="text-xs text-zinc-500">Synced {fmtEastern(lastSync)}</span>
  ) : null;

  const button = (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-black/[.1] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors pointer-coarse:py-3 hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
    >
      {pending ? "Syncing…" : "Sync now"}
    </button>
  );

  return (
    <form
      action={formAction}
      className={
        stack
          ? "flex shrink-0 flex-col items-end gap-1"
          : "flex flex-wrap items-center justify-end gap-x-3 gap-y-1"
      }
    >
      {stack ? (
        <>
          {button}
          {status}
        </>
      ) : (
        <>
          {status}
          {button}
        </>
      )}
    </form>
  );
}
