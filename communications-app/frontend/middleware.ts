import { NextRequest, NextResponse } from 'next/server';
import { isRouteAllowed, getLandingPage } from '@/config/rbac/route-rules';
import type { UserRole } from '@/types/api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants';

// ─── Auth routes ──────────────────────────────────────────────────────────────
// Unauthenticated users may access these; authenticated users are redirected away.
const AUTH_PATH_PREFIX = '/auth/';

// Authenticated users with mustChangePassword=true must be able to reach this
// page. Since mustChangePassword is not in the JWT, we exempt the path globally.
// The page itself guards: non-authenticated → /auth/login, mustChange=false → landing.
const FORCE_PASSWORD_CHANGE_PATH = '/auth/change-password';

// ─── JWT decode ───────────────────────────────────────────────────────────────
// Decodes the payload from a JWT string (base64url, no signature verification).
// Middleware is a UX routing guard — real security is enforced by the backend.

interface JwtPayload {
  sub?: string;
  role?: string;
  exp?: number;
  type?: string;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64 → decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // ── Read session from cookie ────────────────────────────────────────────────
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const payload = token ? decodeJwtPayload(token) : null;

  // A valid session requires a decodable, non-expired JWT with a subject claim.
  // Role is NOT checked here — JWT doesn't carry role yet (DEC-008 A3.10 pending).
  // Layer 2 RBAC is enforced client-side until the JWT payload migration lands.
  const role = (payload?.role as UserRole | undefined) ?? null;
  const isAuthenticated =
    payload !== null &&
    !!payload.sub &&
    (payload.exp ?? 0) > Date.now() / 1000;

  // ── Auth routes (/auth/login, /auth/register, …) ────────────────────────────
  if (pathname.startsWith(AUTH_PATH_PREFIX)) {
    // Exception: /auth/change-password must stay accessible when the user is
    // authenticated but still has mustChangePassword=true. The middleware cannot
    // read that flag from the JWT, so we let the page guard itself.
    if (pathname === FORCE_PASSWORD_CHANGE_PATH) {
      console.log('[middleware] /auth/change-password — bypassing auth redirect, page handles own guard');
      return NextResponse.next();
    }

    // All other /auth/* routes: authenticated users are sent to their landing page.
    if (isAuthenticated) {
      const destination = role ? getLandingPage(role) : '/dashboard';
      console.log(`[middleware] authenticated on auth route → redirect to ${destination}`);
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  // ── Unauthenticated: redirect to login ─────────────────────────────────────
  if (!isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Route authorization (Layer 2) ──────────────────────────────────────────
  // Only enforced when role is present in the JWT. While DEC-008 A3.10 is
  // pending (JWT migration), role is null and client-side RBAC applies instead.
  if (role && !isRouteAllowed(role, pathname)) {
    return NextResponse.redirect(new URL(getLandingPage(role), request.url));
  }

  return NextResponse.next();
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
// Exclude Next.js internals, static assets, and API routes.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/|public/).*)'],
};
