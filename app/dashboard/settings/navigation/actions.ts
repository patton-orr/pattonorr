"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/access-config";
import { setNavTopbarHidden } from "@/lib/settings";

export async function setTopbarHiddenAction(hidden: string[]) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) throw new Error("Forbidden");
  await setNavTopbarHidden(hidden);
  // Refresh every dashboard route so the nav updates immediately.
  revalidatePath("/dashboard", "layout");
}
