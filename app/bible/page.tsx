import Link from "next/link";
import { BOOKS, readerHref } from "@/lib/bible-books";
import { searchPassages } from "@/lib/esv";

export const dynamic = "force-dynamic";

function BookGrid() {
  const groups: [string, typeof BOOKS][] = [
    ["Old Testament", BOOKS.filter((b) => b.testament === "OT")],
    ["New Testament", BOOKS.filter((b) => b.testament === "NT")],
  ];
  return (
    <div className="flex flex-col gap-6">
      {groups.map(([label, list]) => (
        <div key={label} className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {label}
          </span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {list.map((b) => (
              <Link
                key={b.slug}
                href={`/bible/${b.slug}/1`}
                className="rounded-lg bg-black/[.04] px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.08] pointer-coarse:py-3 dark:bg-white/[.06] dark:text-zinc-200 dark:hover:bg-white/[.12]"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function BibleHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const search = query ? await searchPassages(query) : null;

  return (
    <div
      className="faith-theme flex min-h-dvh flex-col font-sans"
      style={{ background: "var(--reader-bg)", color: "var(--reader-fg)" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3"
        style={{ background: "var(--reader-surface)", borderColor: "var(--reader-border)" }}
      >
        <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--reader-fg)" }}>
          Bible
        </span>
        <Link
          href="/dashboard"
          className="rounded-full px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-black/[.05] pointer-coarse:py-2 dark:hover:bg-white/[.08]"
        >
          Dashboard
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6 sm:px-8">
        <form method="get" className="mb-6 flex gap-2">
          <input
            name="q"
            type="text"
            defaultValue={query}
            autoComplete="off"
            placeholder="Search the ESV…"
            className="flex-1 rounded-full border border-[color:var(--reader-border)] bg-[var(--reader-surface)] px-4 py-2.5 text-sm text-[color:var(--reader-fg)] outline-none transition-colors focus:border-black/[.35] dark:focus:border-white/[.4]"
          />
          <button
            type="submit"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Search
          </button>
        </form>

        {!search ? (
          <BookGrid />
        ) : !search.ok ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{search.error}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {search.total} result{search.total === 1 ? "" : "s"} for “{query}”
              </span>
              <Link href="/bible" className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200">
                Browse books
              </Link>
            </div>
            {search.results.map((r) => (
              <Link
                key={r.reference}
                href={readerHref(r.reference)}
                className="flex flex-col gap-1 rounded-xl border border-[color:var(--faith-card-border)] bg-[var(--faith-card)] p-4 transition-colors hover:border-black/[.2] dark:hover:border-white/[.3]"
              >
                <span className="text-sm font-medium" style={{ color: "var(--reader-fg)" }}>
                  {r.reference}
                </span>
                <span className="text-sm" style={{ color: "var(--reader-muted)" }}>
                  {r.content}
                </span>
              </Link>
            ))}
            {!search.results.length && <p className="text-sm text-zinc-500">No results.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
