'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/lib/notification-context';

/** Strips a leading "(N) " unread badge so we never double-prefix. */
const PREFIX_RE = /^\(\d+\)\s+/;

/**
 * Prefixes the browser-tab title with the unread-notification count, e.g.
 * "(3) Dashboard · Artypot", WITHOUT destroying the page's real title.
 *
 * Why a MutationObserver rather than `document.title = ...`:
 *  - Next App Router re-applies each route's <title> from metadata on every
 *    navigation (and again when async generateMetadata resolves). Any one-shot
 *    write races that and gets clobbered — the old code set the whole title to
 *    "(N) artypot", wiping the page name and flickering on navigation.
 *  - Instead we observe the <title> element and re-apply the count prefix to
 *    whatever Next set as the base title. Our own write is a no-op once the
 *    prefix is already present, so the observer self-terminates (no loop).
 *
 * Renders nothing. Must live inside <NotificationProvider>.
 */
export default function UnreadTitleBadge() {
  const { unreadCount } = useNotifications();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const desiredPrefix = unreadCount > 0 ? `(${unreadCount}) ` : '';

    const apply = () => {
      const current = document.title;
      const base = current.replace(PREFIX_RE, '');
      const next = desiredPrefix + base;
      if (current !== next) {
        document.title = next;
      }
    };

    apply();

    const titleEl = document.querySelector('title');
    if (!titleEl) return;

    // Re-apply whenever anything (Next metadata on navigation, async metadata)
    // rewrites the title, so the unread prefix survives route changes.
    const observer = new MutationObserver(apply);
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [unreadCount]);

  return null;
}
