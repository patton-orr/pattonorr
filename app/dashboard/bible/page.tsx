import Link from "next/link";
import { fetchPassage } from "@/lib/esv";

export const dynamic = "force-dynamic";

const SUGGESTIONS = [
  "John 3:16",
  "Psalm 23",
  "Romans 8",
  "Philippians 4:6-7",
  "Proverbs 3:5-6",
  "Genesis 1",
];

function EsvStyles() {
  return (
    <style>{`
      .esv { line-height: 1.85; color: #18181b; }
      @media (prefers-color-scheme: dark) { .esv { color: #e4e4e7; } }
      .esv .extra_text, .esv .copyright, .esv .footnotes { display: none; }
      .esv h3 { font-weight: 600; font-size: 0.9rem; letter-spacing: 0.01em;
        margin: 1.75rem 0 0.5rem; color: #71717a; }
      .esv p { margin: 0.9rem 0; }
      .esv .verse-num, .esv .chapter-num {
        font-size: 0.62em; font-weight: 700; vertical-align: super;
        line-height: 0; color: #a1a1aa; margin: 0 0.15em 0 0.05em; }
      .esv .block-indent { margin-left: 1.5rem; }
      .esv .line { display: block; }
      .esv a { color: inherit; text-decoration: none; }
    `}</style>
  );
}

export default async function Bible({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const result = query ? await fetchPassage(query) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Bible
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Look up any passage (ESV).
        </p>
      </div>

      <form method="get" className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          type="text"
          defaultValue={query}
          autoComplete="off"
          placeholder="e.g. John 3:16, Romans 8, Psalm 23"
          className="flex-1 rounded-full border border-black/[.12] bg-white px-4 py-2.5 text-sm text-black outline-none transition-colors focus:border-black/[.35] dark:border-white/[.18] dark:bg-black dark:text-zinc-50 dark:focus:border-white/[.4]"
        />
        <button
          type="submit"
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Look up
        </button>
      </form>

      {!result ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Try
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Link
                key={s}
                href={`/dashboard/bible?q=${encodeURIComponent(s)}`}
                className="rounded-full bg-black/[.05] px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-black/[.09] dark:bg-white/[.08] dark:text-zinc-300 dark:hover:bg-white/[.14]"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      ) : !result.ok ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{result.error}</p>
      ) : (
        <article className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 sm:p-8 dark:border-white/[.145] dark:bg-black">
          <EsvStyles />
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            {result.canonical}
          </h2>
          <div className="esv" dangerouslySetInnerHTML={{ __html: result.html }} />
          <p className="mt-2 border-t border-black/[.06] pt-4 text-xs leading-relaxed text-zinc-400 dark:border-white/[.08]">
            Scripture quotations are from the ESV® Bible (The Holy Bible, English
            Standard Version®), © 2001 by Crossway, a publishing ministry of Good
            News Publishers. Used by permission. All rights reserved.
          </p>
        </article>
      )}
    </div>
  );
}
