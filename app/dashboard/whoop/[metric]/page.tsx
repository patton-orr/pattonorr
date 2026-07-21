import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRecoveryTrend,
  getSleepTrend,
  getStrainTrend,
  getZoneTotals,
  getRecentWorkouts,
} from "@/lib/whoop-queries";
import {
  VizStyles,
  LineChart,
  SleepStagesChart,
  BarChart,
  ZoneBars,
} from "../charts";
import { fmtDate } from "@/lib/format";
import {
  AvgToggle,
  RangeToggle,
  parseAvg,
  parseRange,
  rangeDays,
  rangeLabel,
} from "../range-toggle";
import { REC_ZONES } from "../zones-config";
import { getWhoopSmoothing } from "@/lib/settings";

export const dynamic = "force-dynamic";

const METRICS = [
  "recovery",
  "hrv",
  "sleep",
  "strain",
  "zones",
  "workouts",
] as const;
type Metric = (typeof METRICS)[number];

const TITLES: Record<Metric, string> = {
  recovery: "Recovery",
  hrv: "Heart rate variability",
  sleep: "Sleep",
  strain: "Day strain",
  zones: "Heart-rate zones",
  workouts: "Workouts",
};

function stats(values: (number | null)[]) {
  const v = values.filter((x): x is number => x != null);
  if (!v.length) return null;
  return {
    avg: v.reduce((s, x) => s + x, 0) / v.length,
    min: Math.min(...v),
    max: Math.max(...v),
    n: v.length,
  };
}

