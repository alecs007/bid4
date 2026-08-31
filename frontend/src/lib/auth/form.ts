/** Loose on purpose: the backend is the authority, this only catches typos. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * A reserved name, so this can never resolve to somewhere that exists. Only used
 * as the origin to measure a candidate against.
 */
const PROBE_ORIGIN = "https://redirect.invalid";

/**
 * Only same-origin paths — a `?redirect=` pointing anywhere else is an open
 * redirect, and one that fires straight after a successful sign-in is the most
 * convincing kind: the reader really did just authenticate on the real site.
 *
 * <p>Resolved rather than pattern-matched. "Starts with a slash but not two" is
 * the obvious test and it is not enough: browsers fold a backslash into a
 * forward slash, so `/\evil.com` satisfies it and still leaves the site. Asking
 * the URL parser where a value actually lands is the only check that agrees with
 * what the browser will do with it.
 */
export function safeRedirect(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;

  let resolved: URL;
  try {
    resolved = new URL(value, PROBE_ORIGIN);
  } catch {
    return fallback;
  }

  if (resolved.origin !== PROBE_ORIGIN) return fallback;
  return resolved.pathname + resolved.search + resolved.hash;
}

/** Adds the current location to a sign-in link, so the user comes back to it. */
export function withRedirect(href: string, pathname: string | null): string {
  if (!pathname || pathname === "/" || href.includes("?")) return href;
  return `${href}?redirect=${encodeURIComponent(pathname)}`;
}
