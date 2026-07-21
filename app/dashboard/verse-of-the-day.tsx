import Link from "next/link";
import { fetchPassageText } from "@/lib/esv";
import { verseOfTheDay } from "@/lib/bible";
import { readerHref } from "@/lib/bible-books";

export async function VerseOfTheDay() {
  const ref = verseOfTheDay();
  const v = await fetchPassageText(ref);
  if (!v.ok) return null;
  return (
    <Link
      href={readerHref(v.canonical)}
      className="faith-theme group flex flex-col gap-3 rounded-2xl border border-[color:var(--reader-border)] bg-[var(--reader-surface)] p-6 transition-colors hover:border-black/[.2] sm:p-8 dark:hover:border-white/[.3]"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--reader-muted)]">
        Verse of the day
      </span>
      <p
        className="text-lg leading-relaxed text-[color:var(--reader-fg)]"
        style={{ fontFamily: "var(--reader-serif)" }}
      >
        “{v.text}”
      </p>
      <span className="text-sm font-medium text-[color:var(--reader-muted)] transition-colors group-hover:text-[color:var(--reader-fg)]">
        {v.canonical} →
      </span>
    </Link>
  );
}
