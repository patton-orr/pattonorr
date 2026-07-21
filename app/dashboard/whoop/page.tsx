import {
  getStatus,
  getSnapshot,
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
} from "./charts";
import { syncNow } from "./actions";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
// Governs the syncNow server action too; incremental syncs are quick, and the
// large first backfill is run out-of-band, not through this action.
export const maxDuration = 60;

const ERRORS: Record<string, string> = {
  denied: "You declined the WHOOP authorization.",
  state: "The sign-in link expired or didn’t match. Try again.",
  exchange: "Couldn’t complete the WHOOP handshake. Try again.",
};

// WHOOP recovery zones: red 0–33, yellow 34–66, green 67–100.
const REC_ZONES = [
  { min: 67, max: 100, colorVar: "--rec-green" },
  { min: 34, max: 66, colorVar: "--rec-yellow" },
  { min: 0, max: 33, colorVar: "--rec-red" },
];

const RANGES = [30, 90, 365];

function rangeLabel(range: number) {
  return range === 365 ? "Last year" : `Last ${range} days`;
}

function RangeToggle({ range }: { range: number }) {
  const opts = [
    { v: 30, l: "30d" },
    { v: 90, l: "90d" },
    { v: 365, l: "1y" },
  ];
  return (
    <div className="inline-flex rounded-full border border-black/[.1] p-0.5 dark:border-white/[.145]">
      {opts.map((o) => (
        <a
          key={o.v}
          href={`?range=${o.v}`}
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

function Stat({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-2xl font-semibold text-black dark:text-zinc-50">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span> : null}
      </span>
      {sub ? <span className="text-xs text-zinc-500">{sub}</span> : null}
    </div>
  );
}

function Header({ lastSync }: { lastSync: string | null }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          WHOOP
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Recovery, sleep, and strain — synced from your account.
        </p>
      </div>
      <form action={syncNow} className="flex items-center gap-3">
        {lastSync ? (
          <span className="text-xs text-zinc-500">
            Synced {new Date(lastSync).toLocaleString()}
          </span>
        ) : null}
        <button
          type="submit"
          className="rounded-full border border-black/[.1] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
        >
          Sync now
        </button>
      </form>
    </div>
  );
}

export default async function Whoop({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error;
  const range = RANGES.includes(Number(sp.range)) ? Number(sp.range) : 90;
  const status = await getStatus();

  if (!status.connected) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          WHOOP
        </h1>
        {error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {ERRORS[error] ?? "Something went wrong. Try again."}
          </p>
        ) : null}
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connect your WHOOP account to sync recovery, sleep, and strain.
          </p>
          <a
            href="/api/whoop/connect"
            className="flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Connect WHOOP
          </a>
        </div>
      </div>
    );
  }

  if (!status.hasData) {
    return (
      <div className="flex flex-col gap-6">
        <Header lastSync={status.lastSync} />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Connected — no data synced yet. It’ll fill in on the next daily sync,
          or hit <span className="font-medium">Sync now</span>.
        </p>
      </div>
    );
  }

  const [snapshot, recovery, sleep, strain, zones, workouts] = await Promise.all([
    getSnapshot(),
    getRecoveryTrend(range),
    getSleepTrend(21),
    getStrainTrend(range),
    getZoneTotals(30),
    getRecentWorkouts(8),
  ]);

  const recoveryLine = recovery.map((r) => ({ date: r.date, value: r.recovery }));
  const hrvLine = recovery.map((r) => ({ date: r.date, value: r.hrv }));
  const strainBars = strain.map((s) => ({ date: s.date, value: s.strain }));
  const sleepData = sleep.map((s) => ({
    date: s.date,
    deep: s.deep,
    light: s.light,
    rem: s.rem,
    awake: s.awake,
  }));

  const fmt = (v: number | null | undefined, d = 0) =>
    v == null ? "—" : v.toFixed(d);

  return (
    <div className="flex flex-col gap-6">
      <Header lastSync={status.lastSync} />

      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Recovery" value={fmt(snapshot.recovery?.score)} unit="%" sub={fmtDate(snapshot.recovery?.date)} />
        <Stat label="Sleep" value={fmt(snapshot.sleep?.hours, 1)} unit="hrs" sub={fmtDate(snapshot.sleep?.date)} />
        <Stat label="Day strain" value={fmt(snapshot.strain?.strain, 1)} sub={fmtDate(snapshot.strain?.date)} />
        <Stat label="HRV" value={fmt(snapshot.recovery?.hrv, 0)} unit="ms" />
        <Stat label="Resting HR" value={fmt(snapshot.recovery?.rhr, 0)} unit="bpm" />
      </div>

      {/* Trend range (applies to Recovery, HRV, Day strain) */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Trends
        </span>
        <RangeToggle range={range} />
      </div>

      {/* Charts */}
      <div className="whoop-viz grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VizStyles />
        <LineChart
          title="Recovery"
          subtitle={`${rangeLabel(range)} · %`}
          data={recoveryLine}
          colorVar="--recovery"
          unit="%"
          domain={[0, 100]}
          zones={REC_ZONES}
        />
        <LineChart
          title="Heart rate variability"
          subtitle={`${rangeLabel(range)} · ms`}
          data={hrvLine}
          colorVar="--hrv"
          unit="ms"
        />
        <SleepStagesChart
          title="Sleep stages"
          subtitle="Last 21 nights · hours"
          data={sleepData}
        />
        <BarChart
          title="Day strain"
          subtitle={`${rangeLabel(range)} · 0–21`}
          data={strainBars}
          colorVar="--strain"
          domainMax={21}
        />
        <ZoneBars
          title="Heart-rate zones"
          subtitle="Time in zone · last 30 days of workouts"
          zones={zones}
        />

        {/* Recent workouts */}
        <figure className="m-0 flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
          <figcaption className="text-sm font-medium text-black dark:text-zinc-50">
            Recent workouts
          </figcaption>
          {workouts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="py-1 pr-3 font-medium">Date</th>
                    <th className="py-1 pr-3 font-medium">Sport</th>
                    <th className="py-1 pr-3 text-right font-medium">Strain</th>
                    <th className="py-1 pr-3 text-right font-medium">Avg HR</th>
                    <th className="py-1 text-right font-medium">Cal</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-700 dark:text-zinc-300">
                  {workouts.map((w, i) => (
                    <tr key={i} className="border-t border-black/[.06] dark:border-white/[.08]">
                      <td className="py-1.5 pr-3 tabular-nums">{fmtDate(w.date)}</td>
                      <td className="py-1.5 pr-3 capitalize">{w.sport ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(w.strain, 1)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(w.avgHr)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(w.calories)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-zinc-500">No workouts yet.</p>
          )}
        </figure>
      </div>
    </div>
  );
}
