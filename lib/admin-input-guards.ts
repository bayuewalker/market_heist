const BANNED_PHRASES = [
  "guaranteed profit",
  "guaranteed return",
  "guaranteed income",
  "passive income",
  "managed fund",
  "no loss",
  "risk free",
  "fixed return",
  "token promise",
  "nft speculation",
];

// Collapses case, any hyphen/dash variant (ascii "-" through unicode dashes),
// and repeated whitespace down to a single space, so "guaranteed-profit",
// "Guaranteed   Profit", and "guaranteed‑profit" all normalize to the
// same "guaranteed profit" the banned-phrase list is written against —
// otherwise those formatting variants would silently bypass the gate.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-‐-―−]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_BANNED_PHRASES = BANNED_PHRASES.map((phrase) => [normalize(phrase), phrase] as const);

/**
 * Returns the first banned phrase found in `text` (case- and
 * formatting-insensitive), or null — cross-cutting rule #1: no
 * profit-guarantee/MLM-style framing anywhere user-facing, including
 * admin-editable persona copy.
 */
export function findBannedPhrase(text: string): string | null {
  const normalized = normalize(text);
  const match = NORMALIZED_BANNED_PHRASES.find(([needle]) => normalized.includes(needle));
  return match?.[1] ?? null;
}

/**
 * Validates an admin-supplied URL is http(s)-only before it's stored —
 * cross-cutting rule #14: any admin-written link/URL rendered on a
 * reachable page must be scheme-validated on write (and again, defensively,
 * on render). Returns the normalized URL, or null if `raw` is blank. Throws
 * if `raw` is non-empty but not a valid http(s) URL.
 */
export function validateHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("must be a valid http(s) URL");
  }
  return parsed.toString();
}
