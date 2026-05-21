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
