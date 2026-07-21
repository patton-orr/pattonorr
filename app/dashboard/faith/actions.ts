"use server";

import { randomVerse } from "@/lib/bible";
import { fetchPassageText } from "@/lib/esv";

// Pick a fresh verse for the card's refresh button. Runs server-side so the
// ESV token never leaves the server. `exclude` is the ref currently shown, so
// a click always changes the verse.
export async function randomVerseAction(exclude?: string) {
  const ref = randomVerse(exclude);
  const v = await fetchPassageText(ref);
  if (!v.ok) return null;
  return { ref, text: v.text, canonical: v.canonical };
}
