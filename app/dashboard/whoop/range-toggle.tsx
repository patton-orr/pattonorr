// Server-rendered toggles driven by URL params: ?range= for the time horizon
// and ?avg= for the rolling-average window. Each toggle's links carry the
// other's current value so selections compose.

export const RANGES = [30, 90, 365];
export const AVG_WINDOWS = [3, 5, 10];

export function parseRange(raw: string | undefined, allowAll = false): number {
  const n = Number(raw);
  if (allowAll && raw === "0") return 0;
  return RANGES.includes(n) ? n : 90;
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
  if (range === 0) return "All history";
  return range === 365 ? "Last year" : `Last ${range} days`;
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
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors pointer-coarse:px-4 pointer-coarse:py-2.5 ${
        current
          ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50"
          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
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
  const opts = [
    { v: 30, l: "30d" },
    { v: 90, l: "90d" },
    { v: 365, l: "1y" },
    ...(showAll ? [{ v: 0, l: "All" }] : []),
  ];
  return (
    <div className="inline-flex rounded-full border border-black/[.1] p-0.5 dark:border-white/[.145]">
      {opts.map((o) => (
        <Pill
          key={o.v}
          href={`${basePath}?range=${o.v}${avg != null ? `&avg=${avg}` : ""}`}
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
    <div className="inline-flex rounded-full border border-black/[.1] p-0.5 dark:border-white/[.145]">
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
