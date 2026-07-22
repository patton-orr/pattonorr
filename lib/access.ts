import { getSetting, setSetting } from "@/lib/settings";
import {
  ADMIN_EMAIL,
  GRANTABLE_SECTIONS,
  isAdmin,
  SECTIONS,
  type SectionKey,
} from "@/lib/access-config";

// Guest access, backed by app_settings (portable JSON, no new table):
//   access.allowlist   — string[] of guest emails allowed to sign in
//   access.permissions — { [email]: SectionKey[] } sections each guest may see
// The admin (ADMIN_EMAIL) is implicit everywhere and never stored here.

const ALLOWLIST_KEY = "access.allowlist";
const PERMISSIONS_KEY = "access.permissions";

const norm = (e: string) => e.trim().toLowerCase();
const isEmail = (e: string) => /.+@.+\..+/.test(e);

export async function getAllowlist(): Promise<string[]> {
  const l = await getSetting<string[]>(ALLOWLIST_KEY, []);
  return Array.isArray(l) ? l.map(norm) : [];
}

export async function setAllowlist(list: string[]) {
  const clean = [
    ...new Set(list.map(norm).filter((e) => isEmail(e) && e !== ADMIN_EMAIL)),
  ];
  await setSetting(ALLOWLIST_KEY, clean);
}

export async function getPermissions(): Promise<Record<string, SectionKey[]>> {
  const p = await getSetting<Record<string, SectionKey[]>>(PERMISSIONS_KEY, {});
  return p && typeof p === "object" ? p : {};
}

export async function setGuestSections(email: string, sections: SectionKey[]) {
  const valid = new Set<SectionKey>(GRANTABLE_SECTIONS.map((s) => s.key));
  const clean = [...new Set(sections.filter((s) => valid.has(s)))];
  const p = await getPermissions();
  p[norm(email)] = clean;
  await setSetting(PERMISSIONS_KEY, p);
}

export async function removeGuest(email: string) {
  const e = norm(email);
  await setAllowlist((await getAllowlist()).filter((x) => x !== e));
  const p = await getPermissions();
  delete p[e];
  await setSetting(PERMISSIONS_KEY, p);
}

// The login gate: admin always; otherwise must be on the allowlist.
export async function isAllowed(email?: string | null): Promise<boolean> {
  if (!email) return false;
  if (isAdmin(email)) return true;
  return (await getAllowlist()).includes(norm(email));
}

// Which sections a user may see. Admin = all; guest = home + whatever's granted.
export async function allowedSections(
  email?: string | null,
): Promise<SectionKey[]> {
  if (isAdmin(email)) return SECTIONS.map((s) => s.key);
  if (!email) return [];
  // Only ever honor sections that are actually grantable (drops any stale
  // non-grantable grant like "health" that may linger in stored permissions).
  const grantable = new Set<SectionKey>(GRANTABLE_SECTIONS.map((s) => s.key));
  const granted = ((await getPermissions())[norm(email)] ?? []).filter((s) =>
    grantable.has(s),
  );
  return [...new Set<SectionKey>(["home", ...granted])];
}
