'use client';

import { usePathname, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { ReactNode, useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { bounties as bountiesApi } from '@/lib/api';
import { Sidebar } from './Sidebar';
import HeaderSearch from './HeaderSearch';
import NotificationBell from './NotificationBell';
import { NudgeBar } from '@/components/NudgeBar';
import { NudgeProvider } from '@/lib/nudge-context';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { PaymentGraceBanner } from '@/components/PaymentGraceBanner';
import { FanMarketBanner } from '@/components/FanMarketBanner';
import { PaymentAuthBanner } from '@/components/PaymentAuthBanner';
import { DefaultUpdatePromptBar } from '@/components/DefaultUpdatePromptBar';
import { DefaultUpdatePromptProvider } from '@/lib/default-update-prompt-context';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];
const AUTH_PREFIXES = ['/email/', '/oauth/'];

function isAuthRoute(pathname: string) {
  return AUTH_PATHS.includes(pathname) || AUTH_PREFIXES.some((p) => pathname.startsWith(p));
}

// ── Page padding archetype ────────────────────────────────────────────────────
//
// The app has two kinds of pages:
//
//   • "App" pages (/search, /dashboard, /settings, …) render a bare
//     `space-y-* pt-2` root and rely on the shell to supply the outer gutter.
//   • "Full-bleed" pages (the public marketing/legal surface and every creator
//     profile under /{slug}) render their OWN centered `mx-auto px-4` container.
//
// `isFullBleed` lets the shell pick the right <main> padding so a page looks
// identical whether the visitor is logged in or out — full-bleed pages must NOT
// get a second gutter (it double-indents them), and app pages MUST get one (or
// they sit flush against the edge). The decision is applied to both the
// authenticated and public branches below so the two states never diverge.

// Static routes whose page component owns its horizontal padding + max-width.
const FULL_BLEED_EXACT = new Set([
  '/',                 // landing hero
  '/about',
  '/for-creators',
  '/support',
  '/privacy',
  '/tos',
  '/creator-tos',
  '/bounties',         // browse index — note /bounties/new is app-padded (below)
  '/obelisk',          // /obelisk/* children covered by the prefix below
  '/settings/password',
]);

// Prefix matches for the same archetype (dynamic children of the above).
// The whole /obelisk admin surface centers its own column; /admin/* does not.
const FULL_BLEED_PREFIXES = ['/privacy/', '/users/', '/obelisk/'];

// App-padded routes that would otherwise be swept up by a broader rule.
const APP_PADDED_EXACT = new Set(['/bounties/new']);

// Every known static top-level segment. A path whose first segment is NOT one of
// these is treated as a creator slug (/{slug}, /{slug}/{handle}, /{slug}/bounties)
// — the public creator surface, which is full-bleed. Keep this in sync when a new
// top-level route folder is added under src/app.
const RESERVED_TOP_SEGMENTS = new Set([
  'about', 'admin', 'backings', 'become-creator', 'billing', 'bounties', 'c',
  'creator-tos', 'creators', 'dashboard', 'email', 'for-creators',
  // 'guide' has no page anymore (308-redirects to /about via next.config) but
  // stays reserved so it can never be claimed as a creator slug.
  'forgot-password', 'guide', 'history', 'login', 'oauth', 'obelisk',
  'privacy', 'register', 'reset-password', 'search', 'settings', 'support',
  'tos', 'users',
]);

function isFullBleed(pathname: string): boolean {
  if (APP_PADDED_EXACT.has(pathname)) return false;
  if (FULL_BLEED_EXACT.has(pathname)) return true;
  if (FULL_BLEED_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Bounty detail pages center their own column; /bounties/new does not.
  if (/^\/bounties\/\d+/.test(pathname)) return true;

  // Anything rooted at an unknown top-level segment is a creator slug → the
  // public profile surface, which is full-bleed in all its sub-pages.
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 1 && !RESERVED_TOP_SEGMENTS.has(segments[0])) {
    return true;
  }
  return false;
}

/**
 * Returns the bounty id from a `/bounties/{id}` path, or null otherwise.
 * Used to decide whether AppShell needs to fetch the bounty to determine sidebar role.
 */
function bountyIdFromPath(pathname: string): number | null {
  const m = pathname.match(/^\/bounties\/(\d+)/);
  return m ? Number(m[1]) : null;
}

function inferRole(
  pathname: string,
  ownSlug: string | null,
  ownUserId: number | null,
  bountyTargetUserId: number | null | undefined,
): 'fan' | 'creator' | 'council' {
  if (pathname.startsWith('/admin') || pathname.startsWith('/obelisk')) return 'council';
  if (pathname.startsWith('/c/') || pathname === '/c') return 'creator';
  // The logged-in creator viewing their own public profile (or any sub-page of it)
  // gets the creator sidebar — they're "on their own turf."
  if (ownSlug && (pathname === `/${ownSlug}` || pathname.startsWith(`/${ownSlug}/`))) return 'creator';
  // Bounty detail pages: the sidebar follows ownership, not navigation history.
  // If the bounty targets the logged-in user, they see the creator sidebar; otherwise fan.
  if (bountyIdFromPath(pathname) !== null) {
    return ownUserId !== null && bountyTargetUserId === ownUserId ? 'creator' : 'fan';
  }
  return 'fan';
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const th = useTranslations('PublicHeader');
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // The landing page hosts its own large search field in the hero, so the
  // header search is suppressed there. Every other page keeps it.
  const isLanding = pathname === '/';

  // For `/bounties/{id}` routes we look up the bounty so the sidebar can match
  // ownership (creator-side iff target_user_id === user.id). On every other
  // route this stays undefined and the lookup is skipped.
  const bountyId = bountyIdFromPath(pathname);
  const [bountyTargetUserId, setBountyTargetUserId] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (bountyId === null) {
      setBountyTargetUserId(undefined);
      return;
    }
    let cancelled = false;
    setBountyTargetUserId(undefined);
    bountiesApi.get(bountyId)
      .then((res) => { if (!cancelled) setBountyTargetUserId(res.data.target_user_id ?? null); })
      .catch(() => { if (!cancelled) setBountyTargetUserId(null); });
    return () => { cancelled = true; };
  }, [bountyId]);

  // Close mobile drawer + mobile search whenever the route changes.
  useEffect(() => { setSidebarOpen(false); setSearchOpen(false); }, [pathname]);

  // Auth pages: full-bleed, no sidebar. A compact language switcher floats in
  // the corner so logged-out users can change language on /login, /register, etc.
  if (isAuthRoute(pathname)) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <LanguageSwitcher variant="header" />
        </div>
        {children}
      </>
    );
  }

  // Loading: blank dark screen
  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  // Unauthenticated on non-auth route: render the public header + footer
  // around the page content. Pages own their internal padding.
  //
  // The provider must wrap this branch too: public pages like /bounties/{id}
  // call useDefaultUpdatePrompt(), so the context has to exist even when logged
  // out. There's no banner here (logged-out users can't back bounties), so
  // dispatch is effectively a no-op — but the hook must not throw.
  if (!user) {
    // Full-bleed pages own their padding; app pages get the shell gutter
    // (centered here, since there's no sidebar to offset them).
    const publicMainClass = isFullBleed(pathname)
      ? 'flex-1 min-w-0'
      : 'flex-1 px-7 py-7 pb-28 w-full max-w-[1400px] mx-auto';
    return (
      <DefaultUpdatePromptProvider>
        <div className="flex flex-col min-h-screen bg-background">
          <PublicHeader />
          <main className={publicMainClass}>
            {children}
          </main>
          <PublicFooter />
        </div>
      </DefaultUpdatePromptProvider>
    );
  }

  // Authenticated: full sidebar layout
  const role = inferRole(pathname, user.slug ?? null, user.id ?? null, bountyTargetUserId);
  const fullBleed = isFullBleed(pathname);

  return (
    <NudgeProvider>
    <DefaultUpdatePromptProvider>
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
            <Link href="/dashboard" className="shrink-0">
              <Image
                src="/artypot-logo-transparent-dark.png"
                alt="Artypot"
                width={797}
                height={258}
                className="h-6 w-auto"
                priority
              />
            </Link>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted/40">v0.4</span>
          </div>

          {/* ── Search (all roles) ──────────────────────────────────────── */}

          {/* Desktop (≥sm): fixed-width search bar always visible (suppressed on landing) */}
          {!isLanding && (
          <div className="hidden sm:block w-64 lg:w-[340px] xl:w-[420px] shrink-0">
            <HeaderSearch placeholder={th("searchLong")} />
          </div>
          )}

          {/* Mobile (<sm): search icon — collapses to full bar when tapped (suppressed on landing) */}
          {!isLanding && !searchOpen && (
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
          {!isLanding && searchOpen && (
            <div className="sm:hidden flex items-center gap-2 flex-1 min-w-0">
              <HeaderSearch autoFocus placeholder="search…" className="flex-1 min-w-0" />
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

          {/* Notification bell — hidden while mobile search is open. ml-auto keeps
              it right-aligned on mobile landing, where no search icon precedes it. */}
          {!searchOpen && (
            <div className="ml-auto sm:ml-0 shrink-0">
              <NotificationBell />
            </div>
          )}
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
          <main className={fullBleed ? 'flex-1 min-w-0' : 'flex-1 px-7 py-7 pb-28 max-w-[1400px] w-full'}>
            {/* On full-bleed pages <main> supplies no padding, so the banner
                stack would otherwise sit flush to the viewport edges. Wrap it in
                the same centered column the profile pages use. `:not(:empty)`
                keeps the top gutter from adding dead space when no banner is
                active (each banner renders null when it has nothing to show). */}
            <div className={fullBleed ? '[&:not(:empty)]:pt-7 max-w-6xl mx-auto px-7' : ''}>
              {/* "Please verify your email" — shown on every authenticated page.
                  Suppressed on /settings, whose email card already surfaces this
                  banner contextually (with the resend control). */}
              {!user.email_verified_at && pathname !== '/settings' && (
                <EmailVerificationBanner email={user.email} />
              )}
              <NudgeBar />
              <FanMarketBanner />
              <PaymentAuthBanner />
              <PaymentGraceBanner />
              <DefaultUpdatePromptBar />
            </div>
            {children}
          </main>
        </div>
      </div>

    </div>
    </DefaultUpdatePromptProvider>
    </NudgeProvider>
  );
}
