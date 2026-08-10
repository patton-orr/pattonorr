import { fetchPassageText } from "@/lib/esv";
import { verseOfTheMoment } from "@/lib/bible";
import { getFaithHandwriting } from "@/lib/settings";
import { currentUserId } from "@/lib/current-user";
import { VerseOfTheDayCard } from "./verse-of-the-day-card";

export async function VerseOfTheDay() {
  const ref = verseOfTheMoment();
  const [v, handwriting] = await Promise.all([
    fetchPassageText(ref),
    currentUserId().then(getFaithHandwriting),
  ]);
  if (!v.ok) return null;
  return (
    <VerseOfTheDayCard
      initial={{ ref, text: v.text, canonical: v.canonical }}
      handwriting={handwriting}
    />
  );
}
