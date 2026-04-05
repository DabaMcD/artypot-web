'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CouncilMember } from '@/lib/types';

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
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-muted hover:text-foreground transition-colors text-sm">
          ← Admin
        </Link>
        <span className="text-border">/</span>
        <h1 className="text-xl font-bold text-foreground">Council Members</h1>
        <span className="ml-auto text-sm text-muted">{total} member{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-b border-border bg-surface-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Member</span>
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Appointed by</span>
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Date</span>
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-surface" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-muted text-sm">No council members found.</div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div key={member.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-4">
                {/* Member info */}
                <div>
                  <p className="text-sm font-medium text-foreground">{member.user.name}</p>
                  <p className="text-xs text-muted">{member.user.email}</p>
                </div>

                {/* Appointed by */}
                <div className="text-right">
                  {member.appointed_by ? (
                    <>
                      <p className="text-xs text-foreground">{member.appointed_by.name}</p>
                      <p className="text-xs text-muted">{member.appointed_by.email}</p>
                    </>
                  ) : (
                    <span className="text-xs text-muted italic">—</span>
                  )}
                </div>

                {/* Date */}
                <div className="text-right">
                  <p className="text-xs text-muted whitespace-nowrap">
                    {new Date(member.appointed_at).toLocaleDateString('en-US', {
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
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={currentPage === 1 || loading}
            onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchMembers(p); }}
            className="px-4 py-2 text-sm border border-border rounded-lg text-foreground disabled:opacity-40 hover:border-foreground/30 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-muted">Page {currentPage} of {lastPage}</span>
          <button
            type="button"
            disabled={currentPage === lastPage || loading}
            onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchMembers(p); }}
            className="px-4 py-2 text-sm border border-border rounded-lg text-foreground disabled:opacity-40 hover:border-foreground/30 transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* Overlord hint */}
      <p className="text-xs text-muted text-center mt-6">
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
