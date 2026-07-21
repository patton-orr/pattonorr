// Server-side ESV API client (api.esv.org). The token stays on the server;
// pages fetch through this and render the returned HTML.

const ESV_API = "https://api.esv.org/v3";

type PassageResult =
  | { ok: true; canonical: string; html: string }
  | { ok: false; error: string };

export async function fetchPassage(query: string): Promise<PassageResult> {
  const token = process.env.ESV_API_TOKEN;
  if (!token) return { ok: false, error: "ESV API token isn’t configured." };

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

  let res: Response;
  try {
    res = await fetch(`${ESV_API}/passage/html/?${params.toString()}`, {
      headers: { Authorization: `Token ${token}` },
      cache: "force-cache", // scripture text is immutable — cache aggressively
    });
  } catch {
    return { ok: false, error: "Couldn’t reach the ESV API." };
  }

  if (!res.ok) return { ok: false, error: `ESV API error (${res.status}).` };

  const data = (await res.json()) as {
    canonical?: string;
    passages?: string[];
  };
  const html = (data.passages ?? []).join("").trim();
  if (!html) return { ok: false, error: `No passage found for “${query}”.` };
  return { ok: true, canonical: data.canonical || query, html };
}
