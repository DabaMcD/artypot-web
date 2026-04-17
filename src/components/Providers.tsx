'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ViewModeProvider } from '@/lib/view-mode-context';
import { ToastProvider } from '@/lib/toast-context';
import { NotificationProvider } from '@/lib/notification-context';
import ToastDisplay from '@/components/ToastDisplay';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <NotificationProvider>
          <ToastProvider>
            {children}
            <ToastDisplay />
          </ToastProvider>
        </NotificationProvider>
      </ViewModeProvider>
    </AuthProvider>
  );
}
