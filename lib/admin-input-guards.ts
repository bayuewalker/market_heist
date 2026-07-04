const BANNED_PHRASES = [
  "guaranteed profit",
  "guaranteed return",
  "guaranteed income",
  "passive income",
  "managed fund",
  "no loss",
  "risk-free",
  "risk free",
  "fixed return",
  "token promise",
  "nft speculation",
];

/**
 * Returns the first banned phrase found in `text` (case-insensitive), or
 * null — cross-cutting rule #1: no profit-guarantee/MLM-style framing
 * anywhere user-facing, including admin-editable persona copy.
 */
export function findBannedPhrase(text: string): string | null {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.find((phrase) => lower.includes(phrase)) ?? null;
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
