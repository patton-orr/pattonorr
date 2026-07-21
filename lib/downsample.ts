// Bucket a daily time series down to at most `maxPoints` points so long ranges
// (6mo / 1y) don't render hundreds of 1px marks. Numeric keys are averaged over
// each bucket; the bucket keeps a representative (mid) date. Returns the input
// unchanged when it's already short enough.
export function downsampleSeries<T extends { date: string }>(
  rows: T[],
  numericKeys: (keyof T)[],
  maxPoints = 92,
): { rows: T[]; downsampled: boolean } {
  if (rows.length <= maxPoints) return { rows, downsampled: false };
  const bucket = Math.ceil(rows.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < rows.length; i += bucket) {
    const slice = rows.slice(i, i + bucket);
    const agg = { ...slice[Math.floor(slice.length / 2)] } as T;
    for (const k of numericKeys) {
      const vals = slice
        .map((r) => r[k])
        .filter((v): v is T[keyof T] & number => typeof v === "number");
      (agg as Record<string, unknown>)[k as string] = vals.length
        ? (vals as number[]).reduce((a, b) => a + b, 0) / vals.length
        : null;
    }
    out.push(agg);
  }
  return { rows: out, downsampled: true };
}
