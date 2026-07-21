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
  // --- Genesis - Deuteronomy ---
  "Genesis 1:1", "Genesis 1:26-27", "Genesis 2:1-3", "Genesis 8:22", "Genesis 9:13-15",
  "Genesis 12:1-3", "Genesis 15:6", "Genesis 28:15", "Genesis 50:20", "Exodus 3:14",
  "Exodus 14:14", "Exodus 15:2", "Exodus 20:2-3", "Exodus 20:12", "Exodus 33:14",
  "Leviticus 19:18", "Numbers 6:24-26", "Numbers 23:19", "Deuteronomy 4:29", 
  "Deuteronomy 6:4-5", "Deuteronomy 7:9", "Deuteronomy 8:3", "Deuteronomy 10:12", 
  "Deuteronomy 28:1-2", "Deuteronomy 31:6", "Deuteronomy 31:8", "Deuteronomy 33:27",

  // --- Historical Books (Joshua - Esther) ---
  "Joshua 1:8", "Joshua 1:9", "Joshua 24:15", "Ruth 1:16", "1 Samuel 2:1-2", 
  "1 Samuel 12:24", "1 Samuel 15:22", "1 Samuel 16:7", "2 Samuel 7:22", 
  "2 Samuel 22:31-32", "1 Kings 8:56", "1 Chronicles 16:11", "1 Chronicles 29:11", 
  "2 Chronicles 7:14", "2 Chronicles 16:9", "2 Chronicles 20:15", "Ezra 8:22", 
  "Nehemiah 8:10", "Esther 4:14",

  // --- Psalms ---
  "Psalm 1:1-3", "Psalm 3:3", "Psalm 4:8", "Psalm 8:3-4", "Psalm 9:1", 
  "Psalm 16:8", "Psalm 16:11", "Psalm 18:2", "Psalm 19:1", "Psalm 19:14", 
  "Psalm 20:4", "Psalm 23:1-3", "Psalm 23:4", "Psalm 23:5-6", "Psalm 27:1", 
  "Psalm 27:4", "Psalm 27:14", "Psalm 28:7", "Psalm 30:5", "Psalm 31:24", 
  "Psalm 32:7", "Psalm 32:8", "Psalm 34:4", "Psalm 34:8", "Psalm 34:18", 
  "Psalm 37:4", "Psalm 37:5", "Psalm 37:23-24", "Psalm 40:1-2", "Psalm 42:1-2", 
  "Psalm 46:1", "Psalm 46:10", "Psalm 51:10", "Psalm 55:22", "Psalm 56:3", 
  "Psalm 61:2", "Psalm 62:1-2", "Psalm 63:1", "Psalm 73:26", "Psalm 84:11", 
  "Psalm 86:15", "Psalm 89:1", "Psalm 90:12", "Psalm 91:1-2", "Psalm 91:4", 
  "Psalm 91:11", "Psalm 94:19", "Psalm 95:1-2", "Psalm 100:1-3", "Psalm 100:4-5", 
  "Psalm 103:1-2", "Psalm 103:8", "Psalm 103:11-12", "Psalm 105:4", "Psalm 107:1", 
  "Psalm 118:14", "Psalm 118:24", "Psalm 119:9", "Psalm 119:11", "Psalm 119:105", 
  "Psalm 119:114", "Psalm 121:1-2", "Psalm 121:7-8", "Psalm 127:1", "Psalm 130:5", 
  "Psalm 133:1", "Psalm 136:1", "Psalm 138:8", "Psalm 139:13-14", "Psalm 139:23-24", 
  "Psalm 143:8", "Psalm 145:8-9", "Psalm 145:18", "Psalm 147:3", "Psalm 150:6",

  // --- Proverbs, Ecclesiastes, Song of Solomon ---
  "Proverbs 3:5-6", "Proverbs 3:9-10", "Proverbs 4:23", "Proverbs 9:10", 
  "Proverbs 11:25", "Proverbs 15:1", "Proverbs 16:3", "Proverbs 16:9", 
  "Proverbs 16:24", "Proverbs 17:17", "Proverbs 17:22", "Proverbs 18:10", 
  "Proverbs 19:21", "Proverbs 21:21", "Proverbs 22:6", "Proverbs 27:17", 
  "Proverbs 28:13", "Ecclesiastes 3:1-2", "Ecclesiastes 3:11", "Ecclesiastes 4:9-10", 
  "Song of Solomon 8:7",

  // --- Prophets (Isaiah - Malachi) ---
  "Isaiah 1:18", "Isaiah 9:6", "Isaiah 12:2", "Isaiah 26:3", "Isaiah 40:8", 
  "Isaiah 40:29", "Isaiah 40:31", "Isaiah 41:10", "Isaiah 41:13", "Isaiah 43:1-2", 
  "Isaiah 43:18-19", "Isaiah 53:5", "Isaiah 54:10", "Isaiah 54:17", "Isaiah 55:8-9", 
  "Isaiah 58:11", "Isaiah 61:1", "Jeremiah 17:7-8", "Jeremiah 29:11", 
  "Jeremiah 29:12-13", "Jeremiah 31:3", "Jeremiah 33:3", "Lamentations 3:22-23", 
  "Lamentations 3:24", "Ezekiel 36:26", "Daniel 12:3", "Hosea 6:3", "Joel 2:25", 
  "Amos 5:24", "Micah 6:8", "Micah 7:8", "Nahum 1:7", "Habakkuk 3:17-19", 
  "Zephaniah 3:17", "Haggai 2:9", "Zechariah 4:6", "Malachi 3:10",

  // --- Gospels (Matthew - John) ---
  "Matthew 4:4", "Matthew 5:3-4", "Matthew 5:14-16", "Matthew 5:44", "Matthew 6:9-13", 
  "Matthew 6:19-21", "Matthew 6:25-26", "Matthew 6:33", "Matthew 6:34", "Matthew 7:7-8", 
  "Matthew 7:12", "Matthew 11:28-30", "Matthew 18:20", "Matthew 19:26", 
  "Matthew 22:37-39", "Matthew 28:19-20", "Mark 8:36", "Mark 9:23", "Mark 10:27", 
  "Mark 11:24", "Mark 12:30-31", "Luke 1:37", "Luke 6:31", "Luke 6:38", 
  "Luke 9:23", "Luke 12:32", "Luke 19:10", "John 1:1-5", "John 1:12", "John 1:14", 
  "John 3:16-17", "John 4:24", "John 6:35", "John 8:12", "John 8:31-32", 
  "John 10:10", "John 10:27-28", "John 11:25-26", "John 13:34-35", "John 14:1-2", 
  "John 14:6", "John 14:15", "John 14:27", "John 15:5", "John 15:12-13", 
  "John 16:33", "John 20:29",

  // --- Acts & Romans ---
  "Acts 1:8", "Acts 2:38", "Acts 3:19", "Acts 4:12", "Acts 16:31", "Acts 20:24", 
  "Romans 1:16", "Romans 3:23", "Romans 5:1", "Romans 5:3-5", "Romans 5:8", 
  "Romans 6:23", "Romans 8:1-2", "Romans 8:28", "Romans 8:31", "Romans 8:37-39", 
  "Romans 10:9-10", "Romans 10:17", "Romans 12:1-2", "Romans 12:9-10", 
  "Romans 12:12", "Romans 12:18", "Romans 12:21", "Romans 15:13",

  // --- Pauline Epistles (1 Corinthians - Philemon) ---
  "1 Corinthians 2:9", "1 Corinthians 6:19-20", "1 Corinthians 10:13", 
  "1 Corinthians 10:31", "1 Corinthians 13:4-7", "1 Corinthians 13:13", 
  "1 Corinthians 15:58", "1 Corinthians 16:14", "2 Corinthians 1:3-4", 
  "2 Corinthians 4:16-18", "2 Corinthians 5:7", "2 Corinthians 5:17", 
  "2 Corinthians 5:21", "2 Corinthians 9:8", "2 Corinthians 12:9", 
  "Galatians 2:20", "Galatians 5:1", "Galatians 5:22-23", "Galatians 6:9", 
  "Ephesians 2:8-10", "Ephesians 3:20-21", "Ephesians 4:2-3", "Ephesians 4:26", 
  "Ephesians 4:32", "Ephesians 5:1-2", "Ephesians 6:10-11", "Philippians 1:6", 
  "Philippians 1:21", "Philippians 2:3-4", "Philippians 2:14-15", "Philippians 3:13-14", 
  "Philippians 4:4-5", "Philippians 4:6-7", "Philippians 4:8", "Philippians 4:13", 
  "Philippians 4:19", "Colossians 1:15-17", "Colossians 2:6-7", "Colossians 3:2", 
  "Colossians 3:12-14", "Colossians 3:15", "Colossians 3:17", "Colossians 3:23-24", 
  "1 Thessalonians 4:13-14", "1 Thessalonians 5:11", "1 Thessalonians 5:16-18", 
  "1 Thessalonians 5:23-24", "2 Thessalonians 3:3", "1 Timothy 2:5", "1 Timothy 4:12", 
  "1 Timothy 6:6-7", "1 Timothy 6:11-12", "2 Timothy 1:7", "2 Timothy 2:15", 
  "2 Timothy 3:16-17", "2 Timothy 4:7-8", "Titus 2:11-12", "Titus 3:5", "Philemon 1:6",

  // --- Hebrews & General Epistles (James - Jude) ---
  "Hebrews 4:12", "Hebrews 4:15-16", "Hebrews 10:23", "Hebrews 10:24-25", 
  "Hebrews 11:1", "Hebrews 11:6", "Hebrews 12:1-2", "Hebrews 12:14", 
  "Hebrews 13:5-6", "Hebrews 13:8", "Hebrews 13:15-16", "James 1:2-4", 
  "James 1:5", "James 1:12", "James 1:17", "James 1:19-20", "James 1:22", 
  "James 2:17", "James 4:7-8", "James 4:10", "James 5:16", "1 Peter 1:3", 
  "1 Peter 2:9", "1 Peter 3:15", "1 Peter 4:8", "1 Peter 5:6-7", "1 Peter 5:8-9", 
  "2 Peter 1:3-4", "2 Peter 3:9", "2 Peter 3:18", "1 John 1:7", "1 John 1:9", 
  "1 John 2:15-17", "1 John 3:1", "1 John 3:16", "1 John 3:18", "1 John 4:4", 
  "1 John 4:7-8", "1 John 4:18", "1 John 4:19", "1 John 5:11-12", "1 John 5:14-15", 
  "2 John 1:6", "3 John 1:4", "Jude 1:20-21", "Jude 1:24-25",

  // --- Revelation ---
  "Revelation 1:8", "Revelation 3:20", "Revelation 4:11", "Revelation 5:12", 
  "Revelation 7:16-17", "Revelation 12:11", "Revelation 21:3-4", "Revelation 21:5", 
  "Revelation 22:12-13", "Revelation 22:17", "Revelation 22:20-21"
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

// "Verse of the moment" — a deterministic rotation that advances every 5
// minutes, so a page load reflects the current window and the card can tick
// forward on a timer.
const MOMENT_MS = 5 * 60 * 1000;
export function verseOfTheMoment(now = Date.now()): string {
  const bucket = Math.floor(now / MOMENT_MS);
  return DAILY_VERSES[bucket % DAILY_VERSES.length];
}

// A random verse for the "refresh" affordance on the verse-of-the-day card.
// `exclude` avoids immediately repeating the verse already on screen.
export function randomVerse(exclude?: string): string {
  const pool = exclude
    ? DAILY_VERSES.filter((v) => v !== exclude)
    : DAILY_VERSES;
  const choices = pool.length ? pool : DAILY_VERSES;
  return choices[Math.floor(Math.random() * choices.length)];
}
