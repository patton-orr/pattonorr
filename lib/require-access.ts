import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin, type SectionKey } from "@/lib/access-config";
import { allowedSections } from "@/lib/access";

// Server-side HARD gate for a gated route. Call at the top of a section's
// server component so a denied user never receives its RSC payload at all —
// the client-side guard in content-area.tsx only *hides* content after the
// server has already rendered and streamed it (fine as UX, useless as a
// privacy boundary). This is the enforcement AGENTS.md flagged as a TODO.
//
// Leaf module on purpose: it imports `auth` (which imports lib/access), and
// nothing but page components import this, so there's no import cycle.
export async function requireSection(
  section: SectionKey | "settings",
): Promise<void> {
  const email = (await auth())?.user?.email ?? undefined;
  // Not signed in — proxy.ts should have caught this, but fail closed.
  if (!email) redirect("/");
  // Admin sees everything; Settings is open to any signed-in user (its
  // admin-only panes redirect non-admins themselves).
  if (isAdmin(email) || section === "settings") return;
  const allowed = await allowedSections(email);
  if (!allowed.includes(section as SectionKey)) redirect("/dashboard");
}

// Admin-only hard gate for server actions / route handlers. Throws (rather than
// redirects) so callers can decide how to surface it. Mirrors the per-actions
// `requireAdmin` that several settings action modules had copied verbatim.
export async function requireAdmin(): Promise<void> {
  const email = (await auth())?.user?.email ?? undefined;
  if (!isAdmin(email)) throw new Error("Forbidden");
}
