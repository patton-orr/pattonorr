"use server";

import { revalidatePath } from "next/cache";
import {
  addBookmark,
  removeBookmark,
  setActivePlan,
  togglePlanDay,
} from "@/lib/bible";

export async function saveBookmarkAction(ref: string) {
  await addBookmark(ref);
  revalidatePath("/dashboard/bible", "layout");
}

export async function removeBookmarkAction(ref: string) {
  await removeBookmark(ref);
  revalidatePath("/dashboard/bible", "layout");
}

export async function setActivePlanAction(id: string | null) {
  await setActivePlan(id);
  revalidatePath("/dashboard/bible/plan");
}

export async function togglePlanDayAction(id: string, day: number) {
  await togglePlanDay(id, day);
  revalidatePath("/dashboard/bible/plan");
}
