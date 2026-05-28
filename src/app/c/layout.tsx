'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'creator' && user.role !== 'council') {
      router.replace('/become-creator');
    }
  }, [user, loading, router]);

  // While auth is resolving, or redirect is pending, render nothing
  if (loading || !user || (user.role !== 'creator' && user.role !== 'council')) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
}
