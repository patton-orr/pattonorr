"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { fmtDate } from "@/lib/format";
import { smoothSegment } from "@/lib/spline";

// Hand-rolled SVG charts following the dataviz mark specs: 2px lines, rounded
// data-ends, recessive grid/axes, 2px gaps between stacked segments, crosshair
// + tooltips, a smoothed moving-average overlay, and (for recovery) WHOOP-style
// R/Y/G zone bands. Colors come from the validated reference/status palette,
// themed via CSS variables (light / prefers-color-scheme: dark).
//
// Cross-platform behavior adapts by capability, not device:
// - Pointer events drive the tooltip: mouse hovers; touch taps/scrubs, and the
//   tooltip stays put after a touch (no hover to keep it alive).
// - Geometry adapts to the rendered width via ResizeObserver: on narrow
//   containers the SVG scale factor bumps font sizes, paddings, stroke widths,
//   and shortens/reduces x-axis labels so text stays legible on phones.

const BASE_W = 720;

function useGeom() {
  const measureRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(BASE_W);
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setW(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // s = geometry scale (padding, stroke widths, dot radii). Clamped to >= 1,
  // which is right for layout but WRONG for text: on containers wider than
  // BASE_W it pins at 1 and viewBox-unit fonts balloon (10 units -> ~15px on a
  // 1000px desktop). So size text off `fontPx` instead: since 1 viewBox unit
  // renders at r = w/BASE_W CSS px, fontPx(px) = px/r renders at exactly px CSS
  // at ANY width. Axis labels stay a constant 11px (12px on phones).
  const s = Math.min(2, Math.max(1, BASE_W / Math.max(w, 1)));
  const narrow = w < 480;
  const r = Math.max(w, 1) / BASE_W;
  const fontPx = (px: number) => px / r;
  const axisPx = narrow ? 12 : 11;
  const H = s > 1.4 ? 300 : 240; // taller aspect on phones
  const pad = {
    top: 16,
    right: 16,
    bottom: Math.round(16 + 16 * s),
    left: Math.round(40 * Math.max(1, s * 0.85)),
  };
  return {
    measureRef,
    s,
    narrow,
    r,
    fontPx,
    axisPx,
    W: BASE_W,
    H,
    pad,
    pw: BASE_W - pad.left - pad.right,
    ph: H - pad.top - pad.bottom,
  };
}

type Geom = ReturnType<typeof useGeom>;

export function VizStyles() {
  return (
    <style>{`
      .whoop-viz {
        --surface:#ffffff; --ink:#0b0b0b; --ink2:#52514e; --muted:#898781;
        --grid:#e1e0d9; --axis:#c3c2b7; --avg:#52514e;
        --recovery:#008300; --hrv:#4a3aa7; --strain:#2a78d6;
        --rec-green:#0ca30c; --rec-yellow:#fab219; --rec-red:#d03b3b;
        --stage-deep:#008300; --stage-light:#2a78d6; --stage-rem:#e87ba4; --stage-awake:#eda100;
        --z0:#86b6ef; --z1:#5598e7; --z2:#2a78d6; --z3:#1c5cab; --z4:#104281; --z5:#0d366b;
      }
      @media (prefers-color-scheme: dark) {
        .whoop-viz {
          --surface:#0a0a0a; --ink:#ffffff; --ink2:#c3c2b7; --muted:#898781;
          --grid:#2c2c2a; --axis:#383835; --avg:#c3c2b7;
          --recovery:#008300; --hrv:#9085e9; --strain:#3987e5;
          --rec-green:#0ca30c; --rec-yellow:#fab219; --rec-red:#d03b3b;
          --stage-deep:#008300; --stage-light:#3987e5; --stage-rem:#d55181; --stage-awake:#c98500;
          --z0:#184f95; --z1:#256abf; --z2:#3987e5; --z3:#5598e7; --z4:#86b6ef; --z5:#b7d3f6;
        }
      }
      .whoop-viz svg { width:100%; height:auto; display:block; touch-action: pan-y; }
      .whoop-viz .tip {
        position:absolute; pointer-events:none; z-index:10; transform:translate(-50%,-100%);
        background:var(--surface); color:var(--ink);
        border:1px solid rgba(128,128,128,0.25); border-radius:8px;
        padding:6px 8px; font-size:12px; line-height:1.35;
        max-width:168px; white-space:normal;
        box-shadow:0 4px 12px rgba(0,0,0,0.12);
      }
    `}</style>
  );
}

type Zone = { min: number; max: number; colorVar: string };

function niceMax(v: number, step: number) {
  return Math.max(step, Math.ceil(v / step) * step);
}

// Trailing, null-aware rolling average over the last `window` days. Null where
// the day itself has no data, so gaps stay aligned with the raw series.
function rollingAverage(values: (number | null)[], window: number) {
  return values.map((v, i) => {
    if (v == null) return null;
    let sum = 0;
    let count = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const x = values[j];
      if (x != null) {
        sum += x;
        count++;
      }
    }
    return count ? sum / count : null;
  });
}

