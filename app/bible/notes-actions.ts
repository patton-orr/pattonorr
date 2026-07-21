"use server";

import { auth } from "@/auth";
import {
  addHighlight,
  removeHighlight,
  setReflection,
  updateHighlight,
  HIGHLIGHT_COLORS,
  type Highlight,
  type HighlightColor,
} from "@/lib/bible";

// The reader manages notes optimistically in client state, so these actions
// just persist and return nothing. The whole site is login-gated, but actions
// are POST endpoints of their own, so re-check the session here too.
async function requireUser() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

const MAX_NOTE = 5000;
const MAX_QUOTE = 2000;
const MAX_REFLECTION = 20000;

function cleanColor(c: unknown): HighlightColor {
  return HIGHLIGHT_COLORS.includes(c as HighlightColor)
    ? (c as HighlightColor)
    : "yellow";
}

export async function addHighlightAction(ref: string, h: Highlight) {
  await requireUser();
  const start = Math.max(0, Math.floor(Number(h.start) || 0));
  const end = Math.max(start, Math.floor(Number(h.end) || 0));
  if (end === start) return;
  await addHighlight(ref, {
    id: String(h.id).slice(0, 64),
    start,
    end,
    quote: String(h.quote ?? "").slice(0, MAX_QUOTE),
    color: cleanColor(h.color),
    note: String(h.note ?? "").slice(0, MAX_NOTE),
    createdAt: new Date().toISOString(),
  });
}

export async function updateHighlightAction(
  ref: string,
  id: string,
  patch: { note?: string; color?: string },
) {
  await requireUser();
  const clean: { note?: string; color?: HighlightColor } = {};
  if (typeof patch.note === "string") clean.note = patch.note.slice(0, MAX_NOTE);
  if (patch.color !== undefined) clean.color = cleanColor(patch.color);
  await updateHighlight(ref, id, clean);
}

export async function removeHighlightAction(ref: string, id: string) {
  await requireUser();
  await removeHighlight(ref, id);
}

export async function setReflectionAction(ref: string, text: string) {
  await requireUser();
  await setReflection(ref, String(text ?? "").slice(0, MAX_REFLECTION));
}
