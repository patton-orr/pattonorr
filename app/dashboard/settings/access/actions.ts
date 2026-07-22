"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdmin, type SectionKey } from "@/lib/access-config";
import {
  getAllowlist,
  setAllowlist,
  setGuestSections,
  removeGuest,
} from "@/lib/access";

// Every action re-checks admin server-side — the UI is only shown to the admin,
// but these are POST endpoints of their own.
async function requireAdmin() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) throw new Error("Forbidden");
}

export async function addGuestAction(email: string) {
  await requireAdmin();
  const e = email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(e)) return;
  const list = await getAllowlist();
  if (!list.includes(e)) await setAllowlist([...list, e]);
  revalidatePath("/dashboard/settings/access");
}

export async function setGuestSectionsAction(
  email: string,
  sections: SectionKey[],
) {
  await requireAdmin();
  await setGuestSections(email, sections);
  revalidatePath("/dashboard/settings/access");
}

export async function removeGuestAction(email: string) {
  await requireAdmin();
  await removeGuest(email);
  revalidatePath("/dashboard/settings/access");
}
