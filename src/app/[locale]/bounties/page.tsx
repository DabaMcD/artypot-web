'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link } from '@/i18n/routing';
import { bounties as bountiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Bounty, PaginatedResponse, BountyStatus } from '@/lib/types';
import BountyCard from '@/components/BountyCard';

const STATUS_FILTERS: { value: BountyStatus | ''; label: string }[] = [
  { value: '',          label: 'All' },
  { value: 'open',      label: 'Open' },
  { value: 'pending',   label: 'Pending Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'paid_out',  label: 'Paid Out' },
];

export default function BountiesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResponse<Bounty> | null>(null);
  const [status, setStatus] = useState<BountyStatus | ''>('open');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bountiesApi.list({ status: status || undefined, page });
      setData(res);
    } catch {
      setError('Failed to load bounties.');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = (val: BountyStatus | '') => {
    setStatus(val);
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-7 py-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Bounties</h1>
          <p className="text-muted">Fund the work you want to see made.</p>
        </div>
        {user && (
          <Link
            href="/bounties/new"
            className="shrink-0 bg-fan text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-fan-dim transition-colors"
          >
            + New Bounty
          </Link>
        )}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleStatusChange(value)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
              status === value
                ? 'bg-fan text-black border-fan font-semibold'
                : 'bg-surface border-border text-muted hover:border-fan/50 hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      {error ? (
        <div className="text-red-400 text-sm">{error}</div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-20 text-muted border border-dashed border-border rounded-xl">
          No bounties found.{' '}
          {user && (
            <Link href="/bounties/new" className="text-fan hover:underline">
              Create one
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="text-xs text-muted mb-4">
            {data.total} {data.total !== 1 ? 'bounties' : 'bounty'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.data.map((bounty) => (
              <BountyCard key={bounty.id} bounty={bounty} />
            ))}
          </div>

          {data.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-4 py-2 text-sm bg-surface border border-border rounded-lg disabled:opacity-30 hover:border-fan/50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {data.current_page} of {data.last_page}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === data.last_page}
                className="px-4 py-2 text-sm bg-surface border border-border rounded-lg disabled:opacity-30 hover:border-fan/50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
