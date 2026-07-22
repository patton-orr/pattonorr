"use client";

import { useState, useTransition } from "react";
import { saveTheme } from "./actions";
import type { ThemeId } from "@/lib/settings";

// Per-user accent picker. Each option previews its two accent moments — the
// active nav pill and the secondary-menu underline — in that theme's colors.
// Selecting one repoints the live #app-accent wrapper immediately (optimistic),
// then persists; a failed save reverts. Preview swatches use the light-mode
// values; the real nav flips to dark-mode values automatically.
type Opt = {
  id: ThemeId;
  school: string;
  variant?: string;
  pillBg: string;
  pillFg: string;
  line: string;
};

const OPTS: Opt[] = [
  { id: "standard", school: "Standard", pillBg: "rgba(0,0,0,.06)", pillFg: "#111827", line: "#111827" },
  { id: "unc-normal", school: "Tar Heels", variant: "Normal", pillBg: "rgba(75,156,211,.2)", pillFg: "#13294B", line: "#4B9CD3" },
  { id: "unc-bold", school: "Tar Heels", variant: "Bold", pillBg: "#4B9CD3", pillFg: "#13294B", line: "#13294B" },
  { id: "vandy-normal", school: "Vanderbilt", variant: "Normal", pillBg: "rgba(207,174,112,.28)", pillFg: "#1C1C1C", line: "#B49248" },
  { id: "vandy-bold", school: "Vanderbilt", variant: "Bold", pillBg: "#1C1C1C", pillFg: "#CFAE70", line: "#B49248" },
];

function setLiveAccent(id: string) {
  document.getElementById("app-accent")?.setAttribute("data-accent", id);
}

export function ThemePicker({ current }: { current: ThemeId }) {
  const [sel, setSel] = useState<ThemeId>(current);
  const [pending, startTransition] = useTransition();

  function choose(id: ThemeId) {
    if (id === sel) return;
    const prev = sel;
    setSel(id);
    setLiveAccent(id);
    startTransition(async () => {
      try {
        await saveTheme(id);
      } catch {
        setSel(prev);
        setLiveAccent(prev);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
      <span className="text-sm font-medium text-black dark:text-zinc-50">
        Color theme
      </span>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Sets the navigation accent. Normal tints subtly; Bold goes all-in on
        school colors.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OPTS.map((o) => {
          const on = sel === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(o.id)}
              aria-pressed={on}
              disabled={pending}
              style={on ? { borderColor: o.line } : undefined}
              className={`flex flex-col gap-3 rounded-xl border-2 p-3 text-left transition-colors disabled:opacity-70 ${
                on
                  ? ""
                  : "border-black/[.08] hover:border-black/20 dark:border-white/[.145] dark:hover:border-white/30"
              }`}
            >
              <span className="flex flex-col items-start gap-1.5">
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: o.pillBg, color: o.pillFg }}
                >
                  Aa
                </span>
                <span
                  className="h-[3px] w-7 rounded-full"
                  style={{ background: o.line }}
                />
              </span>
              <span className="flex flex-col">
                <span className="text-xs font-semibold text-black dark:text-zinc-50">
                  {o.school}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {o.variant ?? "Neutral"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
