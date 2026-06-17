'use client';

import { useCallback, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/**
 * An in-page anchor that *smoothly* scrolls to its hash target instead of the
 * browser's instant jump — so the reader sees the sections they scroll past
 * rather than being teleported to the destination.
 *
 * Deliberately does NOT write the hash to the URL. HashHighlight (mounted
 * globally in Providers.tsx) polls `window.location.hash` every 250 ms and, on
 * a match, re-scrolls with *instant* behavior for ~1 s to absorb async layout
 * shifts. If we set the hash here, that instant re-scroll would fire
 * mid-animation and snap the page to the target — exactly the jump we're trying
 * to avoid. Leaving the hash untouched keeps HashHighlight dormant so the
 * smooth scroll can play out. (Trade-off: the click isn't deep-linkable, which
 * is fine for a "skip down to…" affordance.)
 *
 * Vertical landing position is governed by the global `[id] { scroll-margin-top }`
 * rule, which `scrollIntoView` honors, so the target clears the sticky header.
 *
 * Falls back to native behavior for non-hash hrefs, a missing target, or
 * modified/new-tab clicks, and honors `prefers-reduced-motion`.
 */
export function SmoothHashLink({
  href,
  onClick,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      // Let the browser handle new-tab / modified clicks natively.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (!href.startsWith('#')) return;

      const target = document.getElementById(href.slice(1));
      if (!target) return; // not on this page → native fallback

      e.preventDefault();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    },
    [href, onClick],
  );

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