// SVG path over a series, breaking on null gaps, optionally smoothed.
function linePath(
  values: (number | null)[],
  xOf: (i: number) => number,
  y: (v: number) => number,
  k = 0,
) {
  let d = "";
  let run: { x: number; y: number }[] = [];
  const flush = () => {
    if (run.length >= 2) d += smoothSegment(run, k);
    run = [];
  };
  values.forEach((v, i) => {
    if (v == null) {
      flush();
      return;
    }
    run.push({ x: xOf(i), y: y(v) });
  });
  flush();
  return d;
}

function zoneColor(v: number, zones?: Zone[]) {
  const z = zones?.find((z) => v >= z.min && v <= z.max);
  return z ? z.colorVar : null;
}

// Scale corner-rounding by how many points are on screen. A spline over few,
// widely-spaced points bulges and buries the day-to-day detail, so short
// windows get little rounding; it ramps to the user's full setting by ~45+
// points. Keeps 1–2 week views granular regardless of the smoothing slider.
function effectiveSmoothing(smoothing: number, n: number) {
  if (smoothing <= 0) return 0;
  const scale = Math.max(0.15, Math.min(1, (n - 7) / 40));
  return smoothing * scale;
}

// Pointer-events helper: mouse hovers in/out; touch taps or scrubs, and the
// tooltip sticks after the finger lifts (cleared only by mouse leave).
function usePointer(
  svgRef: React.RefObject<SVGSVGElement | null>,
  toIndex: (x: number) => number | null,
  setActive: (i: number | null) => void,
) {
  function locate(e: React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = p.matrixTransform(ctm.inverse());
    setActive(toIndex(loc.x));
  }
  return {
    onPointerDown: locate,
    onPointerMove: locate,
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setActive(null);
    },
  };
}

function ChartFrame({
  title,
  subtitle,
  children,
  footer,
  href,
  measureRef,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  href?: string;
  measureRef?: React.Ref<HTMLDivElement>;
}) {
  const figure = (
    <figure
      className={`m-0 flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-4 transition-colors dark:border-white/[.145] dark:bg-black ${
        href
          ? "group-hover:border-black/[.2] dark:group-hover:border-white/[.3]"
          : ""
      }`}
    >
      <figcaption className="flex items-start justify-between gap-2">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-black dark:text-zinc-50">{title}</span>
          {subtitle ? <span className="text-xs text-zinc-500">{subtitle}</span> : null}
        </span>
        {href ? (
          <span
            aria-hidden
            className="text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400"
          >
            ›
          </span>
        ) : null}
      </figcaption>
      <div className="relative" ref={measureRef}>
        {children}
      </div>
      {footer}
    </figure>
  );
  if (!href) return figure;
  return (
    <Link href={href} className="group block" aria-label={`${title} details`}>
      {figure}
    </Link>
  );
}

function EmptyNote() {
  return <p className="py-8 text-center text-sm text-zinc-500">No data yet.</p>;
}

