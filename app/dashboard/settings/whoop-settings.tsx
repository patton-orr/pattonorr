"use client";

import { useState, useTransition } from "react";
import { smoothSegment } from "@/lib/spline";
import { saveWhoopSmoothing } from "./actions";

// A deliberately jagged sample so the effect of the slider is obvious.
const SAMPLE = [58, 30, 74, 41, 86, 45, 66, 34, 80, 52, 63, 38, 71];

function Preview({ value }: { value: number }) {
  const W = 320;
  const H = 88;
  const pad = 10;
  const k = value / 100;
  const max = Math.max(...SAMPLE);
  const min = Math.min(...SAMPLE);
  const pts = SAMPLE.map((v, i) => ({
    x: pad + (i / (SAMPLE.length - 1)) * (W - 2 * pad),
    y: pad + (1 - (v - min) / (max - min)) * (H - 2 * pad),
  }));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-sm text-blue-500 dark:text-blue-400"
      role="img"
      aria-label={`Preview of ${value}% smoothing`}
    >
      <path
        d={smoothSegment(pts, k)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} fill="currentColor" />
      ))}
    </svg>
  );
}

export function WhoopSmoothingSetting({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<number | null>(initial);
  const [pending, startTransition] = useTransition();

  function commit(v: number) {
    if (v === saved) return;
    startTransition(async () => {
      await saveWhoopSmoothing(v);
      setSaved(v);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-black dark:text-zinc-50">
          Line smoothing
        </span>
        <span className="text-xs text-zinc-500">
          How much the day-to-day chart lines round off. Data points stay
          exact — this only softens the corners between them.
        </span>
      </div>

      <Preview value={value} />

      <div className="flex items-center gap-4">
        <span className="w-10 shrink-0 text-xs text-zinc-500">Sharp</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          onPointerUp={() => commit(value)}
          onKeyUp={() => commit(value)}
          onBlur={() => commit(value)}
          aria-label="Line smoothing amount"
          className="h-1.5 flex-1 cursor-pointer accent-blue-500 pointer-coarse:h-2.5"
        />
        <span className="w-10 shrink-0 text-right text-xs text-zinc-500">
          Round
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
          {value}%
        </span>
        <span className="text-zinc-400">
          {pending
            ? "Saving…"
            : saved === value
              ? "Saved"
              : "Release to save"}
        </span>
      </div>
    </div>
  );
}
