// Server-rendered toggles driven by URL params: ?range= for the time horizon
// and ?avg= for the rolling-average window. Each toggle's links carry the
// other's current value so selections compose.

export const RANGES = [7, 14, 30, 60, 90, 180, 365];
export const AVG_WINDOWS = [3, 5, 10];

const RANGE_PILLS = [
  { v: 7, l: "1w" },
  { v: 14, l: "2w" },
  { v: 30, l: "30d" },
  { v: 60, l: "60d" },
  { v: 90, l: "90d" },
  { v: 180, l: "6mo" },
  { v: 365, l: "1y" },
];

const RANGE_LABELS: Record<number, string> = {
  0: "All history",
  7: "Last 7 days",
  14: "Last 14 days",
  30: "Last 30 days",
  60: "Last 60 days",
  90: "Last 90 days",
  180: "Last 6 months",
  365: "Last year",
};

export function parseRange(raw: string | undefined, allowAll = false): number {
  const n = Number(raw);
  if (allowAll && raw === "0") return 0;
  return RANGES.includes(n) ? n : 30;
}

export function parseAvg(raw: string | undefined): number {
  const n = Number(raw);
  return AVG_WINDOWS.includes(n) ? n : 5;
}

/** Days to query for a range value (0 = all history). */
export function rangeDays(range: number): number {
  return range === 0 ? 3650 : range;
}

export function rangeLabel(range: number) {
  return RANGE_LABELS[range] ?? `Last ${range} days`;
}

function Pill({
  href,
  current,
  label,
}: {
  href: string;
  current: boolean;
  label: string;
}) {
  return (
    <a
      href={href}
      aria-current={current ? "true" : undefined}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors pointer-coarse:min-h-11 pointer-coarse:px-3.5 pointer-coarse:py-2 ${
        current
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "bg-black/[.05] text-zinc-600 hover:bg-black/[.09] dark:bg-white/[.08] dark:text-zinc-300 dark:hover:bg-white/[.14]"
      }`}
    >
      {label}
    </a>
  );
}

export function RangeToggle({
  range,
  avg,
  basePath = "",
  showAll = false,
}: {
  range: number;
  avg?: number;
  basePath?: string;
  showAll?: boolean;
}) {
  const opts = showAll ? [...RANGE_PILLS, { v: 0, l: "All" }] : RANGE_PILLS;
  const avgQ = avg != null ? `&avg=${avg}` : "";
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <Pill
          key={o.v}
          href={`${basePath}?range=${o.v}${avgQ}`}
          current={range === o.v}
          label={o.l}
        />
      ))}
    </div>
  );
}

export function AvgToggle({
  avg,
  range,
  basePath = "",
}: {
  avg: number;
  range: number;
  basePath?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {AVG_WINDOWS.map((v) => (
        <Pill
          key={v}
          href={`${basePath}?range=${range}&avg=${v}`}
          current={avg === v}
          label={`${v}d`}
        />
      ))}
    </div>
  );
}
