'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, SectionLabel } from '@/components/ui/Card';

export default function LedgerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
  if (loading || !user) return null;
  return (
    <div className="space-y-7 pt-2">
      <div>
        <SectionLabel>creator · money</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">ledger</h1>
      </div>
      <Card>
        <p className="text-sm text-muted">coming soon.</p>
      </Card>
    </div>
  );
}
