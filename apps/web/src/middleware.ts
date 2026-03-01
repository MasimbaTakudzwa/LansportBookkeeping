import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/health"];

/**
 * Optional single-password protection.
 * Set APP_PASSWORD in your .env to enable. Leave blank to disable (open access).
 *
 * When enabled:
 * - All routes except PUBLIC_PATHS require a valid "lansport_auth" cookie.
 * - Unauthenticated requests are redirected to /login.
 * - API routes receive a 401 JSON response instead of a redirect.
 */
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;

  // Auth disabled — let everything through
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Also allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("lansport_auth")?.value;
  if (token === password) return NextResponse.next();

  // API routes: return 401
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pages: redirect to /login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
