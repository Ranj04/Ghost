// You.com retrieval: turn a flaw into one concrete corrective drill with a real
// source. Server-only (uses YOUDOTCOM_API_KEY). Throws on failure so the caller
// can fall back to curated content.
import type { Drill, Flaw } from "../contracts";
import { buildQuery } from "./queries";

const YOUCOM_SEARCH_URL = "https://api.ydc-index.io/search";

interface YouHit {
  title?: string;
  url?: string;
  snippets?: string[];
  description?: string;
}

export function hasYouComKey(): boolean {
  return Boolean(process.env.YOUDOTCOM_API_KEY);
}

export async function retrieveDrill(flaw: Flaw): Promise<Drill> {
  const query = buildQuery(flaw);
  const res = await fetch(`${YOUCOM_SEARCH_URL}?query=${encodeURIComponent(query)}&num_web_results=3`, {
    headers: { "X-API-Key": process.env.YOUDOTCOM_API_KEY ?? "" },
  });
  if (!res.ok) throw new Error(`You.com search failed: ${res.status}`);
  const data = (await res.json()) as { hits?: YouHit[] };
  const hit = data.hits?.[0];
  if (!hit?.url) throw new Error("You.com returned no usable hit");

  const steps = (hit.snippets ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
  return {
    title: hit.title ?? `Drill to fix ${flaw.label}`,
    steps: steps.length ? steps : ["See the linked source for the full drill."],
    sourceUrl: hit.url,
    sourceTitle: hit.title ?? hit.url,
  };
}
