import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Admin / overlord route protection middleware.
 *
 * NOTE: The app currently stores the auth token in localStorage via setToken()
 * in src/lib/api.ts. localStorage is not accessible in Edge middleware, so this
 * middleware cannot perform full token verification server-side.
 *
 * As a defence-in-depth measure, we redirect requests that carry no session
 * cookie at all. Authenticated users whose token lives only in localStorage
 * will pass through to the client-side auth guard in each admin page, which
 * handles the real enforcement. A future improvement is to mirror the token
 * into a HttpOnly cookie on login so middleware can verify it properly.
 *
 * Cookie name checked: 'artypot_session' — set this alongside the localStorage
 * token if/when server-side protection is needed.
 */

const PROTECTED_PREFIXES = ['/admin', '/overlord'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  // Check for a session cookie. This is a best-effort check; the real token
  // lives in localStorage and is enforced client-side. If the cookie is absent
  // we can safely redirect; if present, we let the client-side guard verify.
  const sessionCookie = request.cookies.get('artypot_session');
  if (!sessionCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    // Only pass `from` if it's a safe same-origin path (starts with '/', no '//')
    // to prevent open-redirect exploitation if this param is ever consumed post-login.
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/overlord/:path*'],
};
