'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';

export default function Nav() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push('/');
  };

  const isActive = (href: string) =>
    pathname === href ? 'text-brand' : 'text-muted hover:text-foreground';

  return (
    <nav className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="text-brand font-bold text-xl tracking-tight shrink-0">
          artypot
        </Link>

        {/* Center links */}
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/pots" className={`transition-colors ${isActive('/pots')}`}>
            Browse Pots
          </Link>
          <Link href="/summons" className={`transition-colors ${isActive('/summons')}`}>
            Creators
          </Link>
          <Link href="/guide" className={`transition-colors ${isActive('/guide')}`}>
            I&apos;m Confused
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-8 rounded bg-surface-2 animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 text-sm text-foreground hover:text-brand transition-colors"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background:
                      user.role === 'council'
                        ? '#8A2BE2'
                        : user.role === 'summoned'
                          ? '#47DFD3'
                          : '#F5A623',
                    color: user.role === 'summoned' ? '#0a0a0a' : '#fff',
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:block max-w-[120px] truncate">{user.name}</span>
                <svg
                  className="w-3 h-3 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-surface-2 border border-border rounded-lg shadow-xl z-50 overflow-hidden text-sm">
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 hover:bg-border transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/billing"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 hover:bg-border transition-colors"
                    >
                      Payment Methods
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 hover:bg-border transition-colors"
                    >
                      Settings
                    </Link>
                    {user.role === 'council' && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 hover:bg-border transition-colors text-council"
                      >
                        Admin Panel
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
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm bg-brand text-black font-semibold px-3 py-1.5 rounded-md hover:bg-brand-dim transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
