'use client';

import { useState, useEffect } from 'react';
import { usePathname, Link } from '@/i18n/routing';
import Image from 'next/image';
import HeaderSearch from '@/components/HeaderSearch';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslations } from 'next-intl';

/**
 * Sticky public header shown on every page when the viewer is not logged in.
 * Mirrors the search-bar UX from the authenticated <AppShell> header:
 *   - Desktop (≥sm): fixed-width search bar always visible.
 *   - Mobile (<sm): search icon that expands the bar in-place.
 */
export function PublicHeader() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const t = useTranslations('PublicHeader');

  // The landing page hosts its own large search field in the hero, so the
  // header search is suppressed there. Every other page keeps it.
  const isLanding = pathname === '/';

  // Close the mobile search whenever the route changes.
  useEffect(() => { setSearchOpen(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-50 h-16 bg-surface/95 backdrop-blur border-b border-border/60">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-full gap-3">

        {/* Logo — hidden on mobile when search is expanded */}
        <Link
          href="/"
          className={`shrink-0 items-center translate-y-px ${searchOpen ? 'hidden sm:flex' : 'flex'}`}
          aria-label="Artypot home"
        >
          <Image
            src="/artypot-logo-transparent-dark.png"
            alt="Artypot"
            width={1024}
            height={269}
            className="h-6 w-auto"
            priority
          />
        </Link>

        {/* Desktop (≥sm): fixed-width search bar always visible (suppressed on landing) */}
        {!isLanding && (
        <div className="hidden sm:block w-64 lg:w-[340px] xl:w-[420px] shrink-0">
          <HeaderSearch placeholder={t('searchLong')} />
        </div>
        )}

        {/* Mobile (<sm): search icon — collapses to full bar when tapped (suppressed on landing) */}
        {!isLanding && !searchOpen && (
          <button
            className="sm:hidden ml-auto p-2 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
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
            <HeaderSearch autoFocus placeholder={t('searchShort')} className="flex-1 min-w-0" />
            <button
              onClick={() => setSearchOpen(false)}
              className="shrink-0 font-mono text-xs text-muted hover:text-foreground transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        )}

        {/* Desktop spacer — pushes right-side nav to the far right */}
        <div className="hidden sm:block flex-1" />

        {/* Right nav — hidden on mobile while the search bar is expanded */}
        {!searchOpen && (
          <nav className="flex items-center gap-1 sm:gap-3 shrink-0 ml-auto sm:ml-0">
            <LanguageSwitcher variant="header" />
            <Link
              href="/login"
              className="text-sm text-muted hover:text-foreground transition-colors px-2 py-1"
            >
              {t('logIn')}
            </Link>
            <Link
              href="/register"
              className="text-sm bg-creator text-brand-dark font-semibold px-3 py-1.5 rounded-md hover:brightness-110 transition-all whitespace-nowrap"
            >
              {t('signUp')}
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
