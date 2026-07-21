"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// A discrete slider over the fixed range stops, replacing the wrapping pills.
// Stops are equal-width (the day values are non-linear), so this is index-based.
// It drives the ?range= URL param: tap/drag/keyboard update an optimistic index
// for instant feedback, and navigation commits ONCE on release/keypress (not on
// every intermediate step, since the page re-renders on the server). Works with
// mouse, touch, and keyboard; the whole 44px track is the hit area.

const STOPS = [
  { v: 7, l: "1w", full: "Last 7 days" },
  { v: 14, l: "2w", full: "Last 14 days" },
  { v: 30, l: "30d", full: "Last 30 days" },
  { v: 60, l: "60d", full: "Last 60 days" },
  { v: 90, l: "90d", full: "Last 90 days" },
  { v: 180, l: "6mo", full: "Last 6 months" },
  { v: 365, l: "1y", full: "Last year" },
];
const ALL_STOP = { v: 0, l: "All", full: "All history" };

export function RangeSlider({
  range,
  avg,
  basePath,
  showAll = false,
}: {
  range: number;
  avg?: number;
  basePath?: string;
  showAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const stops = showAll ? [...STOPS, ALL_STOP] : STOPS;
  const n = stops.length;
  const currentIdx = Math.max(
    0,
    stops.findIndex((s) => s.v === range),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  // Show the optimistic index while a navigation is in flight (its stop value
  // differs from the committed range); once the server round-trip lands, follow
  // the range prop again. Deriving this avoids clearing state in an effect.
  const idx =
    dragIdx != null && stops[dragIdx]?.v !== range ? dragIdx : currentIdx;

  const frac = (i: number) => (n <= 1 ? 0 : i / (n - 1));
  // Positions inset by the 10px thumb radius so ends aren't clipped.
  const at = (i: number) => `calc(10px + (100% - 20px) * ${frac(i)})`;

  function commit(i: number) {
    const c = Math.max(0, Math.min(n - 1, i));
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("range", String(stops[c].v));
    if (avg != null) params.set("avg", String(avg));
    router.push(`${basePath || pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  function idxFromX(clientX: number) {
    const el = trackRef.current;
    if (!el) return currentIdx;
    const r = el.getBoundingClientRect();
    const t = (clientX - r.left - 10) / Math.max(1, r.width - 20);
    return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-2 select-none">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Time range"
        aria-valuemin={0}
        aria-valuemax={n - 1}
        aria-valuenow={idx}
        aria-valuetext={stops[idx].full}
        onPointerDown={(e) => {
          dragging.current = true;
          trackRef.current?.setPointerCapture(e.pointerId);
          setDragIdx(idxFromX(e.clientX));
        }}
        onPointerMove={(e) => {
          if (dragging.current) setDragIdx(idxFromX(e.clientX));
        }}
        onPointerUp={(e) => {
          if (!dragging.current) return;
          dragging.current = false;
          commit(idxFromX(e.clientX));
        }}
        onPointerCancel={() => {
          dragging.current = false;
          setDragIdx(null);
        }}
        onKeyDown={(e) => {
          let next = idx;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = idx - 1;
          else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = idx + 1;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = n - 1;
          else return;
          e.preventDefault();
          next = Math.max(0, Math.min(n - 1, next));
          setDragIdx(next);
          commit(next);
        }}
        className="relative flex h-11 cursor-pointer touch-pan-y items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/40"
      >
        <div className="absolute right-[10px] left-[10px] h-1.5 rounded-full bg-black/[.08] dark:bg-white/[.12]" />
        <div
          className="absolute left-[10px] h-1.5 rounded-full bg-foreground"
          style={{ width: `calc((100% - 20px) * ${frac(idx)})` }}
        />
        {stops.map((s, i) => (
          <span
            key={s.v}
            className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-black/[.18] dark:bg-white/[.22]"
            style={{ left: at(i) }}
            aria-hidden
          />
        ))}
        <span
          className="absolute h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-foreground shadow-sm dark:border-black"
          style={{ left: at(idx) }}
          aria-hidden
        />
      </div>
      <div className="relative h-4 text-[11px]" aria-hidden>
        {stops.map((s, i) => (
          <span
            key={s.v}
            className={`absolute tabular-nums transition-colors ${
              i === idx
                ? "font-semibold text-black dark:text-zinc-50"
                : "text-zinc-500"
            }`}
            style={{
              left: at(i),
              transform:
                i === 0
                  ? "translateX(0)"
                  : i === n - 1
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            {s.l}
          </span>
        ))}
      </div>
    </div>
  );
}
