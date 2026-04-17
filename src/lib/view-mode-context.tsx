'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

export type ViewMode = 'fan' | 'creator';

interface ViewModeContextType {
  mode: ViewMode;
  canSwitch: boolean;
  switchTo: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
  mode: 'fan',
  canSwitch: false,
  switchTo: () => {},
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const canSwitch = !!(user?.creator && (user.role === 'creator' || user.role === 'council'));
  const [mode, setMode] = useState<ViewMode>('fan');

  // Restore from localStorage once we know whether the user can switch
  useEffect(() => {
    const stored = localStorage.getItem('artypot_view_mode') as ViewMode | null;
    if (stored === 'creator' && canSwitch) setMode('creator');
  }, [canSwitch]);

  // If the user loses creator access (e.g. logout), reset to fan
  useEffect(() => {
    if (!canSwitch && mode === 'creator') {
      setMode('fan');
      localStorage.removeItem('artypot_view_mode');
    }
  }, [canSwitch, mode]);

  const switchTo = (newMode: ViewMode) => {
    if (newMode === 'creator' && !canSwitch) return;
    setMode(newMode);
    if (newMode === 'fan') {
      localStorage.removeItem('artypot_view_mode');
    } else {
      localStorage.setItem('artypot_view_mode', newMode);
    }
  };

  return (
    <ViewModeContext.Provider value={{ mode, canSwitch, switchTo }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export const useViewMode = () => useContext(ViewModeContext);
