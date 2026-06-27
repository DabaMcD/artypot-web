/**
 * Server-side pageview logging (called from src/proxy.ts middleware — never the
 * browser). Classifies a locale-stripped path into a tracked page, then fires a
 * secret-gated, fire-and-forget POST to the Laravel internal endpoint.
 *
 * The internal secret (INTERNAL_SHARED_SECRET) is a SERVER-ONLY env var — it
 * must never be exposed with a NEXT_PUBLIC_ prefix.
 */

import { KNOWN_PLATFORMS } from './platforms';

export type TrackedPageType = 'static' | 'bounty' | 'handle' | 'creator';

export interface TrackedPage {
  page_type: TrackedPageType;
  /** Numeric id (bounty/handle) or creator slug; omitted for static pages. */
  identifier?: string;
}

// Generally-accessible static pages we track. Must match config/pageviews.php.
// (Auth-gated pages like /dashboard, /settings, /billing, /c, /admin are NOT
// "generally accessible" and stay excluded via RESERVED_ROOTS below.)
const STATIC_PATHS = new Set([
  '/', '/about', '/tos', '/privacy', '/creator-tos', '/support', '/search',
  '/bounties', '/for-creators', '/login', '/register', '/forgot-password',
  '/reset-password',
]);

// First path segments that are NOT creator slugs (real app routes). This is an
// optimization to avoid pointless backend calls — the backend also validates
// that a single-segment path resolves to a real creator, so a missed entry here
// is dropped server-side, not mis-logged.
const RESERVED_ROOTS = new Set([
  'about', 'tos', 'privacy', 'support', 'search', 'bounties', 'h', 'c', 'admin',
  'obelisk', 'users', 'creators', 'login', 'register', 'dashboard', 'settings',
  'billing', 'history', 'backings', 'notifications', 'become-creator', 'oauth',
  'reset-password', 'forgot-password', 'verify-email',
  'creator-tos', 'email', 'marriage-autonomy-spectrum',
  'favicon.ico', 'robots.txt', 'sitemap.xml',
]);

const isNumericId = (s: string) => /^\d+$/.test(s);

/** Normalize: strip query/hash, ensure leading slash, drop trailing slash (except root). */
function normalize(path: string): string {
  let p = path.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

/** Classify a locale-stripped path → the tracked page, or null if not tracked. */
export function classifyTrackedPath(rawPath: string): TrackedPage | null {
  const path = normalize(rawPath);

  if (STATIC_PATHS.has(path)) return { page_type: 'static' };

  const seg = path.slice(1).split('/'); // path is "/..."; drop leading slash

  // /bounties/{id} — bounty detail (the /bounties listing is covered above).
  if (seg[0] === 'bounties' && seg.length === 2 && isNumericId(seg[1])) {
    return { page_type: 'bounty', identifier: seg[1] };
  }

  // /h/{id} — universal handle page by id.
  if (seg[0] === 'h' && seg.length === 2 && isNumericId(seg[1])) {
    return { page_type: 'handle', identifier: seg[1] };
  }

  // /{platform}/{username} — platform handle page. Platform names are reserved
  // against creator slugs, so a known platform in seg[0] is unambiguously a
  // handle page (e.g. /kick/someone), not a creator. Pass "platform/username"
  // for the backend to resolve.
  if (seg.length === 2 && KNOWN_PLATFORMS.has(seg[0])) {
    return { page_type: 'handle', identifier: `${seg[0]}/${seg[1]}` };
  }

  // /{slug} — creator profile. Exclude platforms (a bare /{platform} isn't a page).
  if (seg.length === 1 && seg[0] && !RESERVED_ROOTS.has(seg[0]) && !KNOWN_PLATFORMS.has(seg[0])) {
    return { page_type: 'creator', identifier: seg[0] };
  }

  // /{slug}/bounties — a creator's bounties list. Other 2-segment /{slug}/{x}
  // paths ARE the platform-handle route, which renders not-found for a
  // non-platform slug — so they're intentionally not tracked.
  if (seg.length === 2 && seg[1] === 'bounties' && seg[0] && !RESERVED_ROOTS.has(seg[0])) {
    return { page_type: 'creator', identifier: seg[0] };
  }

  return null;
}

interface LogPageViewArgs {
  page: TrackedPage;
  path: string;
  locale: string;
  ip: string;
  userAgent: string;
  /** Authenticated viewer's id, if logged in; null/omitted for anonymous views. */
  userId?: number | null;
}

/**
 * Fire-and-forget POST to the Laravel internal endpoint. Returns a promise the
 * caller should hand to `event.waitUntil(...)`. Never throws — logging must
 * never affect the page response.
 */
export async function logPageView({ page, path, locale, ip, userAgent, userId }: LogPageViewArgs): Promise<void> {
  const secret = process.env.INTERNAL_SHARED_SECRET;
  if (!secret) return; // not configured → no-op

  // Server-only base for this server-to-server call. Prefer INTERNAL_API_URL
  // (e.g. http://127.0.0.1:8000/v1) so the Next server reaches Laravel DIRECTLY
  // instead of hair-pinning out through the public domain / CDN — faster, and it
  // avoids a WAF/CDN blocking a non-browser request. NOT NEXT_PUBLIC_: this
  // address must never reach the browser. Falls back to the public base, then
  // the local dev default.
  const base =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8000/v1';

  try {
    await fetch(`${base}/internal/pageviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Internal-Secret': secret,
      },
      body: JSON.stringify({
        page_type: page.page_type,
        identifier: page.identifier ?? null,
        path,
        locale,
        ip,
        user_agent: userAgent,
        user_id: userId ?? null,
      }),
      // Don't let Next's fetch cache/dedupe this side-effect call.
      cache: 'no-store',
    });
  } catch {
    // Swallow — analytics must never break navigation.
  }
}