function XAxisLabels({
  dates,
  xOf,
  g,
}: {
  dates: string[];
  xOf: (i: number) => number;
  g: Geom;
}) {
  const n = dates.length;
  const count = Math.min(g.narrow ? 3 : 4, n);
  if (count < 1) return null;
  const idxs =
    count === 1
      ? [0]
      : Array.from({ length: count }, (_, k) => Math.round((k * (n - 1)) / (count - 1)));
  return (
    <>
      {idxs.map((i, k) => {
        const full = fmtDate(dates[i]);
        if (!full) return null;
        const label = g.narrow ? full.slice(0, 5) : full; // MM-DD when narrow
        const anchor = k === 0 ? "start" : k === count - 1 ? "end" : "middle";
        return (
          <text
            key={i}
            x={xOf(i)}
            y={g.H - g.fontPx(6)}
            textAnchor={anchor}
            fontSize={g.fontPx(g.axisPx)}
            fill="var(--muted)"
          >
            {label}
          </text>
        );
      })}
    </>
  );
}

function YGrid({
  values,
  y,
  g,
  format,
}: {
  values: number[];
  y: (v: number) => number;
  g: Geom;
  format?: (v: number) => string;
}) {
  return (
    <>
      {values.map((gv, k) => (
        <g key={k}>
          <line
            x1={g.pad.left}
            x2={g.W - g.pad.right}
            y1={y(gv)}
            y2={y(gv)}
            stroke="var(--grid)"
            strokeWidth={1}
          />
          <text
            x={g.pad.left - g.fontPx(6)}
            y={y(gv) + g.fontPx(4)}
            textAnchor="end"
            fontSize={g.fontPx(g.axisPx)}
            fill="var(--muted)"
          >
            {format ? format(gv) : Math.round(gv)}
          </text>
        </g>
      ))}
    </>
  );
}

// --- Line chart (single series, optional zones + moving average) ---

