import { requireSection } from "@/lib/require-access";

export default async function Work() {
  await requireSection("work");
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Work
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Nothing here yet — a placeholder for the Work area.
      </p>
    </div>
  );
}
