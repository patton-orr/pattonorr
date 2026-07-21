"use client";

import { useRef, useState } from "react";

// Hand-rolled SVG charts following the dataviz mark specs: 2px lines, rounded
// data-ends, recessive grid/axes, 2px gaps between stacked segments, crosshair
// + hover tooltips, a smoothed moving-average overlay, and (for recovery)
// WHOOP-style R/Y/G zone bands. Colors are the validated reference/status
// palette, themed via CSS variables (light / prefers-color-scheme: dark).

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

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
      .whoop-viz svg { width:100%; height:auto; display:block; }
      .whoop-viz .tip {
        position:absolute; pointer-events:none; z-index:10; transform:translate(-50%,-100%);
        background:var(--surface); color:var(--ink);
        border:1px solid rgba(128,128,128,0.25); border-radius:8px;
        padding:6px 8px; font-size:12px; line-height:1.35; white-space:nowrap;
        box-shadow:0 4px 12px rgba(0,0,0,0.12);
      }
    `}</style>
  );
}

type Zone = { min: number; max: number; colorVar: string };

function niceMax(v: number, step: number) {
  return Math.max(step, Math.ceil(v / step) * step);
}

function xAt(i: number, n: number) {
  return n <= 1 ? PAD.left + PW / 2 : PAD.left + (i / (n - 1)) * PW;
}

// Centered, null-aware moving average.
function movingAverage(values: (number | null)[], window: number) {
  const h = Math.floor(window / 2);
  return values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - h; j <= i + h; j++) {
      const v = values[j];
      if (v != null) {
        sum += v;
        count++;
      }
    }
    return count ? sum / count : null;
  });
}

// SVG path over a series, breaking on null gaps.
function linePath(values: (number | null)[], n: number, y: (v: number) => number) {
  let d = "";
  let penUp = true;
  values.forEach((v, i) => {
    if (v == null) {
      penUp = true;
      return;
    }
    d += `${penUp ? "M" : "L"}${xAt(i, n)},${y(v)} `;
    penUp = false;
  });
  return d;
}

function zoneColor(v: number, zones?: Zone[]) {
  const z = zones?.find((z) => v >= z.min && v <= z.max);
  return z ? z.colorVar : null;
}

function ChartFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <figure className="m-0 flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
      <figcaption className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-black dark:text-zinc-50">{title}</span>
        {subtitle ? <span className="text-xs text-zinc-500">{subtitle}</span> : null}
      </figcaption>
      <div className="relative">{children}</div>
      {footer}
    </figure>
  );
}

function EmptyNote() {
  return <p className="py-8 text-center text-sm text-zinc-500">No data yet.</p>;
}

function XAxisLabels({
  dates,
  xOf,
}: {
  dates: string[];
  xOf: (i: number) => number;
}) {
  const n = dates.length;
  const count = Math.min(4, n);
  if (count < 1) return null;
  const idxs =
    count === 1
      ? [0]
      : Array.from({ length: count }, (_, k) => Math.round((k * (n - 1)) / (count - 1)));
  return (
    <>
      {idxs.map((i, k) => {
        const parts = dates[i]?.split("-");
        if (!parts) return null;
        const anchor = k === 0 ? "start" : k === count - 1 ? "end" : "middle";
        return (
          <text
            key={i}
            x={xOf(i)}
            y={H - 10}
            textAnchor={anchor}
            fontSize={10}
            fill="var(--muted)"
          >
            {`${+parts[1]}/${+parts[2]}`}
          </text>
        );
      })}
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
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const values = data.map((d) => d.value);
  const present = values.filter((v): v is number => v != null);

  if (!present.length)
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyNote />
      </ChartFrame>
    );

  const lo = domain ? domain[0] : Math.min(...present);
  const hi = domain ? domain[1] : Math.max(...present);
  const span = hi - lo || 1;
  const y = (v: number) => PAD.top + (1 - (v - lo) / span) * PH;
  const n = data.length;
  const dates = data.map((d) => d.date);

  const window = Math.min(45, Math.max(5, Math.round(n / 12)));
  const maVals = average ? movingAverage(values, window) : null;

  const raw = linePath(values, n, y);
  const ma = maVals ? linePath(maVals, n, y) : "";

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

  function onMove(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = p.matrixTransform(ctm.inverse());
    const i = Math.round(((loc.x - PAD.left) / PW) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  }

  const activePt = active != null ? data[active] : null;
  const showTip = activePt != null && activePt.value != null;
  const rawWidth = average ? 1.5 : 2;
  const rawOpacity = average ? 0.55 : 1;

  return (
    <ChartFrame title={title} subtitle={subtitle}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={subtitle ? `${title}, ${subtitle}` : title}
        onMouseMove={onMove}
        onMouseLeave={() => setActive(null)}
      >
        {/* R/Y/G zone bands */}
        {zones?.map((z, k) => (
          <rect
            key={k}
            x={PAD.left}
            y={y(z.max)}
            width={PW}
            height={Math.max(0, y(z.min) - y(z.max))}
            fill={`var(${z.colorVar})`}
            opacity={0.12}
          />
        ))}
        {gridVals.map((gv, k) => (
          <g key={k}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(gv)} y2={y(gv)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(gv) + 3} textAnchor="end" fontSize={11} fill="var(--muted)">
              {Math.round(gv)}
            </text>
          </g>
        ))}
        <XAxisLabels dates={dates} xOf={(i) => xAt(i, n)} />
        <path d={raw} fill="none" stroke={`var(${colorVar})`} strokeWidth={rawWidth} strokeOpacity={rawOpacity} strokeLinejoin="round" strokeLinecap="round" />
        {isolated.map((p) => (
          <circle
            key={`iso-${p.i}`}
            cx={xAt(p.i, n)}
            cy={y(p.v)}
            r={2.5}
            fill={`var(${zoneColor(p.v, zones) ?? colorVar})`}
          />
        ))}
        {ma && (
          <path d={ma} fill="none" stroke="var(--avg)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {showTip && (
          <>
            <line x1={xAt(active!, n)} x2={xAt(active!, n)} y1={PAD.top} y2={PAD.top + PH} stroke="var(--axis)" strokeWidth={1} />
            <circle
              cx={xAt(active!, n)}
              cy={y(activePt!.value as number)}
              r={4}
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
            left: `${(xAt(active!, n) / W) * 100}%`,
            top: `${(y(activePt!.value as number) / H) * 100}%`,
          }}
        >
          <strong>
            {(activePt!.value as number).toFixed(decimals)}
            {unit}
          </strong>
          <br />
          <span style={{ color: "var(--ink2)" }}>{activePt!.date}</span>
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
}: {
  title: string;
  subtitle?: string;
  data: { date: string; deep: number; light: number; rem: number; awake: number }[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  if (!data.length)
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyNote />
      </ChartFrame>
    );

  const totals = data.map((d) => d.deep + d.light + d.rem + d.awake);
  const max = niceMax(Math.max(...totals), 2);
  const n = data.length;
  const band = PW / n;
  const bw = Math.min(band * 0.7, 28);
  const y = (v: number) => PAD.top + (1 - v / max) * PH;
  const gridVals = Array.from({ length: 5 }, (_, k) => (max * k) / 4);
  const bandCenter = (i: number) => PAD.left + band * i + band / 2;

  function onMove(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = p.matrixTransform(ctm.inverse());
    const i = Math.floor((loc.x - PAD.left) / band);
    setActive(i >= 0 && i < n ? i : null);
  }

  const a = active != null ? data[active] : null;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      footer={
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {STAGES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `var(${s.colorVar})` }} />
              {s.label}
            </span>
          ))}
        </div>
      }
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={subtitle ? `${title}, ${subtitle}` : title}
        onMouseMove={onMove}
        onMouseLeave={() => setActive(null)}
      >
        {gridVals.map((gv, k) => (
          <g key={k}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(gv)} y2={y(gv)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(gv) + 3} textAnchor="end" fontSize={11} fill="var(--muted)">
              {Number.isInteger(gv) ? gv : gv.toFixed(1)}
            </text>
          </g>
        ))}
        <XAxisLabels dates={data.map((d) => d.date)} xOf={bandCenter} />
        {data.map((row, i) => {
          const cx = bandCenter(i);
          let acc = 0;
          return (
            <g key={i} opacity={active == null || active === i ? 1 : 0.45}>
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
        <div className="tip" style={{ left: `${(bandCenter(active!) / W) * 100}%`, top: "8%" }}>
          <strong>{a.date}</strong>
          {STAGES.map((s) => (
            <div key={s.key} style={{ color: "var(--ink2)" }}>
              {s.label}: {a[s.key].toFixed(1)}h
            </div>
          ))}
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
}: {
  title: string;
  subtitle?: string;
  data: { date: string; value: number | null }[];
  colorVar: string;
  domainMax?: number;
  unit?: string;
  decimals?: number;
  average?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const vals = data.map((d) => d.value);
  const present = vals.filter((v): v is number => v != null);
  if (!present.length)
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyNote />
      </ChartFrame>
    );

  const max = domainMax ?? niceMax(Math.max(...present), 5);
  const n = data.length;
  const band = PW / n;
  const bw = Math.min(band * 0.7, 28);
  const y = (v: number) => PAD.top + (1 - v / max) * PH;
  const gridVals = Array.from({ length: 5 }, (_, k) => (max * k) / 4);
  const bandCenter = (i: number) => PAD.left + band * i + band / 2;

  const window = Math.min(45, Math.max(5, Math.round(n / 12)));
  const ma = average ? linePath(movingAverage(vals, window), n, y) : "";

  function onMove(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = p.matrixTransform(ctm.inverse());
    const i = Math.floor((loc.x - PAD.left) / band);
    setActive(i >= 0 && i < n ? i : null);
  }

  const a = active != null ? data[active] : null;

  return (
    <ChartFrame title={title} subtitle={subtitle}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={subtitle ? `${title}, ${subtitle}` : title}
        onMouseMove={onMove}
        onMouseLeave={() => setActive(null)}
      >
        {gridVals.map((gv, k) => (
          <g key={k}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(gv)} y2={y(gv)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(gv) + 3} textAnchor="end" fontSize={11} fill="var(--muted)">
              {Math.round(gv)}
            </text>
          </g>
        ))}
        <XAxisLabels dates={data.map((d) => d.date)} xOf={bandCenter} />
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
              height={Math.max(0, PAD.top + PH - yTop)}
              rx={Math.min(2, bw / 2)}
              fill={`var(${colorVar})`}
              opacity={active == null || active === i ? 1 : 0.45}
            />
          );
        })}
        {ma && <path d={ma} fill="none" stroke="var(--avg)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
      </svg>
      {a && a.value != null && (
        <div className="tip" style={{ left: `${(bandCenter(active!) / W) * 100}%`, top: `${(y(a.value) / H) * 100}%` }}>
          <strong>
            {a.value.toFixed(decimals)}
            {unit}
          </strong>
          <br />
          <span style={{ color: "var(--ink2)" }}>{a.date}</span>
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
}: {
  title: string;
  subtitle?: string;
  zones: { z0: number; z1: number; z2: number; z3: number; z4: number; z5: number };
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
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyNote />
      </ChartFrame>
    );

  return (
    <ChartFrame title={title} subtitle={subtitle}>
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
