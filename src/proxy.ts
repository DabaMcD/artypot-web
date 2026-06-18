import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

/**
 * Composed proxy (Next 16's renamed "middleware"): next-intl locale handling +
 * the original admin/obelisk session-cookie guard.
 *
 * The guard predates i18n and matched raw pathnames (`/admin/*`). Once routes
 * live under `[locale]`, a request to `/es/admin/...` carries the locale prefix,
 * so we strip it before the protection check — otherwise non-default locales
 * would silently lose server-side protection.
 *
 * The real token lives in localStorage (not readable in Edge), so this stays a
 * best-effort check: absent `artypot_session` cookie ⇒ redirect to login; the
 * client-side auth guard on each admin page does the real enforcement.
 */

const handleI18n = createMiddleware(routing);

const PROTECTED_PREFIXES = ['/admin', '/obelisk'];

// Non-default locale prefixes (default `en` is unprefixed under `as-needed`).
const LOCALE_PREFIX_RE = /^\/(es|eo|en-x-brainrot)(?=\/|$)/;

export function proxy(request: NextRequest) {
  // Let next-intl resolve the locale (redirect/rewrite + NEXT_LOCALE cookie).
  const i18nResponse = handleI18n(request);

  const { pathname } = request.nextUrl;
  const localePrefix = pathname.match(LOCALE_PREFIX_RE)?.[0] ?? '';
  const unprefixed = localePrefix ? pathname.slice(localePrefix.length) || '/' : pathname;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => unprefixed === p || unprefixed.startsWith(`${p}/`),
  );

  if (isProtected && !request.cookies.get('artypot_session')) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `${localePrefix}/login`;
    loginUrl.search = '';
    // Only pass `from` if it's a safe same-origin path (no protocol-relative `//`).
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return i18nResponse;
}

export const config = {
  // Everything except API routes, the un-localized `/marriage-autonomy-spectrum`
  // route handler, Next internals, and files with an extension.
  matcher: ['/((?!api|marriage-autonomy-spectrum|_next|_vercel|.*\\..*).*)'],
};
