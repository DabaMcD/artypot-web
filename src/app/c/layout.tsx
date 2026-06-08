'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

  return <>{children}</>;
}
