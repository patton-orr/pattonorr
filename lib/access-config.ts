// Client-safe access constants — no DB imports, so the nav and content gating
// (client components) can use them. The DB-backed allowlist + permissions live
// in lib/access.ts (server only).

// You are the sole administrator. Hardcoded so an admin can never be locked out
// by data, and so this stays trustworthy independent of the database.
export const ADMIN_EMAIL = "pattonorr@gmail.com";

// Top-level sections a guest's access is configured against. Keys line up with
// the nav. Settings is admin-only and deliberately NOT part of this matrix.
export const SECTIONS = [
  { key: "home", label: "Home" },
  { key: "health", label: "Health" },
  { key: "faith", label: "Faith" },
  { key: "school", label: "School" },
  { key: "work", label: "Work" },
  { key: "personal", label: "Personal" },
  { key: "notes", label: "Notes" },
  { key: "ideas", label: "Ideas" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];

// Home is always available to a signed-in guest. Health is admin-only — it
// surfaces the owner's private WHOOP health data, which isn't per-user — so it's
// NOT grantable. The rest are grantable.
const NON_GRANTABLE = new Set<string>(["home", "health"]);
export const GRANTABLE_SECTIONS = SECTIONS.filter(
  (s) => !NON_GRANTABLE.has(s.key),
);

// Every top-level nav section (including admin-only Settings) — used by the
// setting that controls which of them appear on the horizontal top bar.
export const NAV_SECTIONS = [
  ...SECTIONS,
  { key: "settings", label: "Settings" },
] as const;

export function isAdmin(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}

// Map a pathname to its owning top-level section (for gating + highlighting).
// Health owns /dashboard/whoop; Faith owns /dashboard/bible + the /bible reader.
export function sectionForPath(
  pathname: string,
): SectionKey | "settings" | null {
  const is = (h: string) => pathname === h || pathname.startsWith(h + "/");
  if (pathname === "/dashboard") return "home";
  if (is("/dashboard/health") || is("/dashboard/whoop")) return "health";
  if (is("/dashboard/faith") || is("/dashboard/bible") || is("/bible"))
    return "faith";
  if (is("/dashboard/school")) return "school";
  if (is("/dashboard/work")) return "work";
  if (is("/dashboard/personal")) return "personal";
  if (is("/dashboard/notes")) return "notes";
  if (is("/dashboard/ideas")) return "ideas";
  if (is("/dashboard/settings")) return "settings";
  return null;
}
