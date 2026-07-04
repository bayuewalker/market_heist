/**
 * Validates a same-origin internal redirect target (e.g. a `?redirect=`
 * query param). Returns `null` when `target` is missing or would produce an
 * open redirect (protocol-relative or backslash-based), so callers can tell
 * "no explicit redirect" apart from "explicit redirect, sanitized" — an
 * unsafe param must never be silently treated as if it were explicit.
 */
export function safeRedirect(target: string | null | undefined): string | null {
  if (!target || !target.startsWith("/")) return null;
  if (target.startsWith("//") || target.startsWith("/\\")) return null;
  return target;
}
