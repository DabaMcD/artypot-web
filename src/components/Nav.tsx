'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useViewMode } from '@/lib/view-mode-context';
import { useState, useEffect } from 'react';
import NotificationBell from '@/components/NotificationBell';
import CreatorSearchWidget from '@/components/CreatorSearchWidget';
import { ROLE_LABELS } from '@/lib/theme';
import type { RoleKey } from '@/lib/theme';

export default function Nav() {
  const { user, logout, loading } = useAuth();
  const { mode, canSwitch, switchTo } = useViewMode();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    setDrawerOpen(false);
    router.push('/');
  };

  const isCreatorMode = mode === 'creator';
  const isAdminZone = pathname.startsWith('/admin') || pathname.startsWith('/overlord');

  // Active-link color follows mode (council zone overrides both)
  const activeClass = isAdminZone ? 'text-council' : isCreatorMode ? 'text-creator' : 'text-fan';
  const isActive = (href: string) =>
    pathname === href ? activeClass : 'text-muted hover:text-foreground';

  // Accent color: council overrides mode in admin/overlord zone
  const accentColor = isAdminZone
    ? 'var(--color-council)'
    : isCreatorMode ? 'var(--color-creator)' : 'var(--color-fan)';

  // Avatar bg/text for role-based coloring in dropdown header
  const roleBgVar   = `var(--color-${user?.role ?? 'fan'})`;
  const roleTextVar = user?.role === 'council' ? 'var(--color-brand-light)' : 'var(--color-brand-dark)';
  const roleLabel   = user ? ROLE_LABELS[user.role as RoleKey] : '';

  const logoHref = user ? '/dashboard' : '/';
  const isHomePage = pathname === '/';

  // Nav bottom border color follows mode
  const borderStyle = user
    ? { borderBottomColor: accentColor, borderBottomWidth: '1px', borderBottomStyle: 'solid' as const }
    : {};

  return (
    <>
      <nav
        className={`bg-surface sticky top-0 z-50 ${isHomePage ? '' : 'border-b border-border'}`}
        style={isHomePage ? {} : borderStyle}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href={logoHref} className="shrink-0 flex items-center">
            <Image src="/artypot-logo-transparent-dark.png" alt="Artypot" width={1024} height={269} className="h-8 w-auto translate-y-[3px]" priority />
          </Link>

          {/* Center: links + search (desktop, non-homepage only) */}
          {!isHomePage && (
            <div className="hidden md:flex items-center gap-4 flex-1 justify-center min-w-0">
              <Link href="/about" className={`transition-colors text-sm font-medium shrink-0 ${isActive('/about')}`}>
                About
              </Link>
              <Link href="/guide" className={`transition-colors text-sm font-medium shrink-0 ${isActive('/guide')}`}>
                Guide
              </Link>
              <div className="w-80 shrink-0">
                <CreatorSearchWidget
                  navigateOnSelect
                  placeholder="Search creators…"
                  inputClassName="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors"
                />
              </div>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Homepage-only desktop links */}
            {isHomePage && (
              <div className="hidden md:flex items-center gap-5 mr-1">
                <Link href="/about" className={`transition-colors text-sm font-medium ${isActive('/about')}`}>
                  About
                </Link>
                <Link href="/guide" className={`transition-colors text-sm font-medium ${isActive('/guide')}`}>
                  Guide
                </Link>
              </div>
            )}

            {loading ? (
              <div className="w-20 h-8 rounded bg-surface-2 animate-pulse" />
            ) : user ? (
              <>
                {/* Mode switcher pill — creators only, desktop */}
                {canSwitch && (
                  <div className="hidden md:flex items-center rounded-full border border-border overflow-hidden text-xs font-semibold">
                    <button
                      onClick={() => switchTo('fan')}
                      className="px-3 py-1.5 transition-colors"
                      style={
                        !isCreatorMode
                          ? { background: 'var(--color-fan)', color: 'var(--color-brand-dark)' }
                          : { color: 'var(--color-muted)' }
                      }
                    >
                      Fan
                    </button>
                    <button
                      onClick={() => switchTo('creator')}
                      className="px-3 py-1.5 transition-colors"
                      style={
                        isCreatorMode
                          ? { background: 'var(--color-creator)', color: 'var(--color-brand-dark)' }
                          : { color: 'var(--color-muted)' }
                      }
                    >
                      Creator
                    </button>
                  </div>
                )}

                <NotificationBell />

                {/* Desktop avatar dropdown */}
                <div className="hidden md:block relative">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-fan transition-colors"
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: roleBgVar, color: roleTextVar }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate">{user.name}</span>
                    <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-surface-2 border border-border rounded-lg shadow-xl z-50 overflow-hidden text-sm">
                        {/* Identity header */}
                        <div className="px-4 py-3 border-b border-border">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: roleBgVar, color: roleTextVar }}
                            >
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{user.name}</p>
                            </div>
                          </div>
                        </div>

                        {/* Fan-side nav links */}
                        <Link
                          href="/dashboard"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 hover:bg-border transition-colors"
                        >
                          <span className="font-medium text-foreground">My Dashboard</span>
                          <span className="block text-xs text-muted mt-0.5">Backing, billing &amp; metrics</span>
                        </Link>
                        <Link
                          href={`/users/${user.id}`}
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 hover:bg-border transition-colors"
                        >
                          <span className="font-medium text-foreground">My Profile</span>
                          <span className="block text-xs text-muted mt-0.5">Your public page</span>
                        </Link>
                        <Link
                          href="/billing"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 hover:bg-border transition-colors text-foreground"
                        >
                          Payment Methods
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 hover:bg-border transition-colors text-foreground"
                        >
                          Settings
                        </Link>

                        {/* Creator-side links */}
                        {(user.role === 'creator' || user.role === 'council') && !!user.creator && (
                          <>
                            <div className="border-t border-border" />
                            <Link
                              href="/sanctum"
                              onClick={() => setMenuOpen(false)}
                              className="block px-4 py-2.5 hover:bg-border transition-colors text-creator"
                            >
                              Creator Sanctum
                            </Link>
                          </>
                        )}

                        {/* Council-only */}
                        {user.role === 'council' && (
                          <Link
                            href="/admin"
                            onClick={() => setMenuOpen(false)}
                            className="block px-4 py-2.5 hover:bg-border transition-colors text-council"
                          >
                            Council Chamber
                          </Link>
                        )}

                        {/* Overlord */}
                        {user.is_overlord && (
                          <Link
                            href="/overlord"
                            onClick={() => setMenuOpen(false)}
                            className="block px-4 py-2.5 hover:bg-border transition-colors text-amber-400"
                          >
                            Overlord Obelisk
                          </Link>
                        )}

                        <div className="border-t border-border" />
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2.5 hover:bg-border transition-colors text-muted hover:text-foreground"
                        >
                          Log out
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="md:hidden p-1.5 text-muted hover:text-foreground transition-colors"
                  aria-label="Open menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden md:block text-sm text-muted hover:text-foreground transition-colors">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="hidden md:block text-sm bg-fan text-black font-semibold px-3 py-1.5 rounded-md hover:bg-fan-dim transition-colors"
                >
                  Sign up
                </Link>

                {/* Mobile hamburger (guest) */}
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="md:hidden p-1.5 text-muted hover:text-foreground transition-colors"
                  aria-label="Open menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-surface border-l border-border flex flex-col transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-4 h-14 border-b shrink-0"
          style={user ? { borderBottomColor: accentColor } : { borderBottomColor: 'var(--color-border)' }}
        >
          <Link href={logoHref} onClick={() => setDrawerOpen(false)} className="flex items-center">
            <Image src="/artypot-logo-transparent-dark.png" alt="Artypot" width={1024} height={269} className="h-9 w-auto" />
          </Link>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 text-muted hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Identity block (logged in) */}
        {user && (
          <div className="px-4 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: roleBgVar, color: roleTextVar }}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs font-medium" style={{ color: roleBgVar }}>{roleLabel}</p>
              </div>
            </div>

            {/* Mode switcher — mobile, creators only */}
            {canSwitch && (
              <div className="mt-3 flex items-center rounded-full border border-border overflow-hidden text-xs font-semibold w-fit">
                <button
                  onClick={() => switchTo('fan')}
                  className="px-4 py-1.5 transition-colors"
                  style={
                    !isCreatorMode
                      ? { background: 'var(--color-fan)', color: 'var(--color-brand-dark)' }
                      : { color: 'var(--color-muted)' }
                  }
                >
                  Fan
                </button>
                <button
                  onClick={() => switchTo('creator')}
                  className="px-4 py-1.5 transition-colors"
                  style={
                    isCreatorMode
                      ? { background: 'var(--color-creator)', color: 'var(--color-brand-dark)' }
                      : { color: 'var(--color-muted)' }
                  }
                >
                  Creator
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Search */}
          <div className="px-4 py-3">
            <CreatorSearchWidget
              navigateOnSelect
              placeholder="Search creators…"
              inputClassName="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors"
            />
          </div>
          <div className="border-t border-border" />

          {/* Nav links */}
          <Link href="/about" onClick={() => setDrawerOpen(false)} className={`block px-4 py-3 text-sm font-medium transition-colors ${isActive('/about')}`}>
            About
          </Link>
          <Link href="/guide" onClick={() => setDrawerOpen(false)} className={`block px-4 py-3 text-sm font-medium transition-colors ${isActive('/guide')}`}>
            Guide
          </Link>

          {/* Account section (logged in) */}
          {user && (
            <>
              <div className="border-t border-border my-2" />
              <Link href="/dashboard" onClick={() => setDrawerOpen(false)} className="block px-4 py-3 text-sm font-medium text-muted hover:text-foreground transition-colors">
                My Dashboard
              </Link>
              <Link href={`/users/${user.id}`} onClick={() => setDrawerOpen(false)} className="block px-4 py-3 text-sm font-medium text-muted hover:text-foreground transition-colors">
                My Profile
              </Link>
              <Link href="/billing" onClick={() => setDrawerOpen(false)} className="block px-4 py-3 text-sm font-medium text-muted hover:text-foreground transition-colors">
                Payment Methods
              </Link>
              <Link href="/settings" onClick={() => setDrawerOpen(false)} className="block px-4 py-3 text-sm font-medium text-muted hover:text-foreground transition-colors">
                Settings
              </Link>
              {(user.role === 'creator' || user.role === 'council') && !!user.creator && (
                <Link href="/sanctum" onClick={() => setDrawerOpen(false)} className="block px-4 py-3 text-sm font-medium text-creator transition-colors">
                  Creator Sanctum
                </Link>
              )}
              {user.role === 'council' && (
                <Link href="/admin" onClick={() => setDrawerOpen(false)} className="block px-4 py-3 text-sm font-medium text-council transition-colors">
                  Council Chamber
                </Link>
              )}
              {user.is_overlord && (
                <Link href="/overlord" onClick={() => setDrawerOpen(false)} className="block px-4 py-3 text-sm font-medium text-amber-400 transition-colors">
                  Overlord Obelisk
                </Link>
              )}
            </>
          )}

          {/* Guest auth buttons */}
          {!user && !loading && (
            <>
              <div className="border-t border-border my-2" />
              <div className="px-4 py-3 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="block text-center text-sm font-medium text-foreground border border-border py-2.5 rounded-lg hover:border-foreground/30 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setDrawerOpen(false)}
                  className="block text-center text-sm font-semibold bg-fan text-black py-2.5 rounded-lg hover:bg-fan-dim transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Log out (logged in) — pinned to bottom */}
        {user && (
          <div className="border-t border-border shrink-0">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-4 text-sm text-muted hover:text-foreground transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </>
  );
}
