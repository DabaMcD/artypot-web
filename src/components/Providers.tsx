'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ViewModeProvider } from '@/lib/view-mode-context';
import { ToastProvider } from '@/lib/toast-context';
import { NotificationProvider } from '@/lib/notification-context';
import ToastDisplay from '@/components/ToastDisplay';
import { HashHighlight } from '@/components/HashHighlight';
import UnreadTitleBadge from '@/components/UnreadTitleBadge';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <NotificationProvider>
          <ToastProvider>
            <HashHighlight />
            <UnreadTitleBadge />
            {children}
            <ToastDisplay />
          </ToastProvider>
        </NotificationProvider>
      </ViewModeProvider>
    </AuthProvider>
  );
}
