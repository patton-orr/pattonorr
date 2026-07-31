import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory stand-in for the app_settings table so the access rules can be
// tested without a database.
const store: Record<string, unknown> = {};
vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(async (key: string, fallback: unknown) =>
    key in store ? store[key] : fallback,
  ),
  setSetting: vi.fn(async (key: string, value: unknown) => {
    store[key] = value;
  }),
}));

import {
  isAllowed,
  allowedSections,
  setAllowlist,
  getAllowlist,
  setGuestSections,
  getPermissions,
} from "./access";
import { ADMIN_EMAIL } from "./access-config";

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
});

describe("isAllowed", () => {
  it("always allows the admin, even with an empty allowlist", async () => {
    expect(await isAllowed(ADMIN_EMAIL)).toBe(true);
    expect(await isAllowed(" PattonOrr@Gmail.com ")).toBe(true);
  });
  it("allows a guest only when on the allowlist", async () => {
    expect(await isAllowed("guest@example.com")).toBe(false);
    store["access.allowlist"] = ["guest@example.com"];
    expect(await isAllowed("GUEST@example.com")).toBe(true);
  });
  it("rejects empty input", async () => {
    expect(await isAllowed(null)).toBe(false);
    expect(await isAllowed("")).toBe(false);
  });
});

describe("setAllowlist", () => {
  it("lowercases, trims, dedupes, drops invalids and the admin", async () => {
    await setAllowlist([
      " Guest@Example.com ",
      "guest@example.com",
      ADMIN_EMAIL,
      "not-an-email",
    ]);
    expect(await getAllowlist()).toEqual(["guest@example.com"]);
  });
});

describe("allowedSections", () => {
  it("gives the admin every section", async () => {
    const s = await allowedSections(ADMIN_EMAIL);
    expect(s).toContain("home");
    expect(s).toContain("health");
    expect(s).toContain("faith");
  });
  it("gives a guest home plus granted sections, dropping non-grantable ones", async () => {
    store["access.permissions"] = {
      "guest@example.com": ["faith", "health", "notes"],
    };
    const s = await allowedSections("guest@example.com");
    expect(s).toContain("home");
    expect(s).toContain("faith");
    expect(s).toContain("notes");
    // health is non-grantable and must be stripped even if it lingers in data.
    expect(s).not.toContain("health");
  });
  it("returns nothing for an anonymous user", async () => {
    expect(await allowedSections(null)).toEqual([]);
  });
});

describe("setGuestSections", () => {
  it("keeps only valid, grantable sections", async () => {
    await setGuestSections("guest@example.com", [
      "faith",
      "health", // non-grantable → dropped
      "bogus" as never,
      "notes",
    ]);
    const perms = await getPermissions();
    expect(perms["guest@example.com"]).toEqual(["faith", "notes"]);
  });
});
