'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { bounties as bountiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Bounty, PaginatedResponse, BountyStatus } from '@/lib/types';
import BountyCard from '@/components/BountyCard';

const STATUS_FILTERS: { value: BountyStatus | ''; labelKey: string }[] = [
  { value: '',          labelKey: 'filters.all' },
  { value: 'open',      labelKey: 'filters.open' },
  { value: 'pending',   labelKey: 'filters.pending' },
  { value: 'completed', labelKey: 'filters.completed' },
  { value: 'paid_out',  labelKey: 'filters.paidOut' },
];

export default function BountiesPage() {
  const { user } = useAuth();
  const t = useTranslations('Bounties');
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
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [status, page, t]);

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
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">{t('title')}</h1>
          <p className="text-muted">{t('subtitle')}</p>
        </div>
        {user && (
          <Link
            href="/bounties/new"
            className="shrink-0 bg-fan text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-fan-dim transition-colors"
          >
            {t('newBounty')}
          </Link>
        )}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map(({ value, labelKey }) => (
          <button
            key={value}
            onClick={() => handleStatusChange(value)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
              status === value
                ? 'bg-fan text-black border-fan font-semibold'
                : 'bg-surface border-border text-muted hover:border-fan/50 hover:text-foreground'
            }`}
          >
            {t(labelKey)}
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
          {t('empty.message')}{' '}
          {user && (
            <Link href="/bounties/new" className="text-fan hover:underline">
              {t('empty.createOne')}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="text-xs text-muted mb-4">
            {t('count', { count: data.total })}
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
                {t('pagination.previous')}
              </button>
              <span className="text-sm text-muted">
                {t('pagination.pageOf', { current: data.current_page, total: data.last_page })}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === data.last_page}
                className="px-4 py-2 text-sm bg-surface border border-border rounded-lg disabled:opacity-30 hover:border-fan/50 transition-colors"
              >
                {t('pagination.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
