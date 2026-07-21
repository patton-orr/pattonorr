// Server-side ESV API client (api.esv.org). The token stays on the server;
// pages fetch through this and render the returned data.

const ESV_API = "https://api.esv.org/v3";

function token() {
  return process.env.ESV_API_TOKEN;
}

async function esvFetch(
  path: string,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const t = token();
  if (!t) return { ok: false, error: "ESV API token isn’t configured." };
  try {
    const res = await fetch(`${ESV_API}${path}`, {
      headers: { Authorization: `Token ${t}` },
      cache: "force-cache", // scripture is immutable — cache aggressively
    });
    if (!res.ok) return { ok: false, error: `ESV API error (${res.status}).` };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, error: "Couldn’t reach the ESV API." };
  }
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

// --- Passage (formatted HTML) ---

export async function fetchPassage(
  query: string,
): Promise<Result<{ canonical: string; html: string }>> {
  const params = new URLSearchParams({
    q: query,
    "include-passage-references": "true",
    "include-verse-numbers": "true",
    "include-first-verse-numbers": "true",
    "include-headings": "true",
    "include-footnotes": "false",
    "include-audio-link": "false",
    "include-short-copyright": "false",
    "include-copyright": "false",
  });
  const r = await esvFetch(`/passage/html/?${params.toString()}`);
  if (!r.ok) return { ok: false, error: r.error };
  const data = r.data as { canonical?: string; passages?: string[] };
  const html = (data.passages ?? []).join("").trim();
  if (!html) return { ok: false, error: `No passage found for “${query}”.` };
  return { ok: true, canonical: data.canonical || query, html };
}

// --- Passage (clean plain text, e.g. for a pull-quote) ---

export async function fetchPassageText(
  query: string,
): Promise<Result<{ canonical: string; text: string }>> {
  const params = new URLSearchParams({
    q: query,
    "include-verse-numbers": "false",
    "include-first-verse-numbers": "false",
    "include-headings": "false",
    "include-passage-references": "false",
    "include-footnotes": "false",
    "include-short-copyright": "false",
    "include-copyright": "false",
  });
  const r = await esvFetch(`/passage/text/?${params.toString()}`);
  if (!r.ok) return { ok: false, error: r.error };
  const data = r.data as { canonical?: string; passages?: string[] };
  const text = (data.passages ?? []).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, error: `No passage found for “${query}”.` };
  return { ok: true, canonical: data.canonical || query, text };
}

// --- Search ---

export type SearchHit = { reference: string; content: string };

export async function searchPassages(
  query: string,
): Promise<Result<{ results: SearchHit[]; total: number }>> {
  const params = new URLSearchParams({ q: query, "page-size": "20" });
  const r = await esvFetch(`/passage/search/?${params.toString()}`);
  if (!r.ok) return { ok: false, error: r.error };
  const data = r.data as { results?: SearchHit[]; total_results?: number };
  return { ok: true, results: data.results ?? [], total: data.total_results ?? 0 };
}
