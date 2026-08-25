/** Loose on purpose: the backend is the authority, this only catches typos. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Where to land after signing in. Only same-origin paths are honoured — a
 * `?redirect=` that points anywhere else is an open redirect.
 */
export function safeRedirect(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/** Adds the current location to a sign-in link, so the user comes back to it. */
export function withRedirect(href: string, pathname: string | null): string {
  if (!pathname || pathname === "/" || href.includes("?")) return href;
  return `${href}?redirect=${encodeURIComponent(pathname)}`;
}
