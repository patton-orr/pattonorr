import Link from "next/link";
import { PLANS, getPlan, getPlanState } from "@/lib/bible";
import { readerHref } from "@/lib/bible-books";
import { setActivePlanAction, togglePlanDayAction } from "../actions";

export const dynamic = "force-dynamic";

const readHref = (ref: string) => readerHref(ref);

export default async function ReadingPlan() {
  const state = await getPlanState();
  const plan = getPlan(state.active);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Reading plan
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Read through Scripture and track your progress.
        </p>
      </div>

      {!plan ? (
        // Plan chooser
        <div className="flex flex-col gap-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-black dark:text-zinc-50">{p.title}</span>
                <span className="text-sm text-zinc-500">{p.description}</span>
              </div>
              <form action={setActivePlanAction.bind(null, p.id)}>
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                >
                  Start
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <ActivePlan plan={plan} done={new Set(state.progress[plan.id] ?? [])} />
      )}
    </div>
  );
}

function ActivePlan({
  plan,
  done,
}: {
  plan: (typeof PLANS)[number];
  done: Set<number>;
}) {
  const total = plan.readings.length;
  const completed = done.size;
  const pct = Math.round((completed / total) * 100);
  const nextIdx = plan.readings.findIndex((_, i) => !done.has(i));

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-black dark:text-zinc-50">{plan.title}</span>
          <span className="text-sm text-zinc-500 tabular-nums">
            {completed} / {total} · {pct}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.1]">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <form action={setActivePlanAction.bind(null, null)}>
          <button
            type="submit"
            className="self-start text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Switch plan
          </button>
        </form>
      </div>

      {/* Up next */}
      {nextIdx === -1 ? (
        <p className="rounded-2xl border border-black/[.08] bg-white p-5 text-sm text-emerald-700 dark:border-white/[.145] dark:bg-black dark:text-emerald-400">
          🎉 Plan complete — well done.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Up next · day {nextIdx + 1}
            </span>
            <Link
              href={readHref(plan.readings[nextIdx])}
              className="text-lg font-semibold text-black hover:underline dark:text-zinc-50"
            >
              {plan.readings[nextIdx]}
            </Link>
          </div>
          <form action={togglePlanDayAction.bind(null, plan.id, nextIdx)}>
            <button
              type="submit"
              className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Mark done
            </button>
          </form>
        </div>
      )}

      {/* Full list */}
      <div className="flex flex-col">
        <span className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          All readings
        </span>
        <ol className="flex flex-col">
          {plan.readings.map((ref, i) => {
            const isDone = done.has(i);
            return (
              <li
                key={i}
                className="flex items-center gap-3 border-b border-black/[.06] py-2 last:border-0 dark:border-white/[.08]"
              >
                <form action={togglePlanDayAction.bind(null, plan.id, i)} className="flex">
                  <button
                    type="submit"
                    aria-label={isDone ? `Mark day ${i + 1} not done` : `Mark day ${i + 1} done`}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs transition-colors pointer-coarse:h-7 pointer-coarse:w-7 ${
                      isDone
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-black/[.2] text-transparent hover:border-black/[.4] dark:border-white/[.25] dark:hover:border-white/[.5]"
                    }`}
                  >
                    ✓
                  </button>
                </form>
                <span className="w-10 shrink-0 text-xs text-zinc-400 tabular-nums">
                  Day {i + 1}
                </span>
                <Link
                  href={readHref(ref)}
                  className={`text-sm hover:underline ${
                    isDone
                      ? "text-zinc-400 line-through dark:text-zinc-600"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {ref}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
