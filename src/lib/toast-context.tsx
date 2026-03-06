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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++nextId.current;

    setToasts((prev) => [...prev, { id, message, type, fading: false }]);

    // After 1700ms begin fade-out
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, fading: true } : t)),
      );
      // After 300ms CSS fade, remove from DOM
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 1700);
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
