import Link from "next/link";
import { fetchPassageText } from "@/lib/esv";
import { verseOfTheDay } from "@/lib/bible";

// The private area — the 95%. Chrome (sidebar, identity, sign-out) lives in
// layout.tsx; this is just the Home page content.
export const dynamic = "force-dynamic";

async function VerseOfTheDay() {
  const ref = verseOfTheDay();
  const v = await fetchPassageText(ref);
  if (!v.ok) return null;
  return (
    <Link
      href={`/dashboard/bible?mode=passage&q=${encodeURIComponent(v.canonical)}`}
      className="group flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-6 transition-colors hover:border-black/[.2] sm:p-8 dark:border-white/[.145] dark:bg-black dark:hover:border-white/[.3]"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Verse of the day
      </span>
      <p className="text-lg leading-relaxed text-black dark:text-zinc-50">
        “{v.text}”
      </p>
      <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300">
        {v.canonical} →
      </span>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Home
      </h1>
      <VerseOfTheDay />
    </div>
  );
}
