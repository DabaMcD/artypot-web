'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error';
  fading: boolean;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
});

// How long each type stays fully visible before the fade begins
const VISIBLE_MS: Record<'success' | 'error', number> = {
  success: 3000,
  error:   6000,
};
const FADE_MS = 300; // must match the CSS transition-duration in ToastDisplay

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++nextId.current;

    setToasts((prev) => [...prev, { id, message, type, fading: false }]);

    // Begin fade-out after type-appropriate delay
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, fading: true } : t)),
      );
      // Remove from DOM after CSS fade completes
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, FADE_MS);
    }, VISIBLE_MS[type]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
