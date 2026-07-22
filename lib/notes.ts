import { getUserSetting, setUserSetting } from "@/lib/settings";
import { currentUserId } from "@/lib/current-user";

// Quick notes stored in app_settings JSON, namespaced per signed-in user —
// freeform jottings, optionally tied to a scripture reference (e.g. captured
// from the verse card).

const KEY = "notes.quick";

export type QuickNote = {
  id: string;
  ref: string | null;
  text: string;
  createdAt: string;
};

export async function getQuickNotes(): Promise<QuickNote[]> {
  const uid = await currentUserId();
  const list = await getUserSetting<QuickNote[]>(uid, KEY, []);
  return Array.isArray(list) ? list : [];
}

export async function addQuickNote(text: string, ref?: string | null) {
  const t = text.trim();
  if (!t) return;
  const uid = await currentUserId();
  const note: QuickNote = {
    id: crypto.randomUUID(),
    ref: ref?.trim() || null,
    text: t.slice(0, 5000),
    createdAt: new Date().toISOString(),
  };
  const list = await getUserSetting<QuickNote[]>(uid, KEY, []);
  await setUserSetting(uid, KEY, [note, ...list]);
}

export async function removeQuickNote(id: string) {
  const uid = await currentUserId();
  const list = await getUserSetting<QuickNote[]>(uid, KEY, []);
  await setUserSetting(
    uid,
    KEY,
    list.filter((n) => n.id !== id),
  );
}
