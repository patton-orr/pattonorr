import { AreaCard } from "../area-card";

export default function Health() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Health
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your health data and tools.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AreaCard
          href="/dashboard/whoop-revised"
          title="WHOOP"
          desc="Recovery, sleep, strain, and workouts."
        />
      </div>
    </div>
  );
}
