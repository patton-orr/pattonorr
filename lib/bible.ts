import { getSetting, setSetting } from "@/lib/settings";

// Bible state (single-user) stored in app_settings JSON: saved passages and
// reading-plan progress. No new tables needed.

// --- Saved passages ---

const BOOKMARKS_KEY = "bible.bookmarks";
export type Bookmark = { ref: string; savedAt: string };

export async function getBookmarks(): Promise<Bookmark[]> {
  return getSetting<Bookmark[]>(BOOKMARKS_KEY, []);
}

export async function addBookmark(ref: string) {
  const list = await getBookmarks();
  if (list.some((b) => b.ref === ref)) return;
  await setSetting(BOOKMARKS_KEY, [
    { ref, savedAt: new Date().toISOString() },
    ...list,
  ]);
}

export async function removeBookmark(ref: string) {
  const list = await getBookmarks();
  await setSetting(
    BOOKMARKS_KEY,
    list.filter((b) => b.ref !== ref),
  );
}

// --- Notes & highlights (per chapter) ---
//
// Two flavors, both scoped to a passage reference (e.g. "Psalm 2"):
//   1. Highlights — a colored span of text with an optional attached note.
//      Anchored by character offsets into the chapter's text. ESV content for a
//      ref is immutable and cached, so those offsets stay valid across reloads
//      and across devices.
//   2. Reflection — one free-form reflection on the passage as a whole.
//
// Stored one row per chapter (key `bible.notes:<ref>`) so a write only touches
// that chapter, and it stays plain JSON — portable, no new table.

export type Highlight = {
  id: string;
  start: number; // char offset into the chapter text (inclusive)
  end: number; // char offset (exclusive)
  quote: string; // the highlighted text, for the notes list + as a fallback label
  color: string; // one of HIGHLIGHT_COLORS
  note: string; // "" for a plain highlight
  createdAt: string;
};

export type ChapterNotes = { highlights: Highlight[]; reflection: string };

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

const EMPTY_NOTES: ChapterNotes = { highlights: [], reflection: "" };
const notesKey = (ref: string) => `bible.notes:${ref}`;

export async function getChapterNotes(ref: string): Promise<ChapterNotes> {
  const n = await getSetting<ChapterNotes>(notesKey(ref), EMPTY_NOTES);
  return {
    highlights: Array.isArray(n.highlights) ? n.highlights : [],
    reflection: typeof n.reflection === "string" ? n.reflection : "",
  };
}

async function mutateNotes(
  ref: string,
  fn: (n: ChapterNotes) => ChapterNotes,
) {
  const current = await getChapterNotes(ref);
  await setSetting(notesKey(ref), fn(current));
}

export async function addHighlight(ref: string, h: Highlight) {
  await mutateNotes(ref, (n) => ({
    ...n,
    // idempotent on id, and keep them ordered by position for a stable list
    highlights: [...n.highlights.filter((x) => x.id !== h.id), h].sort(
      (a, b) => a.start - b.start,
    ),
  }));
}

export async function updateHighlight(
  ref: string,
  id: string,
  patch: Partial<Pick<Highlight, "note" | "color">>,
) {
  await mutateNotes(ref, (n) => ({
    ...n,
    highlights: n.highlights.map((h) =>
      h.id === id ? { ...h, ...patch } : h,
    ),
  }));
}

export async function removeHighlight(ref: string, id: string) {
  await mutateNotes(ref, (n) => ({
    ...n,
    highlights: n.highlights.filter((h) => h.id !== id),
  }));
}

export async function setReflection(ref: string, text: string) {
  await mutateNotes(ref, (n) => ({ ...n, reflection: text }));
}

// --- Reading plans ---

export type Plan = {
  id: string;
  title: string;
  description: string;
  readings: string[]; // one passage reference per day
};

function chapters(book: string, n: number, from = 1): string[] {
  return Array.from({ length: n }, (_, i) => `${book} ${from + i}`);
}

export const PLANS: Plan[] = [
  {
    id: "gospels",
    title: "The Gospels",
    description: "Matthew through John — one chapter a day (89 days).",
    readings: [
      ...chapters("Matthew", 28),
      ...chapters("Mark", 16),
      ...chapters("Luke", 24),
      ...chapters("John", 21),
    ],
  },
  {
    id: "proverbs",
    title: "Proverbs in a Month",
    description: "One chapter of wisdom a day (31 days).",
    readings: chapters("Proverbs", 31),
  },
  {
    id: "psalms",
    title: "The Psalms",
    description: "One psalm a day (150 days).",
    readings: chapters("Psalm", 150),
  },
];

export function getPlan(id: string | null | undefined): Plan | null {
  return PLANS.find((p) => p.id === id) ?? null;
}

const PLAN_KEY = "bible.plans";
type PlanState = { active: string | null; progress: Record<string, number[]> };

export async function getPlanState(): Promise<PlanState> {
  return getSetting<PlanState>(PLAN_KEY, { active: null, progress: {} });
}

export async function setActivePlan(id: string | null) {
  const s = await getPlanState();
  const progress = { ...s.progress };
  if (id && !progress[id]) progress[id] = [];
  await setSetting(PLAN_KEY, { active: id, progress });
}

export async function togglePlanDay(id: string, day: number) {
  const s = await getPlanState();
  const done = new Set(s.progress[id] ?? []);
  if (done.has(day)) done.delete(day);
  else done.add(day);
  await setSetting(PLAN_KEY, {
    active: s.active,
    progress: { ...s.progress, [id]: [...done].sort((a, b) => a - b) },
  });
}

// --- Verse of the day ---

const DAILY_VERSES = [
  "John 3:16", "Psalm 23:1", "Philippians 4:6-7", "Romans 8:28",
  "Proverbs 3:5-6", "Isaiah 41:10", "Joshua 1:9", "Jeremiah 29:11",
  "Matthew 6:33", "Psalm 46:1", "Philippians 4:13", "Romans 12:2",
  "2 Corinthians 5:17", "Psalm 119:105", "Galatians 5:22-23",
  "Ephesians 2:8-9", "Hebrews 11:1", "1 Peter 5:7", "Psalm 27:1",
  "Isaiah 40:31", "Matthew 11:28", "John 14:6", "Psalm 118:24",
  "Lamentations 3:22-23", "Micah 6:8", "Colossians 3:23",
  "1 Thessalonians 5:16-18", "Psalm 34:8", "Deuteronomy 31:6",
  "Nahum 1:7", "2 Timothy 1:7", "Psalm 121:1-2",
];

export function verseOfTheDay(date = new Date()): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const today = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const dayOfYear = Math.floor((today - start) / 86_400_000);
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}
