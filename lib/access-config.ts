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

// --- Nav ordering + dividers ---
//
// A nav order is a flat array of keys: section keys plus divider tokens
// ("divider:<id>"), so a separator is just another draggable position in the
// order. Sections missing from a saved order keep their default relative
// position at the end, so adding a section later needs no migration.

export const DIVIDER_PREFIX = "divider:";
export const isDividerKey = (key: string) => key.startsWith(DIVIDER_PREFIX);
export const newDividerKey = () =>
  `${DIVIDER_PREFIX}${Math.random().toString(36).slice(2, 8)}`;

export type NavSlot<T> =
  | { type: "entry"; key: string; entry: T }
  | { type: "divider"; key: string };

// Expand a stored order into slots, keeping every divider exactly where it sits.
// The settings editor uses this so a divider dragged to the end stays visible
// and draggable; the nav itself uses buildNavSlots, which tidies up first.
export function expandNavOrder<T extends { section: string }>(
  entries: T[],
  order: string[] | undefined,
): NavSlot<T>[] {
  const bySection = new Map(entries.map((e) => [e.section, e]));
  const slots: NavSlot<T>[] = [];
  const used = new Set<string>();

  for (const key of order ?? []) {
    if (isDividerKey(key)) {
      slots.push({ type: "divider", key });
      continue;
    }
    const entry = bySection.get(key);
    if (entry && !used.has(key)) {
      used.add(key);
      slots.push({ type: "entry", key, entry });
    }
  }
  // Anything the saved order didn't mention, in default order.
  for (const e of entries) {
    if (!used.has(e.section)) {
      slots.push({ type: "entry", key: e.section, entry: e });
    }
  }

  return slots;
}

// What the nav actually renders. Dividers that would land at the very start or
// end, or back to back — because the sections between them are hidden or not
// granted to this user — are dropped, so nobody sees a stray line with nothing
// around it.
export function buildNavSlots<T extends { section: string }>(
  entries: T[],
  order: string[] | undefined,
): NavSlot<T>[] {
  const slots = expandNavOrder(entries, order);
  return slots.filter((slot, i, all) => {
    if (slot.type !== "divider") return true;
    const hasBefore = all.slice(0, i).some((s) => s.type === "entry");
    const hasAfter = all.slice(i + 1).some((s) => s.type === "entry");
    if (!hasBefore || !hasAfter) return false; // leading / trailing
    return all[i + 1]?.type !== "divider"; // collapse consecutive runs
  });
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
