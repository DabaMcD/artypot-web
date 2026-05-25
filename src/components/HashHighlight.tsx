'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Adds a `.hash-highlighted` class to the first child of the element whose
 * id matches the current URL hash. The class triggers a CSS keyframe animation
 * (defined in globals.css) that briefly flashes an amber ring then fades —
 * giving visual feedback when a hash link scrolls the user to a section.
 *
 * Covers two navigation patterns:
 *   • Cross-page navigation  (/creator/settings → /settings#phone):
 *     caught by the useEffect on `pathname` change.
 *   • Same-page navigation   (already on /settings, clicking #phone):
 *     caught by the `hashchange` DOM event.
 */
export function HashHighlight() {
  const pathname = usePathname();

  const triggerHighlight = useCallback(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const wrapper = document.getElementById(hash);
    if (!wrapper) return;

    // Target the first visible child (the rendered Card) or the wrapper itself
    const target = (wrapper.firstElementChild as HTMLElement | null) ?? wrapper;

    // Remove then force-reflow then re-add to restart animation if already playing
    target.classList.remove('hash-highlighted');
    void target.offsetWidth;
    target.classList.add('hash-highlighted');
  }, []);

  // Cross-page: wait a tick for React to commit the new page's DOM, then highlight
  useEffect(() => {
    if (!window.location.hash) return;
    const id = setTimeout(triggerHighlight, 80);
    return () => clearTimeout(id);
  }, [pathname, triggerHighlight]);

  // Same-page: browser fires hashchange when only the fragment changes
  useEffect(() => {
    window.addEventListener('hashchange', triggerHighlight);
    return () => window.removeEventListener('hashchange', triggerHighlight);
  }, [triggerHighlight]);

  return null;
}
