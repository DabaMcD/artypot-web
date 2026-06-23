'use client';

import { useEffect } from 'react';

// Always-mounted, near-zero-cost listener that lets the Bad Apple takeover be
// summoned without spending money:
//   • visit any page with ?badapple=1  (QA / the user previewing the egg)
//   • window.dispatchEvent(new CustomEvent('bad-apple:open'))  (programmatic)
// Both lazy-import the heavy overlay only when actually fired, and force past
// the reduced-motion guard since they're explicit, opted-in invocations.
export default function BadAppleListener() {
  useEffect(() => {
    const fire = (key?: string) => {
      import('@/components/BadAppleTakeover')
        .then((m) => m.openBadAppleTakeover(key, true))
        .catch(() => { /* noop */ });
    };
    try {
      if (new URLSearchParams(window.location.search).has('badapple')) fire('queryparam');
    } catch { /* noop */ }
    const onEvt = (e: Event) => fire((e as CustomEvent).detail?.key);
    window.addEventListener('bad-apple:open', onEvt as EventListener);
    return () => window.removeEventListener('bad-apple:open', onEvt as EventListener);
  }, []);
  return null;
}