export function LineChart({
  title,
  subtitle,
  data,
  colorVar,
  unit = "",
  domain,
  decimals = 0,
  zones,
  average = true,
  avgWindow = 5,
  smoothing = 0,
  href,
}: {
  title: string;
  subtitle?: string;
  data: { date: string; value: number | null }[];
  colorVar: string;
  unit?: string;
  domain?: [number, number];
  decimals?: number;
  zones?: Zone[];
  average?: boolean;
  avgWindow?: number;
  smoothing?: number; // 0-1 corner rounding for the day-to-day line
  href?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const clipId = useId();
  const g = useGeom();
  const values = data.map((d) => d.value);
  const present = values.filter((v): v is number => v != null);
  const n = data.length;

  const xAt = (i: number) =>
    n <= 1 ? g.pad.left + g.pw / 2 : g.pad.left + (i / (n - 1)) * g.pw;
  const pointer = usePointer(
    svgRef,
    (x) => Math.max(0, Math.min(n - 1, Math.round(((x - g.pad.left) / g.pw) * (n - 1)))),
    setActive,
  );

  if (!present.length)
    return (
      <ChartFrame title={title} subtitle={subtitle} href={href}>
        <EmptyNote />
      </ChartFrame>
    );

  const lo = domain ? domain[0] : Math.min(...present);
  const hi = domain ? domain[1] : Math.max(...present);
  const span = hi - lo || 1;
  const y = (v: number) => g.pad.top + (1 - (v - lo) / span) * g.ph;
  const dates = data.map((d) => d.date);

  const maVals = average ? rollingAverage(values, avgWindow) : null;

  const k = effectiveSmoothing(smoothing, n);
  const raw = linePath(values, xAt, y, k);
  const ma = maVals ? linePath(maVals, xAt, y, k) : "";

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, k) => lo + (span * k) / ticks);

  // Isolated points (length-1 or between null gaps) need an explicit dot.
  const isolated = data
    .map((pt, i) => {
      if (pt.value == null) return null;
      const prev = i > 0 ? data[i - 1].value : null;
      const next = i < n - 1 ? data[i + 1].value : null;
      return prev == null && next == null ? { i, v: pt.value } : null;
    })
    .filter((x): x is { i: number; v: number } => x != null);

  const activePt = active != null ? data[active] : null;
  const showTip = activePt != null && activePt.value != null;
  // Keep the tooltip inside the chart: clamp its x, and flip it below the point
  // when the point sits near the top (otherwise it clips off the top edge).
  const tipTop = showTip ? (y(activePt!.value as number) / g.H) * 100 : 0;
  const tipLeft = showTip
    ? Math.min(92, Math.max(8, (xAt(active!) / g.W) * 100))
    : 0;
  const tipBelow = tipTop < 22;
  const scaleW = Math.min(g.s, 1.4);
  // The dark rolling average is the headline. When it's drawn, the raw
  // day-to-day line recedes behind it — thinner, half-opacity, and dashed — so
  // the noisy daily detail reads as texture. When there's no average (few
  // points), the raw line stays the solid, confident headline.
  const overlay = average && ma !== "";
  const avgWidth = 2.5 * scaleW;
  const rawWidth = overlay ? 1.25 * scaleW : 2 * scaleW;
  const rawOpacity = overlay ? 0.5 : 1;
  const rawDash = overlay ? `${4 * scaleW} ${3 * scaleW}` : undefined;
  const rawCap = overlay ? "butt" : "round";

  return (
    <ChartFrame title={title} subtitle={subtitle} href={href} measureRef={g.measureRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${g.W} ${g.H}`}
        role="img"
        aria-label={subtitle ? `${title}, ${subtitle}` : title}
        {...pointer}
      >
        {zones?.map((z, k) => (
          <rect
            key={k}
            x={g.pad.left}
            y={y(z.max)}
            width={g.pw}
            height={Math.max(0, y(z.min) - y(z.max))}
            fill={`var(${z.colorVar})`}
            opacity={0.12}
          />
        ))}
        <YGrid values={gridVals} y={y} g={g} />
        <XAxisLabels dates={dates} xOf={xAt} g={g} />
        {/* Splines can slightly overshoot at sharp reversals; clip to the plot. */}
        <defs>
          <clipPath id={clipId}>
            <rect x={g.pad.left} y={g.pad.top} width={g.pw} height={g.ph} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path d={raw} fill="none" stroke={`var(${colorVar})`} strokeWidth={rawWidth} strokeOpacity={rawOpacity} strokeDasharray={rawDash} strokeLinejoin="round" strokeLinecap={rawCap} />
          {isolated.map((p) => (
            <circle
              key={`iso-${p.i}`}
              cx={xAt(p.i)}
              cy={y(p.v)}
              r={2.5 * g.s}
              fill={`var(${zoneColor(p.v, zones) ?? colorVar})`}
            />
          ))}
          {ma && (
            <path d={ma} fill="none" stroke="var(--avg)" strokeWidth={avgWidth} strokeLinejoin="round" strokeLinecap="round" />
          )}
        </g>
        {showTip && (
          <>
            <line x1={xAt(active!)} x2={xAt(active!)} y1={g.pad.top} y2={g.pad.top + g.ph} stroke="var(--axis)" strokeWidth={1} />
            <circle
              cx={xAt(active!)}
              cy={y(activePt!.value as number)}
              r={4 * g.s}
              fill={`var(${zoneColor(activePt!.value as number, zones) ?? colorVar})`}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
      {showTip && (
        <div
          className="tip"
          style={{
            left: `${tipLeft}%`,
            top: `${tipTop}%`,
            transform: tipBelow ? "translate(-50%, 8px)" : undefined,
          }}
        >
          <strong>
            {(activePt!.value as number).toFixed(decimals)}
            {unit}
          </strong>
          <br />
          <span style={{ color: "var(--ink2)" }}>{fmtDate(activePt!.date)}</span>
        </div>
      )}
    </ChartFrame>
  );
}

// --- Stacked bar chart (sleep stages) ---

const STAGES = [
  { key: "deep", label: "Deep", colorVar: "--stage-deep" },
  { key: "light", label: "Light", colorVar: "--stage-light" },
  { key: "rem", label: "REM", colorVar: "--stage-rem" },
  { key: "awake", label: "Awake", colorVar: "--stage-awake" },
] as const;

export function SleepStagesChart({
  title,
  subtitle,
  data,
  href,
}: {
  title: string;
  subtitle?: string;
  data: {
    date: string;
    deep: number;
    light: number;
    rem: number;
    awake: number;
    missing?: boolean;
  }[];
  href?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const g = useGeom();
  const n = data.length;
  const band = g.pw / Math.max(n, 1);
  const bandCenter = (i: number) => g.pad.left + band * i + band / 2;
  const pointer = usePointer(
    svgRef,
    (x) => {
      const i = Math.floor((x - g.pad.left) / band);
      return i >= 0 && i < n ? i : null;
    },
    setActive,
  );

  if (!data.length)
    return (
      <ChartFrame title={title} subtitle={subtitle} href={href}>
        <EmptyNote />
      </ChartFrame>
    );

  const totals = data.map((d) => d.deep + d.light + d.rem + d.awake);
  const max = niceMax(Math.max(...totals, 1), 2);
  const bw = Math.min(band * 0.7, 28);
  const y = (v: number) => g.pad.top + (1 - v / max) * g.ph;
  const gridVals = Array.from({ length: 5 }, (_, k) => (max * k) / 4);
  const a = active != null ? data[active] : null;
  const anyMissing = data.some((d) => d.missing);

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      href={href}
      measureRef={g.measureRef}
      footer={
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {STAGES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `var(${s.colorVar})` }} />
              {s.label}
            </span>
          ))}
          {anyMissing ? (
            <span className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--rec-red)", opacity: 0.5 }} />
              No sleep
            </span>
          ) : null}
        </div>
      }
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${g.W} ${g.H}`}
        role="img"
        aria-label={subtitle ? `${title}, ${subtitle}` : title}
        {...pointer}
      >
        <YGrid
          values={gridVals}
          y={y}
          g={g}
          format={(gv) => (Number.isInteger(gv) ? String(gv) : gv.toFixed(1))}
        />
        <XAxisLabels dates={data.map((d) => d.date)} xOf={bandCenter} g={g} />
        {data.map((row, i) => {
          const cx = bandCenter(i);
          const dim = active == null || active === i ? 1 : 0.45;
          if (row.missing) {
            // No sleep recorded: a full-height red bar.
            return (
              <rect
                key={i}
                x={cx - bw / 2}
                y={g.pad.top}
                width={bw}
                height={g.ph}
                rx={2}
                fill="var(--rec-red)"
                opacity={0.45 * dim}
              />
            );
          }
          let acc = 0;
          return (
            <g key={i} opacity={dim}>
              {STAGES.map((s) => {
                const v = row[s.key];
                const yTop = y(acc + v);
                const h = Math.max(0, y(acc) - y(acc + v) - 2);
                acc += v;
                if (v <= 0) return null;
                return <rect key={s.key} x={cx - bw / 2} y={yTop} width={bw} height={h} rx={2} fill={`var(${s.colorVar})`} />;
              })}
            </g>
          );
        })}
      </svg>
      {a && (
        <div
          className="tip"
          style={{
            left: `${Math.min(92, Math.max(8, (bandCenter(active!) / g.W) * 100))}%`,
            top: "8%",
            transform: "translate(-50%, 0)",
          }}
        >
          <strong>{fmtDate(a.date)}</strong>
          {a.missing ? (
            <div style={{ color: "var(--ink2)" }}>No sleep recorded</div>
          ) : (
            STAGES.map((s) => (
              <div key={s.key} style={{ color: "var(--ink2)" }}>
                {s.label}: {a[s.key].toFixed(1)}h
              </div>
            ))
          )}
        </div>
      )}
    </ChartFrame>
  );
}

