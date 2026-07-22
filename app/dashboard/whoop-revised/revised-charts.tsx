"use client";

// Dark, WHOOP-app-inspired visuals: overview rings, a strain-vs-recovery chart,
// and a recovery-trend bar chart. The cards themselves are a deep gray
// regardless of the page theme. Colors follow WHOOP's recovery zones
// (green/yellow/red), strain (blue), and sleep (light blue).

const C = {
  card: "#1b1f24",
  inner: "#14171b",
  track: "#2b3138",
  grid: "rgba(255,255,255,0.07)",
  text: "#f4f6f8",
  muted: "#8b939d",
  green: "#66d34a",
  yellow: "#ffd23f",
  red: "#ff4b55",
  strain: "#39a0ff",
  sleep: "#93b4e6",
};

export type Day = {
  dow: string;
  dom: string;
  recovery: number | null;
  strain: number | null;
};

export function recoveryColor(v: number): string {
  if (v >= 67) return C.green;
  if (v >= 34) return C.yellow;
  return C.red;
}

function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl p-4${className ? ` ${className}` : ""}`}
      style={{ background: C.card, border: `1px solid ${C.grid}` }}
    >
      {title && (
        <h2
          className="text-xs font-bold tracking-[0.14em] uppercase"
          style={{ color: C.text }}
        >
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function Ring({
  frac,
  color,
  big,
  unit,
  label,
}: {
  frac: number;
  color: string;
  big: string;
  unit?: string;
  label: string;
}) {
  const size = 120;
  const sw = 11;
  const r = (size - sw) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-16 w-16 lg:h-28 lg:w-28">
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={C.track} strokeWidth={sw} />
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${c * f} ${c * (1 - f)}`}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-extrabold lg:text-3xl" style={{ color: C.text }}>
            {big}
            {unit && (
              <span className="text-xs font-bold lg:text-base" style={{ color: C.text }}>
                {unit}
              </span>
            )}
          </span>
        </div>
      </div>
      <span
        className="text-[10px] font-bold tracking-widest uppercase"
        style={{ color: C.muted }}
      >
        {label}
      </span>
    </div>
  );
}

export function OverviewRings({
  sleep,
  recovery,
  strain,
}: {
  sleep: number | null;
  recovery: number | null;
  strain: number | null;
}) {
  return (
    <Card title="Overview" className="lg:h-full">
      <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-1 lg:flex-col lg:items-center lg:justify-around lg:gap-2">
        <Ring
          frac={(sleep ?? 0) / 100}
          color={C.sleep}
          big={sleep == null ? "—" : String(Math.round(sleep))}
          unit={sleep == null ? undefined : "%"}
          label="Sleep"
        />
        <Ring
          frac={(recovery ?? 0) / 100}
          color={recovery == null ? C.track : recoveryColor(recovery)}
          big={recovery == null ? "—" : String(Math.round(recovery))}
          unit={recovery == null ? undefined : "%"}
          label="Recovery"
        />
        <Ring
          frac={(strain ?? 0) / 21}
          color={C.strain}
          big={strain == null ? "—" : strain.toFixed(1)}
          label="Strain"
        />
      </div>
    </Card>
  );
}

// --- Strain vs Recovery (dual axis line) ---

