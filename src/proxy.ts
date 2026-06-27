import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { routing } from './i18n/routing';
import { classifyTrackedPath, logPageView, shouldCountView } from './lib/pageview-tracking';

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

  // Count a view ONLY for a real page hit — a top-level document load or a
  // genuine App-Router soft navigation — never a speculative prefetch/prerender
  // (the App Router prefetches every in-viewport <Link> on load). shouldCountView
  // is a fail-CLOSED allowlist on Sec-Fetch-* / RSC semantics (pageview-tracking.ts).
  const counts = shouldCountView(request.headers);

  // Diagnostic: with PAGEVIEW_DEBUG=1, log the decision + the signals it rests on
  // for every tracked GET, so any mis-decision is easy to spot.
  if (process.env.PAGEVIEW_DEBUG) {
    console.log('[pageview-prefetch-debug]', JSON.stringify({
      path: unprefixed,
      counts,
      'sec-fetch-mode': request.headers.get('sec-fetch-mode'),
      'sec-fetch-dest': request.headers.get('sec-fetch-dest'),
      rsc: request.headers.get('rsc'),
      'sec-purpose': request.headers.get('sec-purpose'),
      'next-router-prefetch': request.headers.get('next-router-prefetch'),
      'next-router-segment-prefetch': request.headers.get('next-router-segment-prefetch'),
      'x-middleware-prefetch': request.headers.get('x-middleware-prefetch'),
    }));
  }

  if (!counts) return;

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
  // Suppressed for 'app' (authenticated) pages: pairing a real user with a
  // private page like /billing or /c/tax would build a per-user behavioral
  // record, contrary to the hashed-aggregate privacy posture. (The backend
  // enforces the same suppression, so this is defence-in-depth.)
  const uidRaw = request.cookies.get('artypot_uid')?.value;
  const userId = page.page_type === 'app'
    ? null
    : uidRaw && /^\d+$/.test(uidRaw) ? Number(uidRaw) : null;

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
