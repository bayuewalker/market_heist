/**
 * Prefix a public asset path with the configured base path so it resolves
 * correctly both locally and under the GitHub Pages project sub-path.
 *
 * Use this for assets referenced outside of `next/image` (e.g. <video>, CSS
 * url()), since those do not get the base path applied automatically.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}`;
}
