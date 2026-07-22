"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { readerHref } from "@/lib/bible-books";
import { addQuickNoteAction, randomVerseAction } from "./faith/actions";

export type Verse = { ref: string; text: string; canonical: string };

const MOMENT_MS = 5 * 60 * 1000;

function IconButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-full p-1.5 text-[color:var(--reader-muted)] transition-colors hover:text-[color:var(--reader-fg)] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function VerseOfTheDayCard({ initial }: { initial: Verse }) {
  const [verse, setVerse] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saved, setSaved] = useState(false);

  const verseRef = useRef(verse);
  useEffect(() => {
    verseRef.current = verse;
  }, [verse]);

  function refresh() {
    startTransition(async () => {
      const next = await randomVerseAction(verseRef.current.ref);
      if (next) setVerse(next);
    });
  }

  function saveNote() {
    const text = noteText.trim();
    if (!text) return;
    const ref = verseRef.current.canonical;
    startTransition(async () => {
      await addQuickNoteAction(text, ref);
    });
    setNoteText("");
    setNoteOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  // Advance to a fresh verse every 5 minutes while the card is on screen.
  useEffect(() => {
    const id = setInterval(() => {
      startTransition(async () => {
        const next = await randomVerseAction(verseRef.current.ref);
        if (next) setVerse(next);
      });
    }, MOMENT_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="faith-theme flex flex-col gap-3 rounded-2xl border border-[color:var(--reader-border)] bg-[var(--reader-surface)] p-6 sm:p-8">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide uppercase text-[color:var(--reader-muted)]">
          Verse of the moment
        </span>
        <div className="-mr-1 flex items-center gap-0.5">
          {saved && (
            <span className="mr-1 text-xs text-[color:var(--reader-muted)]">
              Saved
            </span>
          )}
          <IconButton
            label={noteOpen ? "Close note" : "Add a note"}
            onClick={() => setNoteOpen((o) => !o)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </IconButton>
          <IconButton label="Show another verse" onClick={refresh} disabled={pending}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={pending ? "animate-spin" : undefined}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </IconButton>
        </div>
      </div>

      <Link href={readerHref(verse.canonical)} className="group flex flex-col gap-2">
        <p
          className="text-[15px] leading-relaxed text-[color:var(--reader-fg)]"
          style={{ fontFamily: "var(--reader-serif)" }}
        >
          “{verse.text}”
        </p>
        <span className="self-end text-sm font-medium text-[color:var(--reader-muted)] transition-colors group-hover:text-[color:var(--reader-fg)]">
          {verse.canonical}
        </span>
      </Link>

      {noteOpen && (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder={`Note on ${verse.canonical}…`}
            className="w-full resize-y rounded-xl border border-[color:var(--reader-border)] bg-[var(--reader-bg)] px-3 py-2 text-sm leading-relaxed text-[color:var(--reader-fg)] outline-none focus:ring-2"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setNoteOpen(false);
                setNoteText("");
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[color:var(--reader-muted)] transition-colors hover:text-[color:var(--reader-fg)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNote}
              disabled={!noteText.trim()}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--reader-accent)" }}
            >
              Save note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
