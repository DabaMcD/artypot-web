'use client';

import { useEffect } from 'react';

/**
 * Scrolls to and highlights the element whose id matches the URL hash.
 *
 * Implementation
 * --------------
 * A single setInterval at 250 ms. Polling covers every case — warm nav,
 * cold load, SPA navigation, URL-bar, back/forward, async DOM mounts after
 * auth resolves — without any event wiring. `apply()` is cheap enough that
 * 4× per second is fine.
 *
 * `apply()` is cheap (one getElementById, one classList check) and
 * idempotent — calling it 1× or 100× from different triggers produces
 * the same visible result.
 *
 * Two more details that matter
 * ----------------------------
 * • Class is applied to the wrapper `<div id="...">` itself, not its first
 *   child. Pages frequently swap their inner Card when async data resolves
 *   (e.g. /settings#email renders different Cards depending on whether the
 *   user has a verified email). The wrapper is stable; the Card is not.
 *
 * • After applying the class we re-scroll on the next 10 ticks (~1 s) using
 *   instant scroll. Pages load multiple async data sources after auth
 *   (notif settings, balances, etc.) — each one re-renders and shifts
 *   layout. Without re-scrolling, the user lands above or below the target
 *   even though the highlight fired. Instant scroll avoids fighting an
 *   in-flight smooth animation.
 */
export function HashHighlight() {
  useEffect(() => {
    let trackedHash = '';
    let highlightedEl: HTMLElement | null = null;
    let scrollTicksLeft = 0;

    const apply = () => {
      const hash = window.location.hash.slice(1);

      // Hash changed since last apply → clear previous, reset tracking.
      if (hash !== trackedHash) {
        if (highlightedEl) {
          highlightedEl.classList.remove('hash-highlighted');
          highlightedEl = null;
        }
        trackedHash = hash;
        scrollTicksLeft = 0;
      }
      if (!hash) return;

      const el = document.getElementById(hash);
      if (!el) return;

      const isNew = el !== highlightedEl || !el.classList.contains('hash-highlighted');

      if (isNew) {
        // Restart the keyframe animation: remove → reflow → re-add.
        el.classList.remove('hash-highlighted');
        void el.offsetWidth;
        el.classList.add('hash-highlighted');
        highlightedEl = el;
        // Re-scroll over the next ~1 s to absorb late layout shifts.
        scrollTicksLeft = 10;
      }

      if (scrollTicksLeft > 0) {
        // Instant scroll so repeated calls don't fight a smooth animation.
        el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
        scrollTicksLeft -= 1;
      }
    };

    const intervalId = window.setInterval(apply, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
