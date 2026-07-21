import Link from "next/link";
import { getBookmarks } from "@/lib/bible";
import { readerHref } from "@/lib/bible-books";
import { fmtDate } from "@/lib/format";
import { removeBookmarkAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SavedPassages() {
  const bookmarks = await getBookmarks();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Saved passages
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Passages you’ve saved from the reader.
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nothing saved yet. Open a passage in the{" "}
          <Link href="/dashboard/bible" className="underline underline-offset-2">
            Bible reader
          </Link>{" "}
          and tap Save.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bookmarks.map((b) => (
            <li
              key={b.ref}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black"
            >
              <Link href={readerHref(b.ref)} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-black dark:text-zinc-50">
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
    </div>
  );
}
