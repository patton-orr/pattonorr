"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type BookLite = {
  name: string;
  slug: string;
  chapters: number;
  testament: "OT" | "NT";
};

export function ChapterPicker({
  current,
  books,
}: {
  current: { slug: string; chapter: number; label: string };
  books: BookLite[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(current.slug);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Bring the current book (and its chapter grid) into view.
    selectedRef.current?.scrollIntoView({ block: "center" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function openPicker() {
    setSelected(current.slug); // jump to the current book each time we open
    setOpen(true);
  }

  const groups: [string, BookLite[]][] = [
    ["Old Testament", books.filter((b) => b.testament === "OT")],
    ["New Testament", books.filter((b) => b.testament === "NT")],
  ];

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-black/[.05] dark:text-zinc-50 dark:hover:bg-white/[.08]"
      >
        {current.label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Choose a passage">
          <div className="absolute inset-0 bg-black/40" aria-hidden onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-black/[.08] bg-white shadow-xl sm:rounded-2xl dark:border-white/[.145] dark:bg-black">
            <div className="flex items-center justify-between border-b border-black/[.08] px-4 py-3 dark:border-white/[.145]">
              <span className="text-sm font-semibold text-black dark:text-zinc-50">Books</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain p-2">
              {groups.map(([label, list]) => (
                <div key={label}>
                  <div className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {label}
                  </div>
                  {list.map((b) => (
                    <div key={b.slug} ref={b.slug === selected ? selectedRef : undefined}>
                      <button
                        type="button"
                        onClick={() => setSelected(b.slug)}
                        aria-expanded={selected === b.slug}
                        className={`w-full rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
                          selected === b.slug
                            ? "bg-black/[.06] font-medium text-black dark:bg-white/[.1] dark:text-zinc-50"
                            : "text-zinc-700 hover:bg-black/[.03] dark:text-zinc-300 dark:hover:bg-white/[.05]"
                        }`}
                      >
                        {b.name}
                      </button>
                      {selected === b.slug && (
                        <div className="grid grid-cols-6 gap-1.5 px-1 py-2 sm:grid-cols-8">
                          {Array.from({ length: b.chapters }, (_, i) => i + 1).map((ch) => (
                            <Link
                              key={ch}
                              href={`/bible/${b.slug}/${ch}`}
                              onClick={() => setOpen(false)}
                              className={`flex h-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors ${
                                b.slug === current.slug && ch === current.chapter
                                  ? "bg-foreground text-background"
                                  : "bg-black/[.04] text-zinc-700 hover:bg-black/[.09] dark:bg-white/[.06] dark:text-zinc-300 dark:hover:bg-white/[.12]"
                              }`}
                            >
                              {ch}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
