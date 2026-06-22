'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { bounties as bountiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Bounty, PaginatedResponse } from '@/lib/types';
import BountyCard from '@/components/BountyCard';
import { Pills, ControlGroup, type PillOption } from '@/components/browse/Pills';

type State = 'all' | 'open' | 'completed';
type CreatorStatus = 'all' | 'verified' | 'unverified';
type Sort = 'newest' | 'most_backed' | 'recently_completed';

export default function BountiesPage() {
  const { user } = useAuth();
  const t = useTranslations('Bounties');
  const [data, setData] = useState<PaginatedResponse<Bounty> | null>(null);
  const [state, setState] = useState<State>('open');
  const [creatorStatus, setCreatorStatus] = useState<CreatorStatus>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bountiesApi.list({ state, creator_status: creatorStatus, sort, page });
      setData(res);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [state, creatorStatus, sort, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  // "Recently completed" only makes sense over finished bounties, so it pins the
  // state filter to "completed"; picking any other state drops back to "newest".
  const handleSort = (val: string) => {
    const next = val as Sort;
    setSort(next);
    if (next === 'recently_completed') setState('completed');
    setPage(1);
  };
  const handleState = (val: string) => {
    const next = val as State;
    setState(next);
    if (next !== 'completed' && sort === 'recently_completed') setSort('newest');
    setPage(1);
  };
  const handleCreatorStatus = (val: string) => {
    setCreatorStatus(val as CreatorStatus);
    setPage(1);
  };

  const sortOptions: PillOption[] = [
    { value: 'newest', label: t('sort.newest') },
    { value: 'most_backed', label: t('sort.mostBacked') },
    { value: 'recently_completed', label: t('sort.recentlyCompleted') },
  ];
  const stateOptions: PillOption[] = [
    { value: 'all', label: t('filters.all') },
    { value: 'open', label: t('filters.open') },
    { value: 'completed', label: t('filters.completed') },
  ];
  const creatorOptions: PillOption[] = [
    { value: 'all', label: t('creatorFilter.all') },
    { value: 'verified', label: t('creatorFilter.verified') },
    { value: 'unverified', label: t('creatorFilter.unverified') },
  ];

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

      {/* Controls */}
      <div className="space-y-4 mb-7">
        <ControlGroup label={t('controls.sort')}>
          <Pills options={sortOptions} value={sort} onChange={handleSort} ariaLabel={t('controls.sort')} />
        </ControlGroup>
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <ControlGroup label={t('controls.show')}>
            <Pills options={stateOptions} value={state} onChange={handleState} ariaLabel={t('controls.show')} />
          </ControlGroup>
          <ControlGroup label={t('controls.creator')}>
            <Pills options={creatorOptions} value={creatorStatus} onChange={handleCreatorStatus} ariaLabel={t('controls.creator')} />
          </ControlGroup>
        </div>
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
