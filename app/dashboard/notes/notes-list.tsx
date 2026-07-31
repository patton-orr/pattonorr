"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { readerHref } from "@/lib/bible-books";
import type { QuickNote } from "@/lib/notes";
import { addNoteAction, removeNoteAction } from "./actions";

type Mutation =
  | { type: "add"; note: QuickNote }
  | { type: "remove"; id: string };

export function NotesList({ notes }: { notes: QuickNote[] }) {
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();
  const [items, applyMutation] = useOptimistic(
    notes,
    (state: QuickNote[], m: Mutation) =>
      m.type === "add"
        ? [m.note, ...state]
        : state.filter((n) => n.id !== m.id),
  );

  function submit() {
    const t = text.trim();
    if (!t) return;
    setText("");
    startTransition(async () => {
      applyMutation({
        type: "add",
        note: {
          id: `optimistic-${crypto.randomUUID()}`,
          ref: null,
          text: t,
          createdAt: new Date().toISOString(),
        },
      });
      await addNoteAction(t);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      applyMutation({ type: "remove", id });
      await removeNoteAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the note; Shift+Enter keeps a newline for longer jots.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="Jot something down… (Enter to add, Shift+Enter for a new line)"
          className="w-full resize-y rounded-xl border border-black/[.1] bg-white px-3.5 py-2.5 text-sm leading-relaxed text-black outline-none focus:ring-2 focus:ring-black/20 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:ring-white/25"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
          >
            Add note
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/[.12] px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/[.15]">
          No notes yet. Anything you capture here — or from the verse card —
          shows up in this list.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-black/[.08] bg-white p-3.5 dark:border-white/[.12] dark:bg-black"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-black dark:text-zinc-50">
                  {n.text}
                </p>
                <span className="flex items-center gap-2 text-xs text-zinc-500">
                  {n.ref && (
                    <Link
                      href={readerHref(n.ref)}
                      className="font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
                    >
                      {n.ref}
                    </Link>
                  )}
                  <span>{fmtDate(n.createdAt.slice(0, 10))}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(n.id)}
                aria-label="Delete note"
                className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/[.04] hover:text-rose-600 dark:hover:bg-white/[.06] dark:hover:text-rose-400"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
