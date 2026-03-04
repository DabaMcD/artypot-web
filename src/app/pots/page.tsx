'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { pots as potsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Pot, PaginatedResponse, PotStatus } from '@/lib/types';
import PotCard from '@/components/PotCard';

const STATUS_FILTERS: { value: PotStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid_out', label: 'Paid Out' },
];

export default function PotsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResponse<Pot> | null>(null);
  const [status, setStatus] = useState<PotStatus | ''>('open');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await potsApi.list({ status: status || undefined, page });
      setData(res);
    } catch {
      setError('Failed to load pots.');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = (val: PotStatus | '') => {
    setStatus(val);
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Pots</h1>
          <p className="text-muted">Fund the work you want to see made.</p>
        </div>
        {user && (
          <Link
            href="/pots/new"
            className="shrink-0 bg-brand text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-brand-dim transition-colors"
          >
            + New Pot
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
                ? 'bg-brand text-black border-brand font-semibold'
                : 'bg-surface border-border text-muted hover:border-brand/50 hover:text-foreground'
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-20 text-muted border border-dashed border-border rounded-xl">
          No pots found.{' '}
          {user && (
            <Link href="/pots/new" className="text-brand hover:underline">
              Create one
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="text-xs text-muted mb-4">
            {data.total} pot{data.total !== 1 ? 's' : ''}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((pot) => (
              <PotCard key={pot.id} pot={pot} />
            ))}
          </div>

          {data.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-4 py-2 text-sm bg-surface border border-border rounded-lg disabled:opacity-30 hover:border-brand/50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {data.current_page} of {data.last_page}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === data.last_page}
                className="px-4 py-2 text-sm bg-surface border border-border rounded-lg disabled:opacity-30 hover:border-brand/50 transition-colors"
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