export function StrainRecoveryChart({ week }: { week: Day[] }) {
  const W = 720;
  const H = 340;
  const pad = { top: 46, right: 52, bottom: 40, left: 46 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;
  const n = week.length;
  const x = (i: number) =>
    n <= 1 ? pad.left + pw / 2 : pad.left + (i / (n - 1)) * pw;
  const yStrain = (v: number) => pad.top + (1 - v / 21) * ph;
  const yRec = (v: number) => pad.top + (1 - v / 100) * ph;

  const strainPts = week
    .map((d, i) => (d.strain == null ? null : { i, v: d.strain }))
    .filter(Boolean) as { i: number; v: number }[];
  const recPts = week
    .map((d, i) => (d.recovery == null ? null : { i, v: d.recovery }))
    .filter(Boolean) as { i: number; v: number }[];
  const path = (pts: { i: number; v: number }[], y: (v: number) => number) =>
    pts.map((p, k) => `${k ? "L" : "M"}${x(p.i)} ${y(p.v)}`).join(" ");

  return (
    <Card title="Strain & Recovery">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {/* horizontal gridlines */}
        {[0, 7, 14, 21].map((gv) => (
          <g key={gv}>
            <line x1={pad.left} x2={W - pad.right} y1={yStrain(gv)} y2={yStrain(gv)} stroke={C.grid} strokeWidth={1} />
            <text x={pad.left - 10} y={yStrain(gv) + 4} textAnchor="end" fontSize={13} fontWeight={700} fill={C.strain}>
              {gv}
            </text>
          </g>
        ))}
        {/* right axis (recovery %) */}
        {[0, 33, 66, 100].map((gv) => (
          <text
            key={gv}
            x={W - pad.right + 10}
            y={yRec(gv) + 4}
            textAnchor="start"
            fontSize={13}
            fontWeight={700}
            fill={gv >= 67 ? C.green : gv >= 34 ? C.yellow : C.red}
          >
            {gv}%
          </text>
        ))}
        {/* recovery: gray connector + colored dots + labels */}
        <path d={path(recPts, yRec)} fill="none" stroke="#5b636d" strokeWidth={2} strokeLinejoin="round" />
        {recPts.map((p) => (
          <g key={`r${p.i}`}>
            <circle cx={x(p.i)} cy={yRec(p.v)} r={7} fill={C.card} stroke={recoveryColor(p.v)} strokeWidth={3.5} />
            <text x={x(p.i)} y={yRec(p.v) - 14} textAnchor="middle" fontSize={15} fontWeight={800} fill={recoveryColor(p.v)}>
              {Math.round(p.v)}%
            </text>
          </g>
        ))}
        {/* strain: blue line + dots + labels */}
        <path d={path(strainPts, yStrain)} fill="none" stroke={C.strain} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {strainPts.map((p) => (
          <g key={`s${p.i}`}>
            <circle cx={x(p.i)} cy={yStrain(p.v)} r={7} fill={C.card} stroke={C.strain} strokeWidth={3.5} />
            <text x={x(p.i)} y={yStrain(p.v) - 14} textAnchor="middle" fontSize={15} fontWeight={800} fill={C.strain}>
              {p.v.toFixed(1)}
            </text>
          </g>
        ))}
        {/* x labels */}
        {week.map((d, i) => (
          <text key={i} x={x(i)} y={H - 14} textAnchor="middle" fontSize={13} fontWeight={600} fill={C.muted}>
            <tspan x={x(i)}>{d.dow}</tspan>
            <tspan x={x(i)} dy={16} fill={C.text} fontWeight={700}>{d.dom}</tspan>
          </text>
        ))}
      </svg>
    </Card>
  );
}

// --- Recovery trend bars ---

export function RecoveryTrend({ week }: { week: Day[] }) {
  return (
    <Card title="Recovery Trend">
      <div className="flex items-end justify-between gap-2" style={{ height: 188 }}>
        {week.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5" style={{ height: "100%" }}>
            {d.recovery != null ? (
              <>
                <span className="text-xs font-extrabold" style={{ color: recoveryColor(d.recovery) }}>
                  {Math.round(d.recovery)}%
                </span>
                <div
                  className="w-full max-w-[36px] rounded"
                  style={{
                    height: `${Math.max(2, (d.recovery / 100) * 152)}px`,
                    background: recoveryColor(d.recovery),
                  }}
                />
              </>
            ) : (
              <div className="w-full max-w-[36px] rounded" style={{ height: 2, background: C.track }} />
            )}
            <span className="text-[10px] font-semibold" style={{ color: C.muted }}>
              {d.dow}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
