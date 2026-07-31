"use server";

import { revalidatePath } from "next/cache";
import {
  setNavMenuOrder,
  setNavTopbarHidden,
  setNavTopbarOrder,
} from "@/lib/settings";
import { requireAdmin } from "@/lib/require-access";

// Refresh every dashboard route so the nav updates immediately. The Bible
// reader renders the same nav from its own layout, so refresh that too.
function refreshNav() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/bible", "layout");
}

export async function setTopbarHiddenAction(hidden: string[]) {
  await requireAdmin();
  await setNavTopbarHidden(hidden);
  refreshNav();
}

export async function setMenuOrderAction(order: string[]) {
  await requireAdmin();
  await setNavMenuOrder(order);
  refreshNav();
}

export async function setTopbarOrderAction(order: string[]) {
  await requireAdmin();
  await setNavTopbarOrder(order);
  refreshNav();
}
