'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast-context';
import ToastDisplay from '@/components/ToastDisplay';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <ToastDisplay />
      </ToastProvider>
    </AuthProvider>
  );
}
