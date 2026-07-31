import { describe, it, expect } from "vitest";
import { fmtDate, fmtEastern } from "./format";

describe("fmtDate", () => {
  it("reformats ISO YYYY-MM-DD to MM-DD-YYYY", () => {
    expect(fmtDate("2026-07-31")).toBe("07-31-2026");
  });
  it("returns undefined for empty input", () => {
    expect(fmtDate(undefined)).toBeUndefined();
    expect(fmtDate(null)).toBeUndefined();
    expect(fmtDate("")).toBeUndefined();
  });
  it("passes malformed input through unchanged", () => {
    expect(fmtDate("2026")).toBe("2026");
  });
});

describe("fmtEastern", () => {
  it("formats a UTC instant in US Eastern with the DST-correct zone", () => {
    // 2026-07-31 19:45Z is summer → EDT (UTC-4) → 3:45 PM.
    const out = fmtEastern("2026-07-31T19:45:00Z");
    expect(out).toContain("EDT");
    expect(out).toContain("3:45");
  });
  it("uses EST in winter", () => {
    // 2026-01-15 18:30Z is winter → EST (UTC-5) → 1:30 PM.
    const out = fmtEastern("2026-01-15T18:30:00Z");
    expect(out).toContain("EST");
    expect(out).toContain("1:30");
  });
  it("returns undefined for empty or invalid input", () => {
    expect(fmtEastern(null)).toBeUndefined();
    expect(fmtEastern("not-a-date")).toBeUndefined();
  });
});
