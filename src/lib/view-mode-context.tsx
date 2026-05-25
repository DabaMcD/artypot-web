'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

export type ViewMode = 'fan' | 'creator';

interface ViewModeContextType {
  mode: ViewMode;
  canSwitch: boolean;
  switchTo: (mode: ViewMode) => void;
  /**
   * Called by the bounty detail page to register the currently viewed bounty's
   * `target_user_id`. When that id matches the logged-in user, `mode` is
   * reported as 'creator' regardless of the stored preference — a bounty
   * *for* the logged-in user should obviously be viewed from the creator
   * perspective. Pass `null` on unmount or when no bounty is in view.
   */
  setCurrentBountyTargetUserId: (userId: number | null) => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
  mode: 'fan',
  canSwitch: false,
  switchTo: () => {},
  setCurrentBountyTargetUserId: () => {},
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const canSwitch = !!(user?.creator && (user.role === 'creator' || user.role === 'council'));
  const [storedMode, setStoredMode] = useState<ViewMode>('fan');
  const [currentBountyTargetUserId, setCurrentBountyTargetUserIdState] = useState<number | null>(null);

  // Restore from localStorage once we know whether the user can switch
  useEffect(() => {
    const stored = localStorage.getItem('artypot_view_mode') as ViewMode | null;
    if (stored === 'creator' && canSwitch) setStoredMode('creator');
  }, [canSwitch]);

  // If the user loses creator access (e.g. logout), reset to fan
  useEffect(() => {
    if (!canSwitch && storedMode === 'creator') {
      setStoredMode('fan');
      localStorage.removeItem('artypot_view_mode');
    }
  }, [canSwitch, storedMode]);

  const switchTo = (newMode: ViewMode) => {
    if (newMode === 'creator' && !canSwitch) return;
    setStoredMode(newMode);
    if (newMode === 'fan') {
      localStorage.removeItem('artypot_view_mode');
    } else {
      localStorage.setItem('artypot_view_mode', newMode);
    }
  };

  const setCurrentBountyTargetUserId = useCallback((userId: number | null) => {
    setCurrentBountyTargetUserIdState(userId);
  }, []);

  // Bounties targeting the logged-in user are always shown in creator mode,
  // overriding the stored preference. Bounties for other creators fall back
  // to the user's stored mode (typically fan).
  const isOwnBounty =
    currentBountyTargetUserId !== null &&
    !!user &&
    currentBountyTargetUserId === user.id &&
    canSwitch;

  const mode: ViewMode = isOwnBounty ? 'creator' : storedMode;

  return (
    <ViewModeContext.Provider value={{ mode, canSwitch, switchTo, setCurrentBountyTargetUserId }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export const useViewMode = () => useContext(ViewModeContext);
