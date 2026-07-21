import { fetchPassageText } from "@/lib/esv";
import { verseOfTheDay } from "@/lib/bible";
import { VerseOfTheDayCard } from "./verse-of-the-day-card";

export async function VerseOfTheDay() {
  const ref = verseOfTheDay();
  const v = await fetchPassageText(ref);
  if (!v.ok) return null;
  return <VerseOfTheDayCard initial={{ ref, text: v.text, canonical: v.canonical }} />;
}