// --- Bar chart (single series, e.g. strain) with optional moving average ---

export function BarChart({
  title,
  subtitle,
  data,
  colorVar,
  domainMax,
  unit = "",
  decimals = 1,
  average = true,
  avgWindow = 5,
  smoothing = 0,
  href,
}: {
  title: string;
  subtitle?: string;
  data: { date: string; value: number | null }[];
  colorVar: string;
  domainMax?: number;
  unit?: string;
  decimals?: number;
  average?: boolean;
  avgWindow?: number;
  smoothing?: number;
  href?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const g = useGeom();
  const n = data.length;
  const band = g.pw / Math.max(n, 1);
  const bandCenter = (i: number) => g.pad.left + band * i + band / 2;
  const pointer = usePointer(
    svgRef,
    (x) => {
      const i = Math.floor((x - g.pad.left) / band);
      return i >= 0 && i < n ? i : null;
    },
    setActive,
  );

  const vals = data.map((d) => d.value);
  const present = vals.filter((v): v is number => v != null);
  if (!present.length)
    return (
      <ChartFrame title={title} subtitle={subtitle} href={href}>
        <EmptyNote />
      </ChartFrame>
    );

  const max = domainMax ?? niceMax(Math.max(...present), 5);
  const bw = Math.min(band * 0.7, 28);
  const y = (v: number) => g.pad.top + (1 - v / max) * g.ph;
  const gridVals = Array.from({ length: 5 }, (_, k) => (max * k) / 4);

  const ma = average
    ? linePath(rollingAverage(vals, avgWindow), bandCenter, y, effectiveSmoothing(smoothing, n))
    : "";
  const a = active != null ? data[active] : null;

  return (
    <ChartFrame title={title} subtitle={subtitle} href={href} measureRef={g.measureRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${g.W} ${g.H}`}
        role="img"
        aria-label={subtitle ? `${title}, ${subtitle}` : title}
        {...pointer}
      >
        <YGrid values={gridVals} y={y} g={g} />
        <XAxisLabels dates={data.map((d) => d.date)} xOf={bandCenter} g={g} />
        {data.map((row, i) => {
          if (row.value == null) return null;
          const cx = bandCenter(i);
          const yTop = y(row.value);
          return (
            <rect
              key={i}
              x={cx - bw / 2}
              y={yTop}
              width={bw}
              height={Math.max(0, g.pad.top + g.ph - yTop)}
              rx={Math.min(2, bw / 2)}
              fill={`var(${colorVar})`}
              opacity={active == null || active === i ? 1 : 0.45}
            />
          );
        })}
        {ma && <path d={ma} fill="none" stroke="var(--avg)" strokeWidth={2.5 * Math.min(g.s, 1.4)} strokeLinejoin="round" strokeLinecap="round" />}
      </svg>
      {a && a.value != null && (
        <div
          className="tip"
          style={{
            left: `${Math.min(92, Math.max(8, (bandCenter(active!) / g.W) * 100))}%`,
            top: `${(y(a.value) / g.H) * 100}%`,
            transform: (y(a.value) / g.H) * 100 < 22 ? "translate(-50%, 8px)" : undefined,
          }}
        >
          <strong>
            {a.value.toFixed(decimals)}
            {unit}
          </strong>
          <br />
          <span style={{ color: "var(--ink2)" }}>{fmtDate(a.date)}</span>
        </div>
      )}
    </ChartFrame>
  );
}

// --- Horizontal zone bars (sequential, direct labels) ---

export function ZoneBars({
  title,
  subtitle,
  zones,
  href,
}: {
  title: string;
  subtitle?: string;
  zones: { z0: number; z1: number; z2: number; z3: number; z4: number; z5: number };
  href?: string;
}) {
  const items = [
    { label: "Zone 0", min: zones.z0, colorVar: "--z0" },
    { label: "Zone 1", min: zones.z1, colorVar: "--z1" },
    { label: "Zone 2", min: zones.z2, colorVar: "--z2" },
    { label: "Zone 3", min: zones.z3, colorVar: "--z3" },
    { label: "Zone 4", min: zones.z4, colorVar: "--z4" },
    { label: "Zone 5", min: zones.z5, colorVar: "--z5" },
  ];
  const max = Math.max(1, ...items.map((i) => i.min));
  const total = items.reduce((s, i) => s + i.min, 0);

  if (total <= 0)
    return (
      <ChartFrame title={title} subtitle={subtitle} href={href}>
        <EmptyNote />
      </ChartFrame>
    );

  return (
    <ChartFrame title={title} subtitle={subtitle} href={href}>
      <div className="flex flex-col gap-2 py-1">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-zinc-500 tabular-nums">{it.label}</span>
            <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-black/[.04] dark:bg-white/[.06]">
              <div className="h-full rounded-sm" style={{ width: `${(it.min / max) * 100}%`, background: `var(${it.colorVar})` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-zinc-600 tabular-nums dark:text-zinc-400">
              {(() => {
                const t = Math.round(it.min); // round first so 59.7 -> 60 carries to 1h
                return t >= 60 ? `${Math.floor(t / 60)}h ${t % 60}m` : `${t}m`;
              })()}
            </span>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}
