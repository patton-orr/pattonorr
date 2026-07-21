import Link from "next/link";
import { notFound } from "next/navigation";
import { BOOKS, bookBySlug, neighbors, refFor } from "@/lib/bible-books";
import { fetchPassage } from "@/lib/esv";
import { getBookmarks, getChapterNotes } from "@/lib/bible";
import { saveBookmarkAction, removeBookmarkAction } from "@/app/dashboard/bible/actions";
import { EsvStyles, ESV_COPYRIGHT } from "../../esv-styles";
import { ChapterPicker } from "../../chapter-picker";
import { ReaderContent } from "./reader-content";

export const dynamic = "force-dynamic";

const BOOKS_LITE = BOOKS.map(({ name, slug, chapters, testament }) => ({
  name,
  slug,
  chapters,
  testament,
}));

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-black/[.04] pointer-coarse:py-2.5 dark:text-zinc-300 dark:hover:bg-white/[.06]"
    >
      {children}
    </Link>
  );
}

export default async function Reader({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book: slug, chapter: chStr } = await params;
  const book = bookBySlug(slug);
  const chapter = Number(chStr);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    notFound();
  }

  const ref = refFor(book, chapter);
  const [passage, bookmarks, notes] = await Promise.all([
    fetchPassage(ref),
    getBookmarks(),
    getChapterNotes(ref),
  ]);
  const saved = bookmarks.some((b) => b.ref === ref);
  const { prev, next } = neighbors(slug, chapter);

  return (
    <div
      className="faith-theme flex min-h-dvh flex-col font-sans"
      style={{ background: "var(--reader-bg)", color: "var(--reader-fg)" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b px-2 py-2"
        style={{
          background: "var(--reader-surface)",
          borderColor: "var(--reader-border)",
        }}
      >
        <Link
          href="/dashboard"
          aria-label="Exit reader"
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <ChapterPicker current={{ slug: book.slug, chapter, label: ref }} books={BOOKS_LITE} />

        <form action={saved ? removeBookmarkAction.bind(null, ref) : saveBookmarkAction.bind(null, ref)}>
          <button
            type="submit"
            aria-label={saved ? "Remove bookmark" : "Save passage"}
            className={`rounded-lg p-2 text-lg leading-none transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08] ${
              saved ? "text-amber-500" : "text-zinc-400"
            }`}
          >
            {saved ? "★" : "☆"}
          </button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <EsvStyles />
        <h1
          className="mb-6 text-2xl font-semibold tracking-tight"
          style={{ color: "var(--reader-fg)", fontFamily: "var(--reader-serif)" }}
        >
          {ref}
        </h1>
        {passage.ok ? (
          <ReaderContent
            refLabel={ref}
            html={passage.html}
            initialHighlights={notes.highlights}
            initialReflection={notes.reflection}
          />
        ) : (
          <p className="text-sm text-rose-600 dark:text-rose-400">{passage.error}</p>
        )}

        <nav
          className="mt-10 flex items-center justify-between gap-3 border-t pt-6"
          style={{ borderColor: "var(--reader-border)" }}
        >
          {prev ? <NavLink href={`/bible/${prev.slug}/${prev.chapter}`}>← {prev.label}</NavLink> : <span />}
          {next ? <NavLink href={`/bible/${next.slug}/${next.chapter}`}>{next.label} →</NavLink> : <span />}
        </nav>

        <p className="mt-8 text-xs leading-relaxed" style={{ color: "var(--reader-muted)" }}>
          {ESV_COPYRIGHT}
        </p>
      </main>
    </div>
  );
}
