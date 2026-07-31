import { describe, it, expect } from "vitest";
import {
  isAdmin,
  sectionForPath,
  isDividerKey,
  newDividerKey,
  expandNavOrder,
  buildNavSlots,
  ADMIN_EMAIL,
} from "./access-config";

describe("isAdmin", () => {
  it("matches the admin email exactly, case- and whitespace-insensitively", () => {
    expect(isAdmin(ADMIN_EMAIL)).toBe(true);
    expect(isAdmin("  PattonOrr@Gmail.com ")).toBe(true);
  });
  it("rejects everyone else and empty input", () => {
    expect(isAdmin("guest@example.com")).toBe(false);
    expect(isAdmin("")).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    // A near-miss must not pass.
    expect(isAdmin("pattonorr@gmail.com.evil.com")).toBe(false);
  });
});

describe("sectionForPath", () => {
  it("maps the dashboard root to home", () => {
    expect(sectionForPath("/dashboard")).toBe("home");
  });
  it("maps every /dashboard/whoop* path to health (regression: -revised)", () => {
    expect(sectionForPath("/dashboard/health")).toBe("health");
    expect(sectionForPath("/dashboard/whoop")).toBe("health");
    expect(sectionForPath("/dashboard/whoop-revised")).toBe("health");
    expect(sectionForPath("/dashboard/whoop/recovery")).toBe("health");
  });
  it("maps the reader and faith sub-routes to faith", () => {
    expect(sectionForPath("/dashboard/faith")).toBe("faith");
    expect(sectionForPath("/dashboard/bible/plan")).toBe("faith");
    expect(sectionForPath("/bible")).toBe("faith");
    expect(sectionForPath("/bible/john/3")).toBe("faith");
  });
  it("maps the remaining sections and settings", () => {
    expect(sectionForPath("/dashboard/school")).toBe("school");
    expect(sectionForPath("/dashboard/work")).toBe("work");
    expect(sectionForPath("/dashboard/personal")).toBe("personal");
    expect(sectionForPath("/dashboard/notes")).toBe("notes");
    expect(sectionForPath("/dashboard/ideas")).toBe("ideas");
    expect(sectionForPath("/dashboard/settings/access")).toBe("settings");
  });
  it("returns null for unknown paths", () => {
    expect(sectionForPath("/")).toBeNull();
    expect(sectionForPath("/dashboard/unknown")).toBeNull();
  });
});

describe("divider helpers", () => {
  it("recognizes and generates divider keys", () => {
    expect(isDividerKey("divider:abc123")).toBe(true);
    expect(isDividerKey("health")).toBe(false);
    const k = newDividerKey();
    expect(isDividerKey(k)).toBe(true);
    expect(newDividerKey()).not.toBe(newDividerKey());
  });
});

type E = { section: string };
const entries: E[] = [
  { section: "home" },
  { section: "health" },
  { section: "faith" },
];

describe("expandNavOrder", () => {
  it("returns default order when no order is saved", () => {
    const slots = expandNavOrder(entries, undefined);
    expect(slots.map((s) => (s.type === "entry" ? s.key : "|"))).toEqual([
      "home",
      "health",
      "faith",
    ]);
  });
  it("honors saved order, keeps dividers, and appends missing entries", () => {
    const slots = expandNavOrder(entries, ["faith", "divider:x", "home"]);
    expect(slots.map((s) => (s.type === "entry" ? s.key : "|"))).toEqual([
      "faith",
      "|",
      "home",
      "health", // not mentioned → appended in default order
    ]);
  });
  it("ignores duplicate/unknown section keys in the order", () => {
    const slots = expandNavOrder(entries, ["home", "home", "ghost"]);
    const keys = slots.filter((s) => s.type === "entry").map((s) => s.key);
    expect(keys).toEqual(["home", "health", "faith"]);
  });
});

describe("buildNavSlots", () => {
  it("drops leading and trailing dividers", () => {
    // All entries listed so none get appended after the trailing divider.
    const slots = buildNavSlots(entries, [
      "divider:a",
      "home",
      "health",
      "faith",
      "divider:b",
    ]);
    expect(slots.filter((s) => s.type === "divider")).toHaveLength(0);
  });
  it("collapses a run of consecutive dividers into one", () => {
    const slots = buildNavSlots(entries, [
      "home",
      "divider:a",
      "divider:b",
      "health",
    ]);
    expect(slots.filter((s) => s.type === "divider")).toHaveLength(1);
  });
  it("keeps a divider that sits between two entries", () => {
    const slots = buildNavSlots(entries, ["home", "divider:a", "health"]);
    expect(slots.map((s) => (s.type === "entry" ? s.key : "|"))).toEqual([
      "home",
      "|",
      "health",
      "faith",
    ]);
  });
});
