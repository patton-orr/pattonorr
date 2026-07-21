import Link from "next/link";
import { fetchPassage, searchPassages } from "@/lib/esv";
import { getBookmarks } from "@/lib/bible";
import { saveBookmarkAction, removeBookmarkAction } from "./actions";

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
      .esv h3 { font-weight: 600; font-size: 0.9rem; margin: 1.75rem 0 0.5rem; color: #71717a; }
      .esv p { margin: 0.9rem 0; }
      .esv .verse-num, .esv .chapter-num {
        font-size: 0.62em; font-weight: 700; vertical-align: super; line-height: 0;
        color: #a1a1aa; margin: 0 0.15em 0 0.05em; }
      .esv .block-indent { margin-left: 1.5rem; }
      .esv .line { display: block; }
      .esv a { color: inherit; text-decoration: none; }
    `}</style>
  );
}

function modePill(active: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-medium transition-colors pointer-coarse:px-4 pointer-coarse:py-2 ${
    active
      ? "bg-black text-white dark:bg-white dark:text-black"
      : "bg-black/[.05] text-zinc-600 hover:bg-black/[.09] dark:bg-white/[.08] dark:text-zinc-300 dark:hover:bg-white/[.14]"
  }`;
}

export default async function Bible({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const mode = sp.mode === "search" ? "search" : "passage";
  const qParam = query ? `&q=${encodeURIComponent(query)}` : "";

  const passage =
    query && mode === "passage" ? await fetchPassage(query) : null;
  const search = query && mode === "search" ? await searchPassages(query) : null;
  const saved =
    passage?.ok && (await getBookmarks()).some((b) => b.ref === passage.canonical);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Bible
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Read a passage or search the ESV.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5">
          <Link href={`/dashboard/bible?mode=passage${qParam}`} className={modePill(mode === "passage")}>
            Passage
          </Link>
          <Link href={`/dashboard/bible?mode=search${qParam}`} className={modePill(mode === "search")}>
            Search
          </Link>
        </div>
        <form method="get" className="flex flex-col gap-2 sm:flex-row">
          <input
            name="q"
            type="text"
            defaultValue={query}
            autoComplete="off"
            placeholder={mode === "search" ? "e.g. love your enemies" : "e.g. John 3:16, Romans 8"}
            className="flex-1 rounded-full border border-black/[.12] bg-white px-4 py-2.5 text-sm text-black outline-none transition-colors focus:border-black/[.35] dark:border-white/[.18] dark:bg-black dark:text-zinc-50 dark:focus:border-white/[.4]"
          />
          <input type="hidden" name="mode" value={mode} />
          <button
            type="submit"
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            {mode === "search" ? "Search" : "Look up"}
          </button>
        </form>
      </div>

      {/* Empty state */}
      {!query && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Try
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Link
                key={s}
                href={`/dashboard/bible?mode=passage&q=${encodeURIComponent(s)}`}
                className="rounded-full bg-black/[.05] px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-black/[.09] dark:bg-white/[.08] dark:text-zinc-300 dark:hover:bg-white/[.14]"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Passage */}
      {passage && !passage.ok && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{passage.error}</p>
      )}
      {passage?.ok && (
        <article className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 sm:p-8 dark:border-white/[.145] dark:bg-black">
          <EsvStyles />
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
              {passage.canonical}
            </h2>
            <form action={saved ? removeBookmarkAction.bind(null, passage.canonical) : saveBookmarkAction.bind(null, passage.canonical)}>
              <button
                type="submit"
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors pointer-coarse:py-2 ${
                  saved
                    ? "border-transparent bg-black/[.06] text-black dark:bg-white/[.12] dark:text-zinc-50"
                    : "border-black/[.12] text-zinc-600 hover:bg-black/[.04] dark:border-white/[.18] dark:text-zinc-300 dark:hover:bg-white/[.06]"
                }`}
              >
                {saved ? "★ Saved" : "☆ Save"}
              </button>
            </form>
          </div>
          <div className="esv" dangerouslySetInnerHTML={{ __html: passage.html }} />
          <p className="mt-2 border-t border-black/[.06] pt-4 text-xs leading-relaxed text-zinc-400 dark:border-white/[.08]">
            Scripture quotations are from the ESV® Bible (The Holy Bible, English
            Standard Version®), © 2001 by Crossway. Used by permission. All rights
            reserved.
          </p>
        </article>
      )}

      {/* Search */}
      {search && !search.ok && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{search.error}</p>
      )}
      {search?.ok && (
        <div className="flex flex-col gap-3">
          <span className="text-xs text-zinc-500">
            {search.total} result{search.total === 1 ? "" : "s"} for “{query}”
          </span>
          <div className="flex flex-col gap-2">
            {search.results.map((r) => (
              <Link
                key={r.reference}
                href={`/dashboard/bible?mode=passage&q=${encodeURIComponent(r.reference)}`}
                className="flex flex-col gap-1 rounded-xl border border-black/[.08] bg-white p-4 transition-colors hover:border-black/[.2] dark:border-white/[.145] dark:bg-black dark:hover:border-white/[.3]"
              >
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  {r.reference}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {r.content}
                </span>
              </Link>
            ))}
            {!search.results.length && (
              <p className="text-sm text-zinc-500">No results.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
