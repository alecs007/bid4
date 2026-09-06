import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Where the browser is allowed to reach the API. The same value the client
 * builds its requests from, so a deployment that moves the backend does not
 * silently have its own calls refused by its own policy.
 */
const apiOrigin = (() => {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";
  try {
    return new URL(configured).origin;
  } catch {
    return "http://localhost:8080";
  }
})();

/**
 * The content policy.
 *
 * <p>`script-src` carries `unsafe-inline`, and that is a real weakness rather
 * than an oversight: Next hydrates through inline scripts, and locking them down
 * needs a per-request nonce, which needs the policy to move into middleware and
 * every response to become uncacheable. Worth doing, not worth pretending is
 * already done. What is here still closes the openings that do not depend on
 * script injection at all — a page framed by somebody else, a rewritten `<base>`
 * turning every relative link, a form quietly posting somewhere new, a plugin
 * embedded in the document.
 *
 * <p>`img-src` carries the API's own origin, which is where a listing's
 * photographs are served from: they are stored in a bucket with no anonymous
 * policy and handed out by the API at a stable `/media/{id}`, so the host that
 * serves them is the same one the app talks to. Over plain http in development
 * that origin is not covered by `https:`, and without it every uploaded
 * photograph is blocked by the page's own policy.
 */
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is React Refresh; it is not sent in a production build.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https: ${apiOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/**
 * Sent on every document. None of these replace what the API enforces for
 * itself; they close the browser-side openings the API cannot see.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Belt and braces with frame-ancestors, for anything that predates CSP.
  { key: "X-Frame-Options", value: "DENY" },
  // A response typed text/plain must never be executed as a script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // A listing URL can name what somebody is selling; it does not travel to
  // another site in full.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here asks for hardware, so nothing is granted it.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Every document. Static assets under _next carry their own caching and
        // gain nothing from a policy about framing.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
