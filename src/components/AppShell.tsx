'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useViewMode } from '@/lib/view-mode-context';
import { Sidebar } from './Sidebar';
import CreatorSearchWidget from './CreatorSearchWidget';
import { NudgeBar } from '@/components/NudgeBar';
import { StaleCardBar } from '@/components/StaleCardBar';
import { PaymentGraceBanner } from '@/components/PaymentGraceBanner';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];
const AUTH_PREFIXES = ['/email/', '/oauth/'];

function isAuthRoute(pathname: string) {
  return AUTH_PATHS.includes(pathname) || AUTH_PREFIXES.some((p) => pathname.startsWith(p));
}

function inferRole(pathname: string, mode: string): 'fan' | 'creator' | 'council' {
  if (pathname.startsWith('/admin') || pathname.startsWith('/overlord')) return 'council';
  if (pathname.startsWith('/sanctum') || mode === 'creator') return 'creator';
  return 'fan';
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { mode } = useViewMode();

  // Auth pages: full-bleed, no sidebar
  if (isAuthRoute(pathname)) {
    return <>{children}</>;
  }

  // Loading: blank dark screen
  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  // Unauthenticated on non-auth route: render content with no sidebar (some pages handle this)
  if (!user) {
    return <>{children}</>;
  }

  // Authenticated: full sidebar layout
  const role = inferRole(pathname, mode);

  return (
    <div className="flex min-h-screen bg-background" data-role={role}>
      <Sidebar role={role} pathname={pathname} />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top strip: search (fan only) */}
        {role === 'fan' && (
          <div className="px-7 pt-6 pb-0">
            <div className="max-w-[460px]">
              <CreatorSearchWidget
                navigateOnSelect
                placeholder="find a creator, bounty, or handle…"
                inputClassName="w-full bg-surface border border-border rounded-md px-3 py-2 pl-9 font-mono text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-[var(--color-role)] transition-colors"
              />
            </div>
          </div>
        )}
        <main className="flex-1 px-7 py-7 pb-28 max-w-[1400px] w-full">
          <NudgeBar />
          <PaymentGraceBanner />
          <StaleCardBar />
          {children}
        </main>
      </div>
    </div>
  );
}
