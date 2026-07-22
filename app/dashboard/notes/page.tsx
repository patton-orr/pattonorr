import Link from "next/link";
import { getQuickNotes } from "@/lib/notes";
import { readerHref } from "@/lib/bible-books";
import { fmtDate } from "@/lib/format";
import { removeQuickNoteAction } from "../faith/actions";

export const dynamic = "force-dynamic";

export default async function Notes() {
  const notes = await getQuickNotes();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Notes
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Quick notes you&apos;ve captured.
        </p>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nothing yet. Add a note from the verse card on Home or Faith.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black"
            >
              <p className="text-sm whitespace-pre-wrap text-black dark:text-zinc-50">
                {n.text}
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">
                  {n.ref ? (
                    <Link
                      href={readerHref(n.ref)}
                      className="underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-300"
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
                    className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
