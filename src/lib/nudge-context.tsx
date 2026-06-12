'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { nudges as nudgesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Nudge } from '@/lib/types';

interface NudgeContextValue {
  nudge: Nudge | null;
  loading: boolean;
  refresh: () => Promise<void>;
  dismiss: (type: string) => Promise<void>;
}

const NudgeContext = createContext<NudgeContextValue | null>(null);

// Nudge freshness is driven by *refocus*, not aggressive polling: the typical
// way a nudge resolves (clicking a verify-email link in a mail client, fixing
// a card in a Stripe tab) happens outside this page, and the user returning to
// it is the moment the bar must be right. A slow safety-net poll covers the
// rare case where the nudge resolves while this tab stays focused the whole
// time (e.g. email verified on a phone). Hidden tabs don't poll at all — they
// refresh the instant they're visible again.
const VISIBLE_POLL_INTERVAL = 5 * 60 * 1000; // safety net while visible
const REFOCUS_MIN_GAP = 10 * 1000;           // throttle for bursty focus events

export function NudgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await nudgesApi.get();
      setNudge(res.nudge);
    } catch {
      // Silently ignore — nudge is non-critical
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh whenever the user comes back to the page. Two listeners are needed
  // because they cover different returns: `visibilitychange` fires on tab
  // switches within the browser, while `window focus` fires when the user
  // returns from another application (mail client, phone-mirroring, etc.)
  // where the tab never stopped being "visible". Focus events can fire in
  // quick bursts (window-switching, devtools), so refocus refreshes are
  // throttled to one per REFOCUS_MIN_GAP.
  useEffect(() => {
    if (!user) return;
    let lastFetch = Date.now(); // the mount effect above just fetched

    const refreshNow = () => {
      lastFetch = Date.now();
      refresh();
    };
    const onRefocus = () => {
      if (Date.now() - lastFetch >= REFOCUS_MIN_GAP) refreshNow();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') onRefocus();
    };
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refreshNow();
    }, VISIBLE_POLL_INTERVAL);

    window.addEventListener('focus', onRefocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onRefocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, refresh]);

  const dismiss = useCallback(async (type: string) => {
    setNudge(null); // Optimistic
    try {
      await nudgesApi.dismiss(type);
    } catch {
      // If dismiss fails, nudge will reappear on next load — acceptable
    }
  }, []);

  return (
    <NudgeContext.Provider value={{ nudge, loading, refresh, dismiss }}>
      {children}
    </NudgeContext.Provider>
  );
}

export function useNudgeContext(): NudgeContextValue {
  const ctx = useContext(NudgeContext);
  if (!ctx) throw new Error('useNudgeContext must be used inside <NudgeProvider>');
  return ctx;
}
