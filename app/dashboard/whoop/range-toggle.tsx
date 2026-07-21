// Server-rendered range toggle driven by a ?range= URL param.
// range=0 means "all history" (detail pages only).

export const RANGES = [30, 90, 365];

export function parseRange(raw: string | undefined, allowAll = false): number {
  const n = Number(raw);
  if (allowAll && raw === "0") return 0;
  return RANGES.includes(n) ? n : 90;
}

/** Days to query for a range value (0 = all history). */
export function rangeDays(range: number): number {
  return range === 0 ? 3650 : range;
}

export function rangeLabel(range: number) {
  if (range === 0) return "All history";
  return range === 365 ? "Last year" : `Last ${range} days`;
}

export function RangeToggle({
  range,
  basePath = "",
  showAll = false,
}: {
  range: number;
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
        <a
          key={o.v}
          href={`${basePath}?range=${o.v}`}
          aria-current={range === o.v ? "true" : undefined}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            range === o.v
              ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          {o.l}
        </a>
      ))}
    </div>
  );
}
