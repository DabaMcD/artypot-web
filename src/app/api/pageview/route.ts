import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { classifyTrackedPath, clientIpFromHeaders, logPageView } from '@/lib/pageview-tracking';

/**
 * Same-origin endpoint for client-side pageview pings (see PageviewTracker). The
 * App Router serves prefetched routes from the browser's router cache on click,
 * so soft navigations never reach the Next middleware — the browser reports them
 * here instead. Kept same-origin so the SERVER-only INTERNAL_SHARED_SECRET never
 * touches the client: this handler adds it (via logPageView) and forwards to
 * Laravel.
 *
 * It lives at /api/pageview, which the proxy matcher excludes, so it never
 * self-tracks. Abuse is bounded: cross-origin/non-browser callers are dropped
 * (Sec-Fetch-Site guard), the path is validated, the IP is read from headers
 * (not the body, so unspoofable by the page), and Laravel's throttle:pageviews
 * still caps per forwarded IP.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Only honour genuine same-origin browser fetches (our own page JS). Anything
  // else is silently ignored (200, no record) so it leaks nothing.
  if (request.headers.get('sec-fetch-site') !== 'same-origin') {
    return NextResponse.json({ ok: true });
  }

  let body: { path?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = typeof body.path === 'string' ? body.path : '';
  const page = classifyTrackedPath(path);
  if (!page) return NextResponse.json({ ok: true }); // untracked path → no-op

  const rawLocale = typeof body.locale === 'string' ? body.locale : '';
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;

  // Best-effort viewer id, same rule as the middleware: suppressed on 'app'
  // pages so private-page visits never become a per-user record.
  const uidRaw = request.cookies.get('artypot_uid')?.value;
  const userId = page.page_type === 'app'
    ? null
    : uidRaw && /^\d+$/.test(uidRaw) ? Number(uidRaw) : null;

  await logPageView({
    page,
    path,
    locale,
    ip: clientIpFromHeaders(request.headers),
    userAgent: request.headers.get('user-agent') ?? '',
    userId,
  });

  return NextResponse.json({ ok: true });
}
