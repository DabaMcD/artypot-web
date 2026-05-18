'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useViewMode } from '@/lib/view-mode-context';
import { Sidebar } from './Sidebar';
import CreatorSearchWidget from './CreatorSearchWidget';
import NotificationBell from './NotificationBell';
import { NudgeBar } from '@/components/NudgeBar';
import { StaleCardBar } from '@/components/StaleCardBar';
import { PaymentGraceBanner } from '@/components/PaymentGraceBanner';
import { PaymentAuthBanner } from '@/components/PaymentAuthBanner';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

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
    <div className="flex flex-col min-h-screen bg-background" data-role={role}>

      {/* ── Full-width top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center h-12 px-4 bg-surface border-b border-border shrink-0 gap-3">
        {/* Hamburger — mobile only, opens sidebar drawer */}
        <button
          className="md:hidden p-1.5 -ml-1 rounded-md hover:bg-surface-2 transition-colors shrink-0"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo + version */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard" className="shrink-0 translate-y-px">
            <Image
              src="/artypot-logo-transparent-dark.png"
              alt="Artypot"
              width={1024}
              height={269}
              className="h-6 w-auto"
              priority
            />
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted/40">v0.2</span>
        </div>

        <div className="flex-1" />

        {/* Notification bell */}
        <NotificationBell />
      </header>

      {/* ── Sidebar + main content ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          role={role}
          pathname={pathname}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
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
            <PaymentAuthBanner />
            <PaymentGraceBanner />
            <StaleCardBar />
            {children}
          </main>
        </div>
      </div>

    </div>
  );
}
