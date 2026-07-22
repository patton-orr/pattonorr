"use client";

import { useState, useTransition } from "react";
import { NAV_SECTIONS } from "@/lib/access-config";
import { setTopbarHiddenAction } from "./actions";

export function NavigationSettings({
  initialHidden,
}: {
  initialHidden: string[];
}) {
  const [hidden, setHidden] = useState<string[]>(initialHidden);
  const [, start] = useTransition();

  function toggle(key: string) {
    const next = hidden.includes(key)
      ? hidden.filter((k) => k !== key)
      : [...new Set([...hidden, key])];
    setHidden(next);
    start(() => {
      void setTopbarHiddenAction(next);
    });
  }

  return (
    <div className="divide-y divide-black/[.06] overflow-hidden rounded-2xl border border-black/[.08] dark:divide-white/[.08] dark:border-white/[.145]">
      {NAV_SECTIONS.map((s) => {
        const on = !hidden.includes(s.key);
        return (
          <div
            key={s.key}
            className="flex items-center justify-between gap-4 bg-white px-4 py-2.5 dark:bg-black"
          >
            <span className="text-sm font-medium text-black dark:text-zinc-50">
              {s.label}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={s.label}
              onClick={() => toggle(s.key)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
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
      })}
    </div>
  );
}
