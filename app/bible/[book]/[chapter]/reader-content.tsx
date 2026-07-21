"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { Highlight, HighlightColor } from "@/lib/bible";
import {
  addHighlightAction,
  removeHighlightAction,
  setReflectionAction,
  updateHighlightAction,
} from "../../notes-actions";

const COLORS: { key: HighlightColor; swatch: string }[] = [
  { key: "yellow", swatch: "var(--hl-yellow)" },
  { key: "green", swatch: "var(--hl-green)" },
  { key: "blue", swatch: "var(--hl-blue)" },
  { key: "pink", swatch: "var(--hl-pink)" },
];

// --- Offset helpers -------------------------------------------------------
// Highlights are anchored by character offset into the chapter's text. The
// coordinate space is "the concatenated data of every Text node in document
// order" — which is exactly what Range.toString() measures, so saving and
// restoring stay in lockstep. ESV content for a ref is immutable + cached, so
// the offsets stay valid across reloads and across devices.

function textOffset(root: Node, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  try {
    r.setEnd(node, offset);
  } catch {
    return 0;
  }
  return r.toString().length;
}

function isSkippable(node: Node, root: Node): boolean {
  let el = node.parentElement;
  while (el && el !== root) {
    if (el.matches(".verse-num, .chapter-num, .extra_text, .footnotes, .copyright"))
      return true;
    el = el.parentElement;
  }
  return false;
}

// Wrap the [start, end) run in <mark> elements (one per text node it crosses),
// skipping verse numbers and hidden bits so only scripture gets tinted.
function applyHighlight(root: HTMLElement, hl: Highlight) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segs: { node: Text; from: number; to: number }[] = [];
  let acc = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    const ns = acc;
    const ne = acc + len;
    acc = ne;
    const current = node;
    node = walker.nextNode() as Text | null;
    if (ne <= hl.start || ns >= hl.end) continue;
    if (isSkippable(current, root)) continue;
    const from = Math.max(0, hl.start - ns);
    const to = Math.min(len, hl.end - ns);
    if (to <= from) continue;
    segs.push({ node: current, from, to });
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const { node: t, from, to } = segs[i];
    try {
      const r = document.createRange();
      r.setStart(t, from);
      r.setEnd(t, to);
      const mark = document.createElement("mark");
      mark.dataset.hlId = hl.id;
      mark.dataset.c = hl.color;
      if (hl.note.trim()) mark.dataset.hasNote = "1";
      r.surroundContents(mark);
    } catch {
      /* a segment that can't be cleanly wrapped is skipped */
    }
  }
}

type Toolbar = {
  start: number;
  end: number;
  quote: string;
  x: number;
  y: number;
  below: boolean;
};

