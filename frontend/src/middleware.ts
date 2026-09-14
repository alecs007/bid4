import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "bid4.session";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const PRIVATE_PREFIXES = ["/cont"];

const STAFF_PREFIXES = ["/operator", "/admin"];

const GUEST_ONLY = ["/autentificare", "/inregistrare"];

export function middleware(request: NextRequest) {
  if (USE_MOCK) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const role = request.cookies.get(SESSION_COOKIE)?.value || null;

  const isPrivate = PRIVATE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isStaff = STAFF_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if ((isPrivate || isStaff) && !role) {
    const target = request.nextUrl.clone();
    target.pathname = "/autentificare";
    target.search = "";
    target.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(target);
  }

  if (isStaff && role !== "OPERATOR" && role !== "ADMIN") {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
