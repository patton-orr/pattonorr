"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { addQuickNote, removeQuickNote } from "@/lib/notes";

// Quick notes on the Notes page. These share the per-user `notes.quick` store
// with the verse card's "add a note" affordance, so a note captured from
// scripture shows up here too (and vice-versa). Both revalidated below.

export async function addNoteAction(text: string) {
  const session = await auth();
  if (!session) return;
  await addQuickNote(text);
  revalidatePath("/dashboard/notes");
  revalidatePath("/dashboard/bible/saved");
}

export async function removeNoteAction(id: string) {
  const session = await auth();
  if (!session) return;
  await removeQuickNote(id);
  revalidatePath("/dashboard/notes");
  revalidatePath("/dashboard/bible/saved");
}
