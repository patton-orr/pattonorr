"use client";

import { useRef, useState } from "react";

// Hand-rolled SVG charts following the dataviz mark specs: 2px lines, rounded
// data-ends, recessive grid/axes, 2px gaps between stacked segments, crosshair
// + hover tooltips. Colors come from the validated reference palette, themed
// via CSS variables (light / prefers-color-scheme: dark).

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

export function VizStyles() {
  return (
    <style>{`
      .whoop-viz {
        --surface:#ffffff; --ink:#0b0b0b; --ink2:#52514e; --muted:#898781;
        --grid:#e1e0d9; --axis:#c3c2b7;
        --recovery:#008300; --hrv:#4a3aa7; --strain:#2a78d6;
        --stage-deep:#008300; --stage-light:#2a78d6; --stage-rem:#e87ba4; --stage-awake:#eda100;
        --z0:#86b6ef; --z1:#5598e7; --z2:#2a78d6; --z3:#1c5cab; --z4:#104281; --z5:#0d366b;
      }
      @media (prefers-color-scheme: dark) {
        .whoop-viz {
          --surface:#0a0a0a; --ink:#ffffff; --ink2:#c3c2b7; --muted:#898781;
          --grid:#2c2c2a; --axis:#383835;
          --recovery:#008300; --hrv:#9085e9; --strain:#3987e5;
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

function niceMax(v: number, step: number) {
  return Math.max(step, Math.ceil(v / step) * step);
}

function ChartFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="m-0 flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
      <figcaption className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-black dark:text-zinc-50">
          {title}
        </span>
        {subtitle ? (
          <span className="text-xs text-zinc-500">{subtitle}</span>
        ) : null}
      </figcaption>
      <div className="relative">{children}</div>
    </figure>
  );
}

function xAt(i: number, n: number) {
  return n <= 1 ? PAD.left + PW / 2 : PAD.left + (i / (n - 1)) * PW;
}

function EmptyNote() {
  return <p className="py-8 text-center text-sm text-zinc-500">No data yet.</p>;
}

// --- Line chart (single series) ---

export function LineChart({
  title,
  subtitle,
  data,
  colorVar,
  unit = "",
  domain,
  decimals = 0,
}: {
  title: string;
  subtitle?: string;
  data: { date: string; value: number | null }[];
  colorVar: string;
  unit?: string;
  domain?: [number, number];
  decimals?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const pts = data.filter((d) => d.value != null) as {
    date: string;
    value: number;
  }[];

  if (!pts.length)
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyNote />
      </ChartFrame>
    );

  const values = pts.map((p) => p.value);
  const lo = domain ? domain[0] : Math.min(...values);
  const hi = domain ? domain[1] : Math.max(...values);
  const span = hi - lo || 1;
  const y = (v: number) => PAD.top + (1 - (v - lo) / span) * PH;
  const n = data.length;

  // Build path, breaking the line on null gaps.
  let d = "";
  let penUp = true;
  data.forEach((pt, i) => {
    if (pt.value == null) {
      penUp = true;
      return;
    }
    d += `${penUp ? "M" : "L"}${xAt(i, n)},${y(pt.value)} `;
    penUp = false;
  });

  // Isolated points (a length-1 series, or a value between null gaps) get an
  // explicit dot: a lone SVG moveto is not stroked, so the line alone would
  // render nothing for them.
  const isolated = data
    .map((pt, i) => {
      if (pt.value == null) return null;
      const prev = i > 0 ? data[i - 1].value : null;
      const next = i < n - 1 ? data[i + 1].value : null;
      return prev == null && next == null ? { i, v: pt.value } : null;
    })
    .filter((x): x is { i: number; v: number } => x != null);

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, k) => lo + (span * k) / ticks);

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
  const showTip = activePt && activePt.value != null;

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
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(gv)}
              y2={y(gv)}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(gv) + 3}
              textAnchor="end"
              fontSize={11}
              fill="var(--muted)"
            >
              {Math.round(gv)}
            </text>
          </g>
        ))}
        <path d={d} fill="none" stroke={`var(${colorVar})`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {isolated.map((p) => (
          <circle key={`iso-${p.i}`} cx={xAt(p.i, n)} cy={y(p.v)} r={2.5} fill={`var(${colorVar})`} />
        ))}
        {showTip && (
          <>
            <line
              x1={xAt(active!, n)}
              x2={xAt(active!, n)}
              y1={PAD.top}
              y2={PAD.top + PH}
              stroke="var(--axis)"
              strokeWidth={1}
            />
            <circle
              cx={xAt(active!, n)}
              cy={y(activePt!.value as number)}
              r={4}
              fill={`var(${colorVar})`}
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
              {Number.isInteger(gv) ? gv : gv.toFixed(1)}
            </text>
          </g>
        ))}
        {data.map((row, i) => {
          const cx = PAD.left + band * i + band / 2;
          let acc = 0;
          return (
            <g key={i} opacity={active == null || active === i ? 1 : 0.45}>
              {STAGES.map((s) => {
                const v = row[s.key];
                const yTop = y(acc + v);
                const h = Math.max(0, y(acc) - y(acc + v) - 2); // 2px surface gap
                acc += v;
                if (v <= 0) return null;
                return (
                  <rect
                    key={s.key}
                    x={cx - bw / 2}
                    y={yTop}
                    width={bw}
                    height={h}
                    rx={2}
                    fill={`var(${s.colorVar})`}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {STAGES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `var(${s.colorVar})` }} />
            {s.label}
          </span>
        ))}
      </div>
      {a && (
        <div
          className="tip"
          style={{ left: `${((PAD.left + band * active! + band / 2) / W) * 100}%`, top: "8%" }}
        >
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

// --- Bar chart (single series, e.g. strain) ---

export function BarChart({
  title,
  subtitle,
  data,
  colorVar,
  domainMax,
  unit = "",
  decimals = 1,
}: {
  title: string;
  subtitle?: string;
  data: { date: string; value: number | null }[];
  colorVar: string;
  domainMax?: number;
  unit?: string;
  decimals?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const vals = data.map((d) => d.value).filter((v): v is number => v != null);
  if (!vals.length)
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyNote />
      </ChartFrame>
    );

  const max = domainMax ?? niceMax(Math.max(...vals), 5);
  const n = data.length;
  const band = PW / n;
  const bw = Math.min(band * 0.7, 28);
  const y = (v: number) => PAD.top + (1 - v / max) * PH;
  const gridVals = Array.from({ length: 5 }, (_, k) => (max * k) / 4);

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
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={subtitle ? `${title}, ${subtitle}` : title} onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
        {gridVals.map((gv, k) => (
          <g key={k}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(gv)} y2={y(gv)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(gv) + 3} textAnchor="end" fontSize={11} fill="var(--muted)">
              {Math.round(gv)}
            </text>
          </g>
        ))}
        {data.map((row, i) => {
          if (row.value == null) return null;
          const cx = PAD.left + band * i + band / 2;
          const yTop = y(row.value);
          return (
            <rect
              key={i}
              x={cx - bw / 2}
              y={yTop}
              width={bw}
              height={Math.max(0, PAD.top + PH - yTop)}
              rx={2}
              fill={`var(${colorVar})`}
              opacity={active == null || active === i ? 1 : 0.45}
            />
          );
        })}
      </svg>
      {a && a.value != null && (
        <div
          className="tip"
          style={{ left: `${((PAD.left + band * active! + band / 2) / W) * 100}%`, top: `${(y(a.value) / H) * 100}%` }}
        >
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
              <div
                className="h-full rounded-sm"
                style={{ width: `${(it.min / max) * 100}%`, background: `var(${it.colorVar})` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-zinc-600 tabular-nums dark:text-zinc-400">
              {it.min >= 60 ? `${Math.floor(it.min / 60)}h ${Math.round(it.min % 60)}m` : `${Math.round(it.min)}m`}
            </span>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}
