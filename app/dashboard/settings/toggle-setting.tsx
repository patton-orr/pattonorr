"use client";

import { useState, useTransition } from "react";

// A labelled on/off switch backed by a server action. Optimistic: it flips
// immediately and reverts if the save fails.
export function ToggleSetting({
  label,
  description,
  initial,
  onSave,
}: {
  label: string;
  description?: string;
  initial: boolean;
  onSave: (on: boolean) => Promise<void>;
}) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await onSave(next);
      } catch {
        setOn(!next); // revert on failure
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium text-black dark:text-zinc-50">
          {label}
        </span>
        {description && (
          <span className="text-xs leading-relaxed text-zinc-500">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={toggle}
        disabled={pending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          on ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            on ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
