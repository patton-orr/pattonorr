"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { randomVerse } from "@/lib/bible";
import { fetchPassageText } from "@/lib/esv";
import { addQuickNote, removeQuickNote } from "@/lib/notes";

// Pick a fresh verse for the card's refresh button. Runs server-side so the
// ESV token never leaves the server. `exclude` is the ref currently shown, so
// a click always changes the verse.
export async function randomVerseAction(exclude?: string) {
  const ref = randomVerse(exclude);
  const v = await fetchPassageText(ref);
  if (!v.ok) return null;
  return { ref, text: v.text, canonical: v.canonical };
}

// Capture a quick note (optionally tied to a scripture ref) — used by the "add
// a note" affordance on the verse card. Surfaces on the Notes page.
export async function addQuickNoteAction(text: string, ref?: string | null) {
  const session = await auth();
  if (!session) return;
  await addQuickNote(text, ref ?? null);
  revalidatePath("/dashboard/bible/saved");
}

export async function removeQuickNoteAction(id: string) {
  const session = await auth();
  if (!session) return;
  await removeQuickNote(id);
  revalidatePath("/dashboard/bible/saved");
}
