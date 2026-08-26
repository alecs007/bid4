import { NextResponse, type NextRequest } from "next/server";

/**
 * Sends people where they belong before a page renders.
 *
 * <p>This is a routing convenience, not a security control. It reads the access
 * token from the cookie the browser mirrors it into, and that cookie is readable
 * by scripts by design — the httpOnly half is the refresh token, which is scoped
 * to /auth and never visible here. Anyone can forge what this reads. That is fine,
 * because every endpoint behind these pages authorises for itself; what this
 * prevents is the flash of a signed-out dashboard before the client works out it
 * should have redirected.
 *
 * <p>It deliberately does not check whether the token has expired. A fifteen-minute
 * access token is expired for most of a session; the refresh cookie is what says
 * someone is still signed in, and this cannot see it. Treating expiry as signed-out
 * would bounce people out of their own account every quarter of an hour.
 */

const TOKEN_COOKIE = "bid4.token";

/** Areas that mean nothing without an account. */
const PRIVATE_PREFIXES = ["/cont"];

/** Areas that additionally need a staff role. */
const STAFF_PREFIXES = ["/operator", "/admin"];

/** Pages that only make sense when signed out. */
const GUEST_ONLY = ["/autentificare", "/inregistrare"];

/**
 * The role claim, read without verifying the signature.
 *
 * <p>Verification would need the signing secret in the edge runtime, and it would
 * buy nothing: the decision here is which page to show, and the API refuses the
 * data regardless. A forged claim gets someone an empty staff page.
 */
function roleOf(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { role?: unknown };
    return typeof claims.role === "string" ? claims.role : null;
  } catch {
    // A token we cannot read is a token we treat as absent.
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  const isPrivate = PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isStaff = STAFF_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if ((isPrivate || isStaff) && !token) {
    const target = request.nextUrl.clone();
    target.pathname = "/autentificare";
    target.search = "";
    // Where they were going, so signing in finishes the journey they started
    // rather than dropping them on the homepage.
    target.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(target);
  }

  if (isStaff && token) {
    const role = roleOf(token);
    if (role !== "OPERATOR" && role !== "ADMIN") {
      // Not found rather than forbidden: whether these areas exist is not
      // something an ordinary account needs confirmed.
      const target = request.nextUrl.clone();
      target.pathname = "/";
      target.search = "";
      return NextResponse.redirect(target);
    }
  }

  if (token && GUEST_ONLY.some((prefix) => pathname.startsWith(prefix))) {
    const target = request.nextUrl.clone();
    target.pathname = "/";
    target.search = "";
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Everything except Next's own assets and files with an extension. Matching
   * those would run this on every image and font for no reason.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
