"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { readerHref } from "@/lib/bible-books";
import { randomVerseAction } from "./faith/actions";

export type Verse = { ref: string; text: string; canonical: string };

const MOMENT_MS = 5 * 60 * 1000;

export function VerseOfTheDayCard({ initial }: { initial: Verse }) {
  const [verse, setVerse] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Mirror the current verse into a ref so the interval always excludes it.
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
        <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--reader-muted)]">
          Verse of the moment
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          aria-label="Show another verse"
          title="Show another verse"
          className="-m-1 rounded-full p-1 text-[color:var(--reader-muted)] transition-colors hover:text-[color:var(--reader-fg)] disabled:opacity-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={pending ? "animate-spin" : undefined}
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
      </div>
      <Link href={readerHref(verse.canonical)} className="group flex flex-col gap-3">
        <p
          className="text-lg leading-relaxed text-[color:var(--reader-fg)]"
          style={{ fontFamily: "var(--reader-serif)" }}
        >
          “{verse.text}”
        </p>
        <span className="text-sm font-medium text-[color:var(--reader-muted)] transition-colors group-hover:text-[color:var(--reader-fg)]">
          {verse.canonical} →
        </span>
      </Link>
    </div>
  );
}
