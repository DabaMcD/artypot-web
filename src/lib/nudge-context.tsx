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

// Poll cadence for nudge-bar updates. A focused tab refreshes briskly so a
// freshly-resolved nudge (e.g. a verified handle, a settled balance) clears
// within a minute; a backgrounded tab falls back to the same slow cadence the
// notification poller uses, to avoid hammering the API for a hidden page.
const FOCUSED_POLL_INTERVAL = 60 * 1000;        // 60s while the tab is focused
const BACKGROUND_POLL_INTERVAL = 5 * 60 * 1000; // 5min while the tab is hidden

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

  // Keep the nudge bar fresh without a manual reload. The cadence tracks tab
  // visibility: 60s while focused, 5min while hidden. We also refresh
  // immediately on regaining focus so a user returning to the tab sees an
  // up-to-date bar at once rather than waiting out the interval.
  useEffect(() => {
    if (!user) return;
    let interval: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (interval) clearInterval(interval);
      const period = document.visibilityState === 'visible'
        ? FOCUSED_POLL_INTERVAL
        : BACKGROUND_POLL_INTERVAL;
      interval = setInterval(refresh, period);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
      start(); // re-arm the interval at the cadence for the new visibility state
    };

    start();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      if (interval) clearInterval(interval);
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
