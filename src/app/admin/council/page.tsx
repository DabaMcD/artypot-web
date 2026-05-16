'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CouncilMember } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';

// ── Main page ───────────────────────────────────────────────────────────────
export default function AdminCouncilPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const fetchMembers = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await adminApi.listCouncil(page);
      setMembers(res.data);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') {
      fetchMembers(1);
    }
  }, [user, fetchMembers]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-3xl">
      {/* Header */}
      <div>
        <SectionLabel className="mb-2">council · admin</SectionLabel>
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm">← admin</Button>
          </Link>
          <h1 className="font-display font-bold text-[28px]">Council Members</h1>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted">
            {total} member{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Member list */}
      <Card>
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 -mx-5 -mt-4 px-5 py-3 border-b border-border bg-surface-2 rounded-t-md mb-0">
          <SectionLabel>Member</SectionLabel>
          <SectionLabel>Appointed by</SectionLabel>
          <SectionLabel>Date</SectionLabel>
        </div>

        {loading ? (
          <div className="divide-y divide-border -mx-5 -mb-4 mt-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="-mx-5 -mb-4 mt-3">
            <Empty message="No council members found." />
          </div>
        ) : (
          <div className="divide-y divide-border -mx-5 -mb-4 mt-3">
            {members.map((member) => (
              <div key={member.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-4">
                {/* Member info */}
                <div>
                  <p className="font-display text-sm font-medium text-foreground">{member.display_name}</p>
                  <p className="font-mono text-[10px] text-muted">{member.email}</p>
                </div>

                {/* Appointed by */}
                <div className="text-right">
                  {member.appointedBy ? (
                    <>
                      <p className="font-display text-xs text-foreground">{member.appointedBy.display_name}</p>
                      <p className="font-mono text-[10px] text-muted">{member.appointedBy.email}</p>
                    </>
                  ) : (
                    <span className="font-mono text-[10px] text-muted italic">—</span>
                  )}
                </div>

                {/* Date */}
                <div className="text-right">
                  <p className="font-mono text-[10px] text-muted whitespace-nowrap">
                    {new Date(member.council_appointed_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="default"
            size="sm"
            disabled={currentPage === 1 || loading}
            onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchMembers(p); }}
          >
            ← Prev
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            page {currentPage} of {lastPage}
          </span>
          <Button
            variant="default"
            size="sm"
            disabled={currentPage === lastPage || loading}
            onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchMembers(p); }}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Overlord hint */}
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted text-center">
        To grant or revoke council access, use the{' '}
        {user.is_overlord ? (
          <Link href="/overlord" className="text-[#8A2BE2] hover:underline">Overlord obelisk</Link>
        ) : (
          <span className="text-foreground">Overlord obelisk</span>
        )}
        .
      </p>
    </div>
  );
}
