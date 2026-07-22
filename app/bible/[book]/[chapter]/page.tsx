import Link from "next/link";
import { notFound } from "next/navigation";
import { BOOKS, bookBySlug, neighbors, refFor } from "@/lib/bible-books";
import { fetchPassage } from "@/lib/esv";
import { getBookmarks, getChapterNotes } from "@/lib/bible";
import { getFaithAutoHighlight } from "@/lib/settings";
import { currentUserId } from "@/lib/current-user";
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
  const [passage, bookmarks, notes, autoHighlight] = await Promise.all([
    fetchPassage(ref),
    getBookmarks(),
    getChapterNotes(ref),
    getFaithAutoHighlight(await currentUserId()),
  ]);
  const saved = bookmarks.some((b) => b.ref === ref);
  const { prev, next } = neighbors(slug, chapter);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <EsvStyles />

      {/* Compact reader controls (the top nav lives above, in the layout) */}
      <div className="mb-5 flex items-center justify-between gap-2">
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
      </div>

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
          autoHighlight={autoHighlight}
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
    </div>
  );
}
