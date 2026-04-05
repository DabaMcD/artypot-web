'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { votives as votivesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PublicUserVotive } from '@/lib/types';
type SortKey = 'date' | 'amount';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  completed: 'Submitted',
  approved: 'Approved',
  paid_out: 'Paid Out',
  revoked: 'Revoked',
};

const STATUS_COLORS: Record<string, string> = {
  open:      'bg-green-900/40 text-green-400 border border-green-800/50',
  completed: 'bg-blue-900/40 text-blue-400 border border-blue-800/50',
  approved:  'bg-creator/20 text-creator border border-creator/30',
  paid_out:  'bg-brand/20 text-brand border border-brand/30',
  revoked:   'bg-red-900/40 text-red-400 border border-red-800/50',
};

export default function MyVotivesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [votives, setVotives] = useState<PublicUserVotive[]>([]);
  const [sort, setSort] = useState<SortKey>('date');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalActiveAmount, setTotalActiveAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const load = useCallback((s: SortKey, p: number) => {
    setLoading(true);
    votivesApi
      .list({ sort: s, page: p })
      .then((res) => {
        setVotives(res.data);
        setLastPage(res.last_page);
        setTotal(res.total);
        setTotalActiveAmount(res.total_active_amount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    load(sort, page);
  }, [user, sort, page, load]);

  const handleSort = (s: SortKey) => {
    if (s === sort) return;
    setSort(s);
    setPage(1);
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Votives</h1>
          <p className="text-sm text-muted mt-0.5">
            {total} active votive{total !== 1 ? 's' : ''}
            {totalActiveAmount !== null && totalActiveAmount > 0 && (
              <> · <span className="text-foreground">${totalActiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total</span></>
            )}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 text-sm text-muted hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted uppercase tracking-wider mr-1">Sort by</span>
        {(['date', 'amount'] as SortKey[]).map((s) => (
          <button
            key={s}
            onClick={() => handleSort(s)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              sort === s
                ? 'bg-brand/15 border-brand/40 text-brand font-medium'
                : 'border-border text-muted hover:text-foreground hover:border-foreground/20'
            }`}
          >
            {s === 'date' ? 'Most Recent' : 'Highest Amount'}
          </button>
        ))}
      </div>

      {/* Votive list */}
      {loading ? (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0">
              <div className="space-y-1.5">
                <div className="h-4 w-56 bg-surface-2 animate-pulse rounded" />
                <div className="h-3 w-28 bg-surface-2 animate-pulse rounded" />
              </div>
              <div className="h-5 w-14 bg-surface-2 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : votives.length === 0 ? (
        <div className="text-center py-12 text-muted border border-dashed border-border rounded-xl">
          No active votives.{' '}
          <Link href="/pots" className="text-brand hover:underline">Browse pots</Link>
          {' '}to start backing projects.
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {votives.map((votive, i) => {
            const status = votive.pot?.status;
            return (
              <div
                key={votive.id}
                className={`flex items-center gap-4 px-5 py-4 ${i < votives.length - 1 ? 'border-b border-border' : ''}`}
              >
                {/* Pot info */}
                <div className="flex-1 min-w-0">
                  {votive.pot ? (
                    <Link
                      href={`/pots/${votive.pot_id}`}
                      className="text-sm font-medium text-foreground hover:text-brand transition-colors block truncate"
                    >
                      {votive.pot.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted">Project #{votive.pot_id}</span>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[status] ?? ''}`}>
                        {STATUS_LABELS[status] ?? status}
                      </span>
                    )}
                    {votive.expires_at && (
                      <span className="text-xs text-muted">
                        Expires{' '}
                        {new Date(votive.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      Placed{' '}
                      {new Date(votive.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <span className="text-brand font-bold text-sm shrink-0">
                  ${Number(votive.amount).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="text-sm px-4 py-2 border border-border rounded-lg text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-30"
          >
            ← Previous
          </button>
          <span className="text-sm text-muted">
            Page {page} of {lastPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage || loading}
            className="text-sm px-4 py-2 border border-border rounded-lg text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
