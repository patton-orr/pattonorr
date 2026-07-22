import { getSetting, setSetting } from "@/lib/settings";

// Quick notes (single-user) stored in app_settings JSON — freeform jottings,
// optionally tied to a scripture reference (e.g. captured from the verse card).

const KEY = "notes.quick";

export type QuickNote = {
  id: string;
  ref: string | null;
  text: string;
  createdAt: string;
};

export async function getQuickNotes(): Promise<QuickNote[]> {
  const list = await getSetting<QuickNote[]>(KEY, []);
  return Array.isArray(list) ? list : [];
}

export async function addQuickNote(text: string, ref?: string | null) {
  const t = text.trim();
  if (!t) return;
  const note: QuickNote = {
    id: crypto.randomUUID(),
    ref: ref?.trim() || null,
    text: t.slice(0, 5000),
    createdAt: new Date().toISOString(),
  };
  const list = await getQuickNotes();
  await setSetting(KEY, [note, ...list]);
}

export async function removeQuickNote(id: string) {
  const list = await getQuickNotes();
  await setSetting(
    KEY,
    list.filter((n) => n.id !== id),
  );
}
