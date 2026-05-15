'use client';

import { useState, useEffect, useCallback } from 'react';
import { nudges as nudgesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Nudge } from '@/lib/types';

export function useNudge() {
  const { user } = useAuth();
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
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
    fetch();
  }, [fetch]);

  const dismiss = useCallback(async (type: string) => {
    setNudge(null); // Optimistic
    try {
      await nudgesApi.dismiss(type);
    } catch {
      // If dismiss fails, nudge will reappear on next load — acceptable
    }
  }, []);

  return { nudge, dismiss, loading };
}