export function ReaderContent({
  refLabel,
  html,
  initialHighlights,
  initialReflection,
}: {
  refLabel: string;
  html: string;
  initialHighlights: Highlight[];
  initialReflection: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<Highlight[]>(() =>
    [...initialHighlights].sort((a, b) => a.start - b.start),
  );
  const [toolbar, setToolbar] = useState<Toolbar | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const editingHl = highlights.find((h) => h.id === editing) ?? null;

  // Inject the passage and paint highlights. The container is an empty div in
  // JSX (React manages nothing inside it), so a re-render can never wipe the
  // marks we add here by hand — this effect is the single owner of that DOM.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root.innerHTML = html;
    for (const hl of highlights) applyHighlight(root, hl);
  }, [html, highlights]);

  // Watch for a text selection inside the passage and float the toolbar.
  useEffect(() => {
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches;
    function onSelect() {
      const root = containerRef.current;
      const sel = window.getSelection();
      if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setToolbar(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) {
        setToolbar(null);
        return;
      }
      const quote = sel.toString().replace(/\s+/g, " ").trim();
      if (!quote) {
        setToolbar(null);
        return;
      }
      let s = textOffset(root, range.startContainer, range.startOffset);
      let e = textOffset(root, range.endContainer, range.endOffset);
      if (s > e) [s, e] = [e, s];
      if (e <= s) {
        setToolbar(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setToolbar({
        start: s,
        end: e,
        quote,
        x: rect.left + rect.width / 2,
        y: coarse ? rect.bottom + 12 : rect.top - 12,
        below: !!coarse,
      });
    }
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, []);

  // A stale toolbar (fixed viewport coords) should vanish on scroll.
  useEffect(() => {
    if (!toolbar) return;
    const clear = () => setToolbar(null);
    window.addEventListener("scroll", clear, true);
    return () => window.removeEventListener("scroll", clear, true);
  }, [toolbar]);

  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
  }

  function createHighlight(color: HighlightColor, openNote: boolean) {
    if (!toolbar) return;
    const overlap = highlights.find(
      (h) => toolbar.start < h.end && toolbar.end > h.start,
    );
    if (overlap) {
      clearSelection();
      openHighlight(overlap.id);
      return;
    }
    const hl: Highlight = {
      id: crypto.randomUUID(),
      start: toolbar.start,
      end: toolbar.end,
      quote: toolbar.quote.slice(0, 300),
      color,
      note: "",
      createdAt: new Date().toISOString(),
    };
    setHighlights((prev) => [...prev, hl].sort((a, b) => a.start - b.start));
    startTransition(() => {
      void addHighlightAction(refLabel, hl);
    });
    clearSelection();
    if (openNote) setEditing(hl.id);
  }

  function commitNote(id: string, note: string) {
    setHighlights((prev) =>
      prev.map((h) => (h.id === id ? { ...h, note } : h)),
    );
    startTransition(() => {
      void updateHighlightAction(refLabel, id, { note });
    });
  }

  function changeColor(id: string, color: HighlightColor) {
    setHighlights((prev) =>
      prev.map((h) => (h.id === id ? { ...h, color } : h)),
    );
    startTransition(() => {
      void updateHighlightAction(refLabel, id, { color });
    });
  }

  function deleteHighlight(id: string) {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    startTransition(() => {
      void removeHighlightAction(refLabel, id);
    });
    setEditing(null);
  }

  function openHighlight(id: string) {
    setEditing(id);
    requestAnimationFrame(() => {
      containerRef.current
        ?.querySelector(`mark[data-hl-id="${id}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function onContainerClick(e: ReactMouseEvent) {
    const mark = (e.target as HTMLElement).closest("mark[data-hl-id]");
    if (mark) {
      e.preventDefault();
      openHighlight((mark as HTMLElement).dataset.hlId!);
    }
  }

  // --- Reflection (autosaved) ---
  const [reflection, setReflection] = useState(initialReflection);
  const [reflSaved, setReflSaved] = useState(true);
  const reflTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function saveReflection(text: string) {
    startTransition(async () => {
      await setReflectionAction(refLabel, text);
      setReflSaved(true);
    });
  }
  function onReflectionChange(text: string) {
    setReflection(text);
    setReflSaved(false);
    if (reflTimer.current) clearTimeout(reflTimer.current);
    reflTimer.current = setTimeout(() => saveReflection(text), 800);
  }
  function flushReflection() {
    if (reflTimer.current) clearTimeout(reflTimer.current);
    if (!reflSaved) saveReflection(reflection);
  }

  const clampedX =
    typeof window !== "undefined" && toolbar
      ? Math.min(Math.max(toolbar.x, 96), window.innerWidth - 96)
      : (toolbar?.x ?? 0);

  return (
    <>
      {/* Empty container — the effect above owns its innerHTML + marks. */}
      <div ref={containerRef} className="esv" onClick={onContainerClick} />

      {/* Inline notes & reflection */}
      <section
        className="mt-12 border-t pt-7"
        style={{ borderColor: "var(--reader-border)" }}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2
            className="text-sm font-semibold tracking-wide uppercase"
            style={{ color: "var(--reader-muted)" }}
          >
            Notes &amp; reflection
          </h2>
          <span className="text-xs" style={{ color: "var(--reader-muted)" }}>
            {reflSaved ? "Saved" : "Saving…"}
          </span>
        </div>

        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: "var(--reader-muted)" }}
        >
          Reflection on {refLabel}
        </label>
        <textarea
          value={reflection}
          onChange={(e) => onReflectionChange(e.target.value)}
          onBlur={flushReflection}
          rows={4}
          placeholder="What is this passage saying? What stands out, and what will you carry with you?"
          className="w-full resize-y rounded-xl px-3.5 py-3 text-[0.95rem] leading-relaxed outline-none focus:ring-2"
          style={{
            background: "var(--reader-surface)",
            color: "var(--reader-fg)",
            border: "1px solid var(--reader-border)",
          }}
        />

        <div className="mt-6">
          <h3
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--reader-muted)" }}
          >
            Highlights &amp; notes
          </h3>
          {highlights.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {highlights.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => openHighlight(h.id)}
                    className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:brightness-[0.98]"
                    style={{ background: "var(--reader-surface)" }}
                  >
                    <span
                      aria-hidden
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ background: `var(--hl-${h.color})` }}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-[0.9rem] leading-snug"
                        style={{ color: "var(--reader-fg)" }}
                      >
                        “{h.quote}”
                      </span>
                      <span
                        className="mt-0.5 block text-[0.85rem] leading-snug"
                        style={{
                          color: h.note
                            ? "var(--reader-fg)"
                            : "var(--reader-muted)",
                          opacity: h.note ? 0.85 : 1,
                        }}
                      >
                        {h.note || "Add a note…"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="text-[0.9rem] leading-relaxed"
              style={{ color: "var(--reader-muted)" }}
            >
              Select any text above to highlight it — then attach a note.
              Highlights and reflections sync across your devices.
            </p>
          )}
        </div>
      </section>

      {/* Floating selection toolbar */}
      {toolbar && (
        <div
          className="fixed z-[55]"
          style={{
            left: clampedX,
            top: toolbar.y,
            transform: toolbar.below
              ? "translate(-50%, 0)"
              : "translate(-50%, -100%)",
          }}
        >
          <div
            // Keep the text selection alive when a button is pressed — otherwise
            // mousedown collapses it, selectionchange fires, and the toolbar
            // unmounts before the click can register.
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-1 rounded-full p-1 shadow-lg"
            style={{
              background: "var(--reader-surface)",
              border: "1px solid var(--reader-border)",
            }}
          >
            {COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => createHighlight(c.key, false)}
                aria-label={`Highlight ${c.key}`}
                className="h-8 w-8 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110 pointer-coarse:h-9 pointer-coarse:w-9 dark:ring-white/10"
                style={{ background: c.swatch }}
              />
            ))}
            <span
              aria-hidden
              className="mx-0.5 h-5 w-px"
              style={{ background: "var(--reader-border)" }}
            />
            <button
              type="button"
              onClick={() => createHighlight("yellow", true)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium"
              style={{ color: "var(--reader-fg)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Note
            </button>
          </div>
        </div>
      )}

      {editingHl && (
        <NoteEditor
          key={editingHl.id}
          hl={editingHl}
          onColor={(c) => changeColor(editingHl.id, c)}
          onDelete={() => deleteHighlight(editingHl.id)}
          onClose={(note) => {
            commitNote(editingHl.id, note);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function NoteEditor({
  hl,
  onColor,
  onDelete,
  onClose,
}: {
  hl: Highlight;
  onColor: (c: HighlightColor) => void;
  onDelete: () => void;
  onClose: (note: string) => void;
}) {
  const [draft, setDraft] = useState(hl.note);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(draft);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Note"
    >
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
        onClick={() => onClose(draft)}
      />
      <div
        className="relative flex w-full max-w-lg flex-col gap-4 rounded-t-2xl p-5 shadow-xl sm:rounded-2xl"
        style={{
          background: "var(--reader-surface)",
          color: "var(--reader-fg)",
          border: "1px solid var(--reader-border)",
        }}
      >
        <p
          className="border-l-2 pl-3 text-[0.9rem] leading-snug italic"
          style={{
            borderColor: `var(--hl-${hl.color})`,
            color: "var(--reader-fg)",
            opacity: 0.85,
          }}
        >
          “{hl.quote}”
        </p>

        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onColor(c.key)}
              aria-label={`Color ${c.key}`}
              aria-pressed={hl.color === c.key}
              className={`h-8 w-8 rounded-full transition-transform hover:scale-110 pointer-coarse:h-9 pointer-coarse:w-9 ${
                hl.color === c.key
                  ? "ring-2 ring-offset-2"
                  : "ring-1 ring-black/10 dark:ring-white/10"
              }`}
              style={{
                background: c.swatch,
                ...(hl.color === c.key
                  ? ({
                      "--tw-ring-color": "var(--reader-accent)",
                      "--tw-ring-offset-color": "var(--reader-surface)",
                    } as CSSProperties)
                  : {}),
              }}
            />
          ))}
        </div>

        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder="Write a note on this passage…"
          className="w-full resize-y rounded-xl px-3.5 py-3 text-[0.95rem] leading-relaxed outline-none focus:ring-2"
          style={{
            background: "var(--reader-bg)",
            color: "var(--reader-fg)",
            border: "1px solid var(--reader-border)",
          }}
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
          >
            Delete highlight
          </button>
          <button
            type="button"
            onClick={() => onClose(draft)}
            className="rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--reader-accent)", color: "#fff" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
