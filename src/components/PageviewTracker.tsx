'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';

/**
 * Counts client-side (soft) navigations. The server middleware only sees real
 * document loads — a prefetched route is served from the browser's router cache
 * on click and never reaches the server — so the browser reports each real route
 * commit here.
 *
 * Fires only AFTER the initial mount (that first page is already counted
 * server-side as a document load) and never for a prefetch (prefetches don't
 * render, so usePathname never changes for them). Posts to the same-origin
 * /api/pageview handler, which holds the internal secret. Fire-and-forget.
 */
export function PageviewTracker() {
  const pathname = usePathname();
  const locale = useLocale();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // No-op when the path hasn't actually changed — this both skips the initial
    // mount (already counted server-side) and absorbs React strict-mode's
    // double-invoke (same path twice).
    if (lastPath.current === pathname) return;
    const isInitial = lastPath.current === null;
    lastPath.current = pathname;
    if (isInitial) return;

    fetch('/api/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, locale }),
      keepalive: true,
    }).catch(() => {
      // Swallow — analytics must never affect navigation.
    });
  }, [pathname, locale]);

  return null;
}
