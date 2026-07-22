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
import Link from "next/link";
import { SyncButton } from "./sync-button";
import { fmtDate } from "@/lib/format";
import { AvgToggle, parseAvg, parseRange, rangeLabel } from "./range-toggle";
import { RangeSlider } from "./range-slider";
import { REC_ZONES } from "./zones-config";
import { getWhoopSmoothing } from "@/lib/settings";
import { downsampleSeries } from "@/lib/downsample";

export const dynamic = "force-dynamic";
// Governs the syncNow server action too; incremental syncs are quick, and the
// large first backfill is run out-of-band, not through this action.
export const maxDuration = 60;

const ERRORS: Record<string, string> = {
  denied: "You declined the WHOOP authorization.",
  state: "The sign-in link expired or didn’t match. Try again.",
  exchange: "Couldn’t complete the WHOOP handshake. Try again.",
};

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
    <div className="flex flex-col gap-3">
      <Link
        href="/dashboard/whoop-revised"
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back to WHOOP
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            WHOOP Data
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            The full detail — recovery, sleep, strain, and workouts.
          </p>
        </div>
        <SyncButton lastSync={lastSync} />
      </div>
    </div>
  );
}

export default async function Whoop({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; range?: string; avg?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error;
  const range = parseRange(sp.range);
  const avg = parseAvg(sp.avg);
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

  const [snapshot, recoveryRaw, sleepRaw, strainRaw, zones, workouts, smoothingPct] =
    await Promise.all([
      getSnapshot(),
      getRecoveryTrend(range),
      getSleepTrend(range),
      getStrainTrend(range),
      getZoneTotals(range),
      getRecentWorkouts(8, range),
      getWhoopSmoothing(),
    ]);
  const smoothing = smoothingPct / 100;

  // Long ranges get downsampled so daily marks don't collapse into a smear.
  const recovery = downsampleSeries(recoveryRaw, ["recovery", "hrv", "rhr"]).rows;
  const strain = downsampleSeries(strainRaw, ["strain"]).rows;
  const sleepDs = downsampleSeries(sleepRaw, ["deep", "light", "rem", "awake", "performance"]);

  const recoveryLine = recovery.map((r) => ({ date: r.date, value: r.recovery }));
  const hrvLine = recovery.map((r) => ({ date: r.date, value: r.hrv }));
  const strainBars = strain.map((s) => ({ date: s.date, value: s.strain }));
  const sleepData = sleepDs.rows.map((s) => ({
    date: s.date,
    deep: s.deep,
    light: s.light,
    rem: s.rem,
    awake: s.awake,
    // Missing-night bars only make sense at daily granularity.
    missing: sleepDs.downsampled ? false : s.missing,
  }));
  const sleepSubtitle = `${rangeLabel(range)}${sleepDs.downsampled ? " · weekly avg" : ""} · hours`;

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

      {/* Time range (all cards) + rolling-average window (Recovery, HRV, Strain) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Range
          </span>
          <RangeSlider range={range} avg={avg} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 sm:w-12">
            Avg
          </span>
          <AvgToggle avg={avg} range={range} />
        </div>
      </div>

      {/* Charts */}
      <div className="whoop-viz flex flex-col gap-4">
        <VizStyles />
        <LineChart
          title="Recovery"
          subtitle={`${rangeLabel(range)} · %`}
          data={recoveryLine}
          colorVar="--recovery"
          unit="%"
          domain={[0, 100]}
          zones={REC_ZONES}
          avgWindow={avg}
          smoothing={smoothing}
          href="/dashboard/whoop/recovery"
        />
        {/* Sleep + HRV — 50/50 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SleepStagesChart
            title="Sleep stages"
            subtitle={sleepSubtitle}
            data={sleepData}
            href="/dashboard/whoop/sleep"
          />
          <LineChart
            title="Heart rate variability"
            subtitle={`${rangeLabel(range)} · ms`}
            data={hrvLine}
            colorVar="--hrv"
            unit="ms"
            avgWindow={avg}
            smoothing={smoothing}
            href="/dashboard/whoop/hrv"
          />
        </div>

        <hr className="my-2 border-black/[.08] dark:border-white/[.145]" />

        {/* Strain / workouts section */}
        <BarChart
          title="Day strain"
          subtitle={`${rangeLabel(range)} · 0–21`}
          data={strainBars}
          colorVar="--strain"
          domainMax={21}
          avgWindow={avg}
          smoothing={smoothing}
          href="/dashboard/whoop/strain"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ZoneBars
          title="Heart-rate zones"
          subtitle={`Time in zone · ${rangeLabel(range).toLowerCase()}`}
          zones={zones}
          href="/dashboard/whoop/zones"
        />

        {/* Recent workouts */}
        <Link href="/dashboard/whoop/workouts" className="group block" aria-label="Workouts details">
        <figure className="m-0 flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-4 transition-colors group-hover:border-black/[.2] dark:border-white/[.145] dark:bg-black dark:group-hover:border-white/[.3]">
          <figcaption className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-black dark:text-zinc-50">
              Recent workouts
            </span>
            <span aria-hidden className="text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400">
              ›
            </span>
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
        </Link>
        </div>
      </div>
    </div>
  );
}
