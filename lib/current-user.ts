import { cache } from "react";
import { auth } from "@/auth";

// The identity used to scope personal data (bookmarks, highlights, notes,
// reading plans). Google email is the stable per-user id, normalized to lower
// case. `cache` dedupes the session read within a single server request.
export const currentUserId = cache(async (): Promise<string | null> => {
  const session = await auth();
  const email = session?.user?.email;
  return email ? email.trim().toLowerCase() : null;
});
