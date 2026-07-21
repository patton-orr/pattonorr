"use client";

import { useEffect, useState } from "react";

type Summary = {
  profile: { first_name: string; last_name: string } | null;
  recovery: { score: number; hrv_milli: number; resting_hr: number } | null;
  sleep: { performance: number | null; asleep_hours: number } | null;
  strain: { strain: number } | null;
};

type State =
  | { status: "loading" }
  | { status: "disconnected" }
  | { status: "error" }
  | { status: "ready"; summary: Summary };

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-3xl font-semibold text-black tabular-nums dark:text-zinc-50">
        {value}
        {unit ? (
          <span className="ml-1 text-base font-normal text-zinc-500">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function WhoopPanel() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/whoop/summary")
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!active) return;
        if (!r.ok || data.error) return setState({ status: "error" });
        if (!data.connected) return setState({ status: "disconnected" });
        setState({ status: "ready", summary: data.summary });
      })
      .catch(() => active && setState({ status: "error" }));
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="text-sm text-zinc-500">Loading your WHOOP data…</p>;
  }

  if (state.status === "disconnected") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Connect your WHOOP account to see recovery, sleep, and strain here.
        </p>
        <a
          href="/api/whoop/connect"
          className="flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Connect WHOOP
        </a>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Couldn’t load WHOOP data. Try reconnecting.
        </p>
        <a
          href="/api/whoop/connect"
          className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Reconnect WHOOP
        </a>
      </div>
    );
  }

  const { recovery, sleep, strain } = state.summary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Stat
        label="Recovery"
        value={recovery ? Math.round(recovery.score).toString() : "—"}
        unit={recovery ? "%" : undefined}
      />
      <Stat
        label="Sleep"
        value={sleep ? sleep.asleep_hours.toFixed(1) : "—"}
        unit={sleep ? "hrs" : undefined}
      />
      <Stat
        label="Day strain"
        value={strain ? strain.strain.toFixed(1) : "—"}
      />
    </div>
  );
}
