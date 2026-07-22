import Link from "next/link";
import {
  getStatus,
  getSnapshot,
  getRecoveryTrend,
  getStrainTrend,
  type RecoveryPoint,
  type StrainPoint,
} from "@/lib/whoop-queries";
import {
  OverviewRings,
  StrainRecoveryChart,
  RecoveryTrend,
  type Day,
} from "./revised-charts";

export const dynamic = "force-dynamic";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Merge recovery + strain by date and keep the last 7 days.
function buildWeek(rec: RecoveryPoint[], strain: StrainPoint[]): Day[] {
  const byDate = new Map<string, { recovery: number | null; strain: number | null }>();
  const get = (d: string) => byDate.get(d) ?? { recovery: null, strain: null };
  for (const r of rec) byDate.set(r.date, { ...get(r.date), recovery: r.recovery });
  for (const s of strain) byDate.set(s.date, { ...get(s.date), strain: s.strain });
  const dates = [...byDate.keys()].sort().slice(-7);
  return dates.map((date) => {
    const [y, m, d] = date.split("-").map(Number);
    const js = new Date(Date.UTC(y, m - 1, d));
    const v = byDate.get(date)!;
    return { dow: DOW[js.getUTCDay()], dom: String(d), recovery: v.recovery, strain: v.strain };
  });
}

export default async function WhoopRevised() {
  const status = await getStatus();

  if (!status.hasData) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          WHOOP (revised)
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No WHOOP data yet — connect and sync on the{" "}
          <Link href="/dashboard/whoop" className="underline underline-offset-2">
            WHOOP page
          </Link>
          .
        </p>
      </div>
    );
  }

  const [snapshot, rec, strain] = await Promise.all([
    getSnapshot(),
    getRecoveryTrend(10),
    getStrainTrend(10),
  ]);
  const week = buildWeek(rec, strain);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          WHOOP (revised)
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A darker, WHOOP-app-styled take — a sandbox for new visuals, kept
          separate from the original.
        </p>
      </div>

      <OverviewRings
        sleep={snapshot.sleep?.performance ?? null}
        recovery={snapshot.recovery?.score ?? null}
        strain={snapshot.strain?.strain ?? null}
      />
      <StrainRecoveryChart week={week} />
      <RecoveryTrend week={week} />
    </div>
  );
}
