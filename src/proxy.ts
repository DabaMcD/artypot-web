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

  // A request is a prefetch/prerender (NOT a real view) if it carries any
  // speculative-load signal. We skip these so the App Router prefetching every
  // <Link> in/near the viewport on load doesn't inflate the counts.
  //   - next-router-prefetch '1' (route-tree) / '2' (PPR), next-router-segment-prefetch
  //   - sec-purpose: the WEB-STANDARD header browsers attach to speculative
  //     loads ("prefetch" / "prefetch;prerender"). This was previously MISSED,
  //     which is why prefetched links were being logged as views.
  //   - purpose / x-purpose / x-middleware-prefetch: legacy / other engines
  const secPurpose = request.headers.get('sec-purpose') ?? '';
  const isPrefetch =
    request.headers.get('next-router-prefetch') !== null ||
    request.headers.get('next-router-segment-prefetch') !== null ||
    secPurpose.includes('prefetch') ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-purpose') === 'prefetch' ||
    request.headers.get('x-middleware-prefetch') === '1';

  // Diagnostic: with PAGEVIEW_DEBUG=1, log the prefetch signals + the decision
  // for every tracked GET, so any still-leaking prefetch variant is easy to spot.
  if (process.env.PAGEVIEW_DEBUG) {
    console.log('[pageview-prefetch-debug]', JSON.stringify({
      path: unprefixed,
      isPrefetch,
      'sec-purpose': request.headers.get('sec-purpose'),
      'next-router-prefetch': request.headers.get('next-router-prefetch'),
      'next-router-segment-prefetch': request.headers.get('next-router-segment-prefetch'),
      purpose: request.headers.get('purpose'),
      'x-purpose': request.headers.get('x-purpose'),
      'x-middleware-prefetch': request.headers.get('x-middleware-prefetch'),
      rsc: request.headers.get('rsc'),
      'sec-fetch-dest': request.headers.get('sec-fetch-dest'),
    }));
  }

  if (isPrefetch) return;

  // Skip locale (or any) redirect — the actual page render happens on the next hop.
  if (response && response.status >= 300 && response.status < 400) return;

  const page = classifyTrackedPath(unprefixed);
  if (!page) return;

  // Real client IP. Prefer the CDN/proxy's dedicated single-client-IP headers
  // (set by the edge, harder to spoof) before falling back to the left-most
  // X-Forwarded-For hop. An empty result means the backend can't attribute the
  // view to a distinct visitor, so it drops it rather than collapse everyone
  // onto the web server's IP — keep this list in sync with the host in front.
  const ip =
    request.headers.get('cf-connecting-ip') ||      // Cloudflare
    request.headers.get('true-client-ip') ||        // Akamai / Cloudflare Enterprise
    request.headers.get('x-real-ip') ||             // nginx
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '';
  // Diagnostic: set PAGEVIEW_DEBUG=1 to log the candidate client-IP headers for
  // each tracked request, so you can see which one (if any) the proxy in front
  // of this server actually forwards. Off by default; safe to leave in.
  if (process.env.PAGEVIEW_DEBUG) {
    console.log('[pageview-debug]', JSON.stringify({
      path: unprefixed,
      chosen_ip: ip,
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
      'true-client-ip': request.headers.get('true-client-ip'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
    }));
  }

  const locale = localePrefix ? localePrefix.slice(1) : routing.defaultLocale;

  // Best-effort viewer id from the non-httpOnly uid cookie (the bearer token
  // lives in localStorage, unreadable here). Digits-only guard; null if absent.
  const uidRaw = request.cookies.get('artypot_uid')?.value;
  const userId = uidRaw && /^\d+$/.test(uidRaw) ? Number(uidRaw) : null;

  event.waitUntil(
    logPageView({
      page,
      path: unprefixed,
      locale,
      ip,
      userAgent: request.headers.get('user-agent') ?? '',
      userId,
    }),
  );
}

export const config = {
  // Everything except API routes, the un-localized standalone route handlers
  // (`/marriage-autonomy-spectrum`, `/bad-apple` — both self-contained HTML docs
  // that need neither locale handling nor pageview tracking), Next internals,
  // and files with an extension.
  matcher: ['/((?!api|marriage-autonomy-spectrum|bad-apple|_next|_vercel|.*\\..*).*)'],
};
