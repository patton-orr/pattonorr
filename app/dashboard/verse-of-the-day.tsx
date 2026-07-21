import { fetchPassageText } from "@/lib/esv";
import { verseOfTheMoment } from "@/lib/bible";
import { VerseOfTheDayCard } from "./verse-of-the-day-card";

export async function VerseOfTheDay() {
  const ref = verseOfTheMoment();
  const v = await fetchPassageText(ref);
  if (!v.ok) return null;
  return <VerseOfTheDayCard initial={{ ref, text: v.text, canonical: v.canonical }} />;
}
