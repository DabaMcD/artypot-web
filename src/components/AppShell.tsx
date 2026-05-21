'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useViewMode } from '@/lib/view-mode-context';
import { Sidebar } from './Sidebar';
import CreatorSearchWidget from './CreatorSearchWidget';
import NotificationBell from './NotificationBell';
import { NudgeBar } from '@/components/NudgeBar';
import { NudgeProvider } from '@/lib/nudge-context';
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
  if (pathname.startsWith('/creator')) return 'creator';
  // Bounty detail pages: inherit stored mode so a creator navigating from /creator/*
  // keeps the creator sidebar when viewing their own bounty. All other non-creator
  // paths always resolve to fan regardless of mode.
  if (/^\/bounties\/\d+/.test(pathname) && mode === 'creator') return 'creator';
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
  const [searchOpen, setSearchOpen] = useState(false);

  // Close mobile drawer + mobile search whenever the route changes.
  useEffect(() => { setSidebarOpen(false); setSearchOpen(false); }, [pathname]);

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
    <NudgeProvider>
    <div className="flex flex-col min-h-screen bg-background" data-role={role}>

      {/* ── Full-width top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-16 px-4 bg-surface border-b border-border shrink-0">
        <div className="flex items-center h-full gap-3">

          {/* Hamburger — sidebar toggle, mobile/tablet only; hidden while mobile search is open */}
          {!searchOpen && (
            <button
              className="lg:hidden p-1.5 -ml-1 rounded-md hover:bg-surface-2 transition-colors shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Logo + version — hidden on mobile when search is expanded */}
          <div className={`flex items-center gap-2 shrink-0 ${searchOpen ? 'hidden sm:flex' : 'flex'}`}>
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

          {/* ── Search (all roles) ──────────────────────────────────────── */}

          {/* Desktop (≥sm): fixed-width search bar always visible */}
          <div className="hidden sm:block w-64 lg:w-[340px] xl:w-[420px] shrink-0">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none z-10"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
              <CreatorSearchWidget
                navigateOnSelect
                placeholder="find a creator, bounty, or handle…"
                inputClassName="w-full bg-surface-2 border border-border rounded-md px-3 py-1.5 pl-9 font-mono text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-[var(--color-role)] transition-colors"
              />
            </div>
          </div>

          {/* Mobile (<sm): search icon — collapses to full bar when tapped */}
          {!searchOpen && (
            <button
              className="sm:hidden ml-auto p-2 -mr-1 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
            </button>
          )}

          {/* Mobile (<sm): expanded search bar */}
          {searchOpen && (
            <div className="sm:hidden flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none z-10"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
                <CreatorSearchWidget
                  navigateOnSelect
                  autoFocus
                  placeholder="search…"
                  inputClassName="w-full bg-surface-2 border border-border rounded-md px-3 py-1.5 pl-9 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-[var(--color-role)] transition-colors"
                />
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="shrink-0 font-mono text-xs text-muted hover:text-foreground transition-colors"
              >
                cancel
              </button>
            </div>
          )}

          {/* Desktop spacer: pushes NotifBell to the far right */}
          <div className="hidden sm:block flex-1" />

          {/* Notification bell — hidden while mobile search is open */}
          {!searchOpen && <NotificationBell />}
        </div>
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
    </NudgeProvider>
  );
}
