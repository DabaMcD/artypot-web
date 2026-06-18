'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Every /c/* page is creator-personal — it operates on the logged-in
  // user's own creator profile, balance, bounties, handles, etc. Council
  // membership alone grants no access here (moderation lives under /admin
  // and /obelisk). Guard on the genuine creator profile, which a council
  // member who is also a creator still has.
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.creator) {
      router.replace('/become-creator');
    }
  }, [user, loading, router]);

  // While auth is resolving, or redirect is pending, render nothing
  if (loading || !user || !user.creator) {
    return <div className="min-h-screen bg-background" />;
  }

  // Phase 1 US-only gate. Creators may register from anywhere, but their creator
  // surfaces stay dark until we launch support for their country. Replace every
  // /c/* page with a single explanatory state rather than a half-working dashboard.
  if (user.creator.creator_market_open === false) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">
            Creator tools aren&apos;t available in your country yet
          </p>
          <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
            Artypot is currently launching in the US only. Your creator account is set up and
            your handles are safe — but the dashboard, bounties, and payouts stay paused until we
            roll out support for your country. We&apos;ll email you the moment that happens.
          </p>
          <p className="text-muted text-xs">
            Questions?{' '}
            <a href="mailto:support@artypot.com" className="text-creator hover:underline">
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
