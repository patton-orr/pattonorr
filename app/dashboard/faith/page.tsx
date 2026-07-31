import { requireSection } from "@/lib/require-access";
import { AreaCard } from "../area-card";
import { VerseOfTheDay } from "../verse-of-the-day";

export const dynamic = "force-dynamic";

export default async function Faith() {
  await requireSection("faith");
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Faith
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Scripture, reading, and reflection.
        </p>
      </div>
      <VerseOfTheDay />
      <div className="grid gap-4 sm:grid-cols-2">
        <AreaCard href="/bible" title="Bible" desc="Read the ESV in a full-screen reader." />
        <AreaCard href="/dashboard/bible/plan" title="Reading plan" desc="Read through Scripture and track progress." />
        <AreaCard href="/dashboard/bible/saved" title="Saved" desc="Passages you’ve saved." />
      </div>
    </div>
  );
}
