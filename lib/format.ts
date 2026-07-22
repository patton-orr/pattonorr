// 'YYYY-MM-DD' -> 'MM-DD-YYYY' for display. Storage/sorting stays ISO.
export function fmtDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}-${d}-${y}`;
}

// Format a timestamp in US Eastern time, with the correct abbreviation
// (EST / EDT chosen automatically by DST). e.g. "Jul 21, 3:45 PM EDT".
export function fmtEastern(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}
