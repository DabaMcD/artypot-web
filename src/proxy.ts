import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { routing } from './i18n/routing';
import { classifyTrackedPath, logPageView } from './lib/pageview-tracking';

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

export function proxy(request: NextRequest, event: NextFetchEvent) {
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

  // Server-side pageview logging (admin analytics). Fire-and-forget so it never
  // blocks the response. Count real loads + soft navigations, but NOT link
  // prefetches, non-GET requests, or locale redirects (the redirected URL is
  // logged on its own follow-up request).
  maybeLogPageView(request, event, i18nResponse, unprefixed, localePrefix);

  return i18nResponse;
}

function maybeLogPageView(
  request: NextRequest,
  event: NextFetchEvent,
  response: Response,
  unprefixed: string,
  localePrefix: string,
): void {
  if (request.method !== 'GET') return;

  // Presence-based, not '=== "1"': the App Router sends next-router-prefetch
  // '1' (route-tree) or '2' (PPR) for prefetches, and next-router-segment-prefetch
  // for per-segment prefetches. (One residual case can't be detected by header:
  // a FetchStrategy.Full prefetch sends only the RSC header — but that path is
  // only taken by `<Link prefetch>` / dynamicOnHover, neither of which this app
  // uses; don't add `prefetch` to a Link pointing at a tracked page.)
  const isPrefetch =
    request.headers.get('next-router-prefetch') !== null ||
    request.headers.get('next-router-segment-prefetch') !== null ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-purpose') === 'prefetch' ||
    request.headers.get('x-middleware-prefetch') === '1';
  if (isPrefetch) return;

  // Skip locale (or any) redirect — the actual page render happens on the next hop.
  if (response && response.status >= 300 && response.status < 400) return;

  const page = classifyTrackedPath(unprefixed);
  if (!page) return;

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '';
  const locale = localePrefix ? localePrefix.slice(1) : routing.defaultLocale;

  event.waitUntil(
    logPageView({
      page,
      path: unprefixed,
      locale,
      ip,
      userAgent: request.headers.get('user-agent') ?? '',
    }),
  );
}

export const config = {
  // Everything except API routes, the un-localized `/marriage-autonomy-spectrum`
  // route handler, Next internals, and files with an extension.
  matcher: ['/((?!api|marriage-autonomy-spectrum|_next|_vercel|.*\\..*).*)'],
};
