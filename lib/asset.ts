/**
 * Resolve a public asset path. On Vercel the app is served from the root
 * domain, so this is effectively an identity helper; it stays in place so
 * assets referenced outside of `next/image` (e.g. <video>) have a single,
 * consistent source of truth if a base path is ever reintroduced.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}`;
}
