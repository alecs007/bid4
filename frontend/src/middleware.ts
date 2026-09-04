import { NextResponse, type NextRequest } from "next/server";

/**
 * Sends people where they belong before a page renders.
 *
 * <p>This is a routing convenience, not a security control. Every endpoint
 * behind these pages authorises for itself; what this prevents is the flash of
 * a signed-out dashboard before the client works out it should have redirected.
 *
 * <p>It reads `bid4.session`, which the API sets alongside the refresh cookie.
 * That cookie carries a role and no token — the worst a forged one achieves is
 * rendering a page whose data the API then refuses. It is httpOnly, so the page
 * itself cannot read or write it either; the access token it replaced here was
 * in a cookie any script could take.
 *
 * <p>It deliberately does not check expiry. The session cookie lives as long as
 * the refresh token, which is the thing that actually says someone is signed
 * in — the fifteen-minute access token is expired for most of a session and
 * treating that as signed-out would bounce people out of their own account
 * every quarter of an hour.
 */

const SESSION_COOKIE = "bid4.session";

/**
 * Mirrors `USE_MOCK` in `lib/config`, read here rather than imported so the edge bundle stays a
 * single file.
 */
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

/** Areas that mean nothing without an account. */
const PRIVATE_PREFIXES = ["/cont"];

/** Areas that additionally need a staff role. */
const STAFF_PREFIXES = ["/operator", "/admin"];

/** Pages that only make sense when signed out. */
const GUEST_ONLY = ["/autentificare", "/inregistrare"];

export function middleware(request: NextRequest) {
  // The mock world signs people in inside the browser and there is no API to
  // set the cookie this reads, so every check below would come out "signed
  // out". Gating on it sent the demo deployment's whole account area to the
  // sign-in page, from which it came straight back.
  if (USE_MOCK) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  // Sign-out clears it by expiry, but a cookie present and empty is still no
  // session — the value is the role, and an empty role names nothing.
  const role = request.cookies.get(SESSION_COOKIE)?.value || null;

  const isPrivate = PRIVATE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isStaff = STAFF_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if ((isPrivate || isStaff) && !role) {
    const target = request.nextUrl.clone();
    target.pathname = "/autentificare";
    target.search = "";
    // Where they were going, so signing in finishes the journey they started
    // rather than dropping them on the homepage.
    target.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(target);
  }

  if (isStaff && role !== "OPERATOR" && role !== "ADMIN") {
    // Not found rather than forbidden: whether these areas exist is not
    // something an ordinary account needs confirmed.
    const target = request.nextUrl.clone();
    target.pathname = "/";
    target.search = "";
    return NextResponse.redirect(target);
  }

  if (role && GUEST_ONLY.some((prefix) => pathname.startsWith(prefix))) {
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
