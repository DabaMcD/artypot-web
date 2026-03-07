'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast-context';
import { NotificationProvider } from '@/lib/notification-context';
import ToastDisplay from '@/components/ToastDisplay';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          {children}
          <ToastDisplay />
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
