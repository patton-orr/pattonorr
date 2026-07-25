"use client";

import { useRef, useState } from "react";

// A drag-to-reorder list. Uses Pointer Events (not HTML5 drag-and-drop) so it
// works with touch on iPhone/iPad as well as a mouse, and the handle is
// focusable with ArrowUp/ArrowDown for keyboard + accessibility.
//
// Row positions are measured from the DOM on drag start, so rows don't have to
// be a uniform height.

export type ReorderItem = { key: string; label: string };

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ReorderList({
  items,
  onChange,
  onCommit,
  renderRight,
}: {
  items: ReorderItem[];
  /** Live reorder — fires continuously while dragging. */
  onChange: (keys: string[]) => void;
  /** Persist — fires once the drag (or keyboard move) settles. */
  onCommit: (keys: string[]) => void;
  renderRight?: (key: string) => React.ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  // Midpoints of each row at drag start, used to pick the drop index.
  const midsRef = useRef<number[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function startDrag(e: React.PointerEvent, index: number) {
    const rows = listRef.current?.children;
    if (!rows) return;
    midsRef.current = Array.from(rows).map((r) => {
      const b = (r as HTMLElement).getBoundingClientRect();
      return b.top + b.height / 2;
    });
    // Capture on the handle itself — e.target may be the icon inside it.
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragKey(items[index].key);
    setDragIndex(index);
  }

  function onMove(e: React.PointerEvent) {
    if (dragIndex === null) return;
    const mids = midsRef.current;
    // Nearest row midpoint to the pointer wins.
    let target = 0;
    let best = Infinity;
    for (let i = 0; i < mids.length; i++) {
      const d = Math.abs(mids[i] - e.clientY);
      if (d < best) {
        best = d;
        target = i;
      }
    }
    if (target !== dragIndex) {
      // Reorder live so the list re-renders under the finger; the save waits
      // for pointer-up so a drag doesn't fire a request per pixel.
      onChange(move(items, dragIndex, target).map((i) => i.key));
      setDragIndex(target);
    }
  }

  function endDrag() {
    if (dragIndex === null) return;
    setDragKey(null);
    setDragIndex(null);
    onCommit(items.map((i) => i.key));
  }

  function onKey(e: React.KeyboardEvent, index: number) {
    const dir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    const to = Math.max(0, Math.min(items.length - 1, index + dir));
    if (to === index) return;
    const next = move(items, index, to).map((i) => i.key);
    onChange(next);
    onCommit(next);
  }

  return (
    <ul
      ref={listRef}
      className="divide-y divide-black/[.06] overflow-hidden rounded-2xl border border-black/[.08] dark:divide-white/[.08] dark:border-white/[.145]"
    >
      {items.map((it, i) => (
        <li
          key={it.key}
          className={`flex items-center gap-3 bg-white px-3 py-2.5 transition-shadow dark:bg-black ${
            dragKey === it.key ? "relative z-10 shadow-md" : ""
          }`}
        >
          <button
            type="button"
            aria-label={`Reorder ${it.label}. Use arrow keys to move.`}
            onPointerDown={(e) => startDrag(e, i)}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(e) => onKey(e, i)}
            className="shrink-0 cursor-grab touch-none rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-black/[.04] hover:text-zinc-700 active:cursor-grabbing dark:hover:bg-white/[.06] dark:hover:text-zinc-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="9" cy="6" r="1.6" />
              <circle cx="15" cy="6" r="1.6" />
              <circle cx="9" cy="12" r="1.6" />
              <circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="18" r="1.6" />
              <circle cx="15" cy="18" r="1.6" />
            </svg>
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-black dark:text-zinc-50">
            {it.label}
          </span>
          {renderRight?.(it.key)}
        </li>
      ))}
    </ul>
  );
}
