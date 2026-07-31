import { describe, it, expect } from "vitest";
import { downsampleSeries } from "./downsample";

type Row = { date: string; v: number | null };

const series = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
    v: i,
  }));

describe("downsampleSeries", () => {
  it("returns the input untouched when already short enough", () => {
    const rows = series(10);
    const out = downsampleSeries(rows, ["v"], 92);
    expect(out.downsampled).toBe(false);
    expect(out.rows).toBe(rows);
  });

  it("buckets long series down to at most maxPoints and averages numeric keys", () => {
    const rows = series(400);
    const out = downsampleSeries(rows, ["v"], 92);
    expect(out.downsampled).toBe(true);
    expect(out.rows.length).toBeLessThanOrEqual(92);
    // First bucket averages 0..(bucket-1); with 400/92 → bucket 5 → avg of 0..4 = 2.
    expect(out.rows[0].v).toBe(2);
  });

  it("yields null for a bucket with no numeric values", () => {
    const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({
      date: `2026-02-${String((i % 28) + 1).padStart(2, "0")}`,
      v: null,
    }));
    const out = downsampleSeries(rows, ["v"], 50);
    expect(out.downsampled).toBe(true);
    expect(out.rows.every((r) => r.v === null)).toBe(true);
  });
});
