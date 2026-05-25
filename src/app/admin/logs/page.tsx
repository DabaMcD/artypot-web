'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, SectionLabel } from '@/components/ui/Card';

export default function LogsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'council') router.push('/');
  }, [loading, user, router]);
  if (loading || !user || user.role !== 'council') return null;
  return (
    <div className="space-y-7 pt-2">
      <div>
        <SectionLabel>council · operations</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">audit log</h1>
      </div>
      <Card>
        <p className="text-sm text-muted">coming soon.</p>
      </Card>
    </div>
  );
}