function StatRow({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-1 rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black"
        >
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {s.label}
          </span>
          <span className="text-2xl font-semibold text-black tabular-nums dark:text-zinc-50">
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DataTable({
  head,
  rows,
}: {
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-zinc-500">
            {head.map((h, i) => (
              <th
                key={h}
                className={`py-1 pr-3 font-medium ${i > 0 ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-zinc-700 dark:text-zinc-300">
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-black/[.06] dark:border-white/[.08]">
              {r.map((c, j) => (
                <td
                  key={j}
                  className={`py-1.5 pr-3 whitespace-nowrap tabular-nums ${j > 0 ? "text-right" : ""} ${j === 1 && head[1] === "Sport" ? "capitalize text-left" : ""}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const num = (v: number | null | undefined, d = 0) =>
  v == null ? "—" : v.toFixed(d);

export default async function MetricDetail({
  params,
  searchParams,
}: {
  params: Promise<{ metric: string }>;
  searchParams: Promise<{ range?: string; avg?: string }>;
}) {
  const { metric } = await params;
  const sp = await searchParams;
  if (!METRICS.includes(metric as Metric)) notFound();
  const m = metric as Metric;
  const range = parseRange(sp.range, true);
  const avg = parseAvg(sp.avg);
  const days = rangeDays(range);
  const basePath = `/dashboard/whoop/${m}`;
  const hasAvg = m === "recovery" || m === "hrv" || m === "strain";
  const smoothing = (await getWhoopSmoothing()) / 100;

  let body: React.ReactNode = null;

  if (m === "recovery" || m === "hrv") {
    const trend = await getRecoveryTrend(days);
    const isRec = m === "recovery";
    const series = trend.map((r) => ({
      date: r.date,
      value: isRec ? r.recovery : r.hrv,
    }));
    const s = stats(series.map((p) => p.value));
    body = (
      <>
        {s && (
          <StatRow
            items={[
              { label: "Average", value: num(s.avg, isRec ? 0 : 1) + (isRec ? "%" : " ms") },
              { label: "Min", value: num(s.min, 0) + (isRec ? "%" : " ms") },
              { label: "Max", value: num(s.max, 0) + (isRec ? "%" : " ms") },
              { label: "Days", value: String(s.n) },
            ]}
          />
        )}
        <LineChart
          title={TITLES[m]}
          subtitle={`${rangeLabel(range)} · ${isRec ? "%" : "ms"}`}
          data={series}
          colorVar={isRec ? "--recovery" : "--hrv"}
          unit={isRec ? "%" : "ms"}
          domain={isRec ? [0, 100] : undefined}
          zones={isRec ? REC_ZONES : undefined}
          avgWindow={avg}
          smoothing={smoothing}
        />
        <DataTable
          head={["Date", "Recovery %", "HRV ms", "Resting HR"]}
          rows={[...trend]
            .reverse()
            .map((r) => [
              fmtDate(r.date) ?? r.date,
              num(r.recovery),
              num(r.hrv, 1),
              num(r.rhr),
            ])}
        />
      </>
    );
  }

  if (m === "sleep") {
    const trend = await getSleepTrend(days);
    // Stacked bars get unreadable past ~60 nights; chart the most recent 60
    // and let the table carry the full range.
    const chartData = trend.slice(-60).map((s) => ({
      date: s.date,
      deep: s.deep,
      light: s.light,
      rem: s.rem,
      awake: s.awake,
    }));
    const totals = trend.map((t) => t.deep + t.light + t.rem);
    const s = stats(totals);
    body = (
      <>
        {s && (
          <StatRow
            items={[
              { label: "Avg asleep", value: num(s.avg, 1) + "h" },
              { label: "Min", value: num(s.min, 1) + "h" },
              { label: "Max", value: num(s.max, 1) + "h" },
              { label: "Nights", value: String(s.n) },
            ]}
          />
        )}
        <SleepStagesChart
          title="Sleep stages"
          subtitle={`${trend.length > 60 ? "Most recent 60 nights" : rangeLabel(range)} · hours`}
          data={chartData}
        />
        <DataTable
          head={["Date", "Asleep h", "Deep h", "REM h", "Light h", "Perf %"]}
          rows={[...trend]
            .reverse()
            .map((t) => [
              fmtDate(t.date) ?? t.date,
              num(t.deep + t.light + t.rem, 1),
              num(t.deep, 1),
              num(t.rem, 1),
              num(t.light, 1),
              num(t.performance),
            ])}
        />
      </>
    );
  }

  if (m === "strain") {
    const trend = await getStrainTrend(days);
    const s = stats(trend.map((t) => t.strain));
    body = (
      <>
        {s && (
          <StatRow
            items={[
              { label: "Average", value: num(s.avg, 1) },
              { label: "Min", value: num(s.min, 1) },
              { label: "Max", value: num(s.max, 1) },
              { label: "Days", value: String(s.n) },
            ]}
          />
        )}
        <BarChart
          title="Day strain"
          subtitle={`${rangeLabel(range)} · 0–21`}
          data={trend.map((t) => ({ date: t.date, value: t.strain }))}
          colorVar="--strain"
          domainMax={21}
          avgWindow={avg}
          smoothing={smoothing}
        />
        <DataTable
          head={["Date", "Strain", "Calories", "Avg HR", "Max HR"]}
          rows={[...trend]
            .reverse()
            .map((t) => [
              fmtDate(t.date) ?? t.date,
              num(t.strain, 1),
              num(t.calories),
              num(t.avgHr),
              num(t.maxHr),
            ])}
        />
      </>
    );
  }

  if (m === "zones") {
    const zones = await getZoneTotals(days);
    const total = zones.z0 + zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5;
    body = (
      <>
        <StatRow
          items={[
            { label: "Total time", value: `${Math.floor(total / 60)}h ${Math.round(total % 60)}m` },
            { label: "Zones 3–5", value: `${Math.round(zones.z3 + zones.z4 + zones.z5)}m` },
          ]}
        />
        <ZoneBars
          title="Heart-rate zones"
          subtitle={`Time in zone · ${rangeLabel(range).toLowerCase()}`}
          zones={zones}
        />
      </>
    );
  }

  if (m === "workouts") {
    const workouts = await getRecentWorkouts(200);
    body = (
      <DataTable
        head={["Date", "Sport", "Min", "Strain", "Avg HR", "Cal", "Km"]}
        rows={workouts.map((w) => [
          fmtDate(w.date) ?? w.date,
          w.sport ?? "—",
          num(w.minutes),
          num(w.strain, 1),
          num(w.avgHr),
          num(w.calories),
          num(w.distanceKm, 1),
        ])}
      />
    );
  }

  return (
    <div className="whoop-viz flex flex-col gap-6">
      <VizStyles />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard/whoop"
            className="inline-block text-xs text-zinc-500 pointer-coarse:py-2 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← WHOOP
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {TITLES[m]}
          </h1>
        </div>
        {m !== "workouts" ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {hasAvg ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Avg
                </span>
                <AvgToggle avg={avg} range={range} basePath={basePath} />
              </span>
            ) : null}
            <RangeToggle
              range={range}
              avg={hasAvg ? avg : undefined}
              basePath={basePath}
              showAll
            />
          </div>
        ) : null}
      </div>
      {body}
    </div>
  );
}
