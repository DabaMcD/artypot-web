'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, SectionLabel } from '@/components/ui/Card';

export default function TaxPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
  if (loading || !user) return null;
  return (
    <div className="space-y-7 pt-2">
      <div>
        <SectionLabel>creator · admin</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">tax & compliance</h1>
      </div>
      <Card>
        <p className="text-sm text-muted">coming soon.</p>
      </Card>
    </div>
  );
}
