export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PROBE_ORIGIN = "https://redirect.invalid";

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

export function withRedirect(href: string, pathname: string | null): string {
  if (!pathname || pathname === "/" || href.includes("?")) return href;
  return `${href}?redirect=${encodeURIComponent(pathname)}`;
}
