import Link from "next/link";
import { getBookmarks, getAllHighlights } from "@/lib/bible";
import { getQuickNotes } from "@/lib/notes";
import { readerHref } from "@/lib/bible-books";
import { fmtDate } from "@/lib/format";
import { removeBookmarkAction } from "../actions";
import { removeQuickNoteAction } from "../../faith/actions";

export const dynamic = "force-dynamic";

const cardClass =
  "rounded-xl border border-[color:var(--faith-card-border)] bg-[var(--faith-card)] p-4";

function Column({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: "var(--reader-muted)" }}
        >
          {title}
        </h2>
        <span className="text-xs tabular-nums" style={{ color: "var(--reader-muted)" }}>
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.9rem] leading-relaxed" style={{ color: "var(--reader-muted)" }}>
      {children}
    </p>
  );
}

export default async function SavedPassages() {
  const [bookmarks, highlights, notes] = await Promise.all([
    getBookmarks(),
    getAllHighlights(),
    getQuickNotes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Saved
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your starred passages, highlights, and notes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Favorites — starred passages */}
        <Column title="Favorites" count={bookmarks.length}>
          {bookmarks.length === 0 ? (
            <Empty>Tap the star in the reader to save a passage here.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {bookmarks.map((b) => (
                <li
                  key={b.ref}
                  className={`flex items-center justify-between gap-3 ${cardClass}`}
                >
                  <Link href={readerHref(b.ref)} className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-black dark:text-zinc-50">
                      {b.ref}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Saved {fmtDate(b.savedAt.slice(0, 10))}
                    </span>
                  </Link>
                  <form action={removeBookmarkAction.bind(null, b.ref)}>
                    <button
                      type="submit"
                      aria-label={`Remove ${b.ref}`}
                      className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/[.04] hover:text-rose-600 dark:hover:bg-white/[.06] dark:hover:text-rose-400"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Column>

        {/* Highlights — highlighted text (with any attached note) */}
        <Column title="Highlights" count={highlights.length}>
          {highlights.length === 0 ? (
            <Empty>Highlight text in the reader and it shows up here.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {highlights.map(({ ref, highlight }) => (
                <li key={highlight.id} className={cardClass}>
                  <Link href={readerHref(ref)} className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: `var(--hl-${highlight.color})` }}
                      />
                      <span className="text-xs text-zinc-500">{ref}</span>
                    </span>
                    <span
                      className="text-[0.9rem] leading-snug italic"
                      style={{ color: "var(--reader-fg)" }}
                    >
                      “{highlight.quote}”
                    </span>
                    {highlight.note.trim() && (
                      <span
                        className="text-[0.85rem] leading-snug"
                        style={{ color: "var(--reader-fg)", opacity: 0.85 }}
                      >
                        {highlight.note}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Column>

        {/* Notes — captured from the verse of the moment */}
        <Column title="Notes" count={notes.length}>
          {notes.length === 0 ? (
            <Empty>
              Notes you capture from the verse of the moment show up here.
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {notes.map((n) => (
                <li key={n.id} className={`flex flex-col gap-2 ${cardClass}`}>
                  <p
                    className="text-[0.9rem] leading-snug whitespace-pre-wrap"
                    style={{ color: "var(--reader-fg)" }}
                  >
                    {n.text}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">
                      {n.ref ? (
                        <Link
                          href={readerHref(n.ref)}
                          className="underline underline-offset-2"
                        >
                          {n.ref}
                        </Link>
                      ) : (
                        "General"
                      )}
                      {" · "}
                      {fmtDate(n.createdAt.slice(0, 10))}
                    </span>
                    <form action={removeQuickNoteAction.bind(null, n.id)}>
                      <button
                        type="submit"
                        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Column>
      </div>
    </div>
  );
}
