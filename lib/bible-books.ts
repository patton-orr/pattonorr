// Canonical book list with chapter counts — the backbone of the reader's
// navigation (book/chapter picker, prev/next across book boundaries, and
// turning a reference like "Philippians 4:13" into a reader URL).

export type Book = {
  name: string;
  slug: string;
  chapters: number;
  testament: "OT" | "NT";
};

const RAW: [string, number, "OT" | "NT"][] = [
  ["Genesis", 50, "OT"], ["Exodus", 40, "OT"], ["Leviticus", 27, "OT"],
  ["Numbers", 36, "OT"], ["Deuteronomy", 34, "OT"], ["Joshua", 24, "OT"],
  ["Judges", 21, "OT"], ["Ruth", 4, "OT"], ["1 Samuel", 31, "OT"],
  ["2 Samuel", 24, "OT"], ["1 Kings", 22, "OT"], ["2 Kings", 25, "OT"],
  ["1 Chronicles", 29, "OT"], ["2 Chronicles", 36, "OT"], ["Ezra", 10, "OT"],
  ["Nehemiah", 13, "OT"], ["Esther", 10, "OT"], ["Job", 42, "OT"],
  ["Psalms", 150, "OT"], ["Proverbs", 31, "OT"], ["Ecclesiastes", 12, "OT"],
  ["Song of Solomon", 8, "OT"], ["Isaiah", 66, "OT"], ["Jeremiah", 52, "OT"],
  ["Lamentations", 5, "OT"], ["Ezekiel", 48, "OT"], ["Daniel", 12, "OT"],
  ["Hosea", 14, "OT"], ["Joel", 3, "OT"], ["Amos", 9, "OT"],
  ["Obadiah", 1, "OT"], ["Jonah", 4, "OT"], ["Micah", 7, "OT"],
  ["Nahum", 3, "OT"], ["Habakkuk", 3, "OT"], ["Zephaniah", 3, "OT"],
  ["Haggai", 2, "OT"], ["Zechariah", 14, "OT"], ["Malachi", 4, "OT"],
  ["Matthew", 28, "NT"], ["Mark", 16, "NT"], ["Luke", 24, "NT"],
  ["John", 21, "NT"], ["Acts", 28, "NT"], ["Romans", 16, "NT"],
  ["1 Corinthians", 16, "NT"], ["2 Corinthians", 13, "NT"], ["Galatians", 6, "NT"],
  ["Ephesians", 6, "NT"], ["Philippians", 4, "NT"], ["Colossians", 4, "NT"],
  ["1 Thessalonians", 5, "NT"], ["2 Thessalonians", 3, "NT"], ["1 Timothy", 6, "NT"],
  ["2 Timothy", 4, "NT"], ["Titus", 3, "NT"], ["Philemon", 1, "NT"],
  ["Hebrews", 13, "NT"], ["James", 5, "NT"], ["1 Peter", 5, "NT"],
  ["2 Peter", 3, "NT"], ["1 John", 5, "NT"], ["2 John", 1, "NT"],
  ["3 John", 1, "NT"], ["Jude", 1, "NT"], ["Revelation", 22, "NT"],
];

const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, "-");

export const BOOKS: Book[] = RAW.map(([name, chapters, testament]) => ({
  name,
  slug: slugify(name),
  chapters,
  testament,
}));

export function bookBySlug(slug: string): Book | null {
  return BOOKS.find((b) => b.slug === slug) ?? null;
}

// The book is "Psalms" but references read "Psalm 23".
export function refFor(book: Book, chapter: number): string {
  const q = book.name === "Psalms" ? "Psalm" : book.name;
  return `${q} ${chapter}`;
}

type Neighbor = { slug: string; chapter: number; label: string } | null;

export function neighbors(
  slug: string,
  chapter: number,
): { prev: Neighbor; next: Neighbor } {
  const idx = BOOKS.findIndex((b) => b.slug === slug);
  if (idx < 0) return { prev: null, next: null };
  const b = BOOKS[idx];

  let prev: Neighbor = null;
  if (chapter > 1) {
    prev = { slug: b.slug, chapter: chapter - 1, label: refFor(b, chapter - 1) };
  } else if (idx > 0) {
    const pb = BOOKS[idx - 1];
    prev = { slug: pb.slug, chapter: pb.chapters, label: refFor(pb, pb.chapters) };
  }

  let next: Neighbor = null;
  if (chapter < b.chapters) {
    next = { slug: b.slug, chapter: chapter + 1, label: refFor(b, chapter + 1) };
  } else if (idx < BOOKS.length - 1) {
    const nb = BOOKS[idx + 1];
    next = { slug: nb.slug, chapter: 1, label: refFor(nb, 1) };
  }

  return { prev, next };
}

// Turn a reference ("John 3:16", "1 Corinthians 13", "Psalm 23") into a reader
// URL pointing at the containing chapter. Falls back to the reader home.
export function readerHref(ref: string): string {
  const trimmed = ref.trim();
  const lower = trimmed.toLowerCase();
  // Longest name first so "1 John" wins over "John", etc.
  const sorted = [...BOOKS].sort((a, b) => b.name.length - a.name.length);
  for (const b of sorted) {
    const names = b.name === "Psalms" ? ["Psalms", "Psalm"] : [b.name];
    for (const nm of names) {
      if (lower.startsWith(nm.toLowerCase())) {
        const m = trimmed.slice(nm.length).match(/\s*(\d+)/);
        if (m) {
          const ch = Math.min(Math.max(1, parseInt(m[1], 10)), b.chapters);
          return `/bible/${b.slug}/${ch}`;
        }
        return `/bible/${b.slug}/1`;
      }
    }
  }
  return "/bible";
}
