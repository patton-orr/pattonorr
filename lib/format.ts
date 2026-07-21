// 'YYYY-MM-DD' -> 'MM-DD-YYYY' for display. Storage/sorting stays ISO.
export function fmtDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}-${d}-${y}`;
}
