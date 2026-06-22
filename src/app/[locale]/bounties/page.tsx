'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { bounties as bountiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Bounty, PaginatedResponse } from '@/lib/types';
import BountyCard from '@/components/BountyCard';
import { FilterDropdown, type FilterOption } from '@/components/browse/BrowseControls';

type State = 'open' | 'completed';
type CreatorStatus = 'verified' | 'unverified';
type Sort = 'newest' | 'most_backed' | 'recently_completed';

export default function BountiesPage() {
  const { user } = useAuth();
  const t = useTranslations('Bounties');

  // null on an optional filter means "all" — there is no explicit All option.
  const [state, setState] = useState<State | null>('open');
  const [creatorStatus, setCreatorStatus] = useState<CreatorStatus | null>(null);
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedResponse<Bounty> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bountiesApi.list({
        state: state ?? 'all', // cleared = all (still excludes revoked)
        creator_status: creatorStatus ?? undefined,
        sort,
        page,
      });
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
  // state to "completed"; moving away from completed reverts to "newest".
  const handleSort = (val: string | null) => {
    const next = (val ?? 'newest') as Sort;
    setSort(next);
    if (next === 'recently_completed') setState('completed');
    setPage(1);
  };
  const handleState = (val: string | null) => {
    const next = val as State | null;
    setState(next);
    if (next !== 'completed' && sort === 'recently_completed') setSort('newest');
    setPage(1);
  };
  const handleCreator = (val: string | null) => {
    setCreatorStatus(val as CreatorStatus | null);
    setPage(1);
  };

  const stateOptions: FilterOption[] = [
    { value: 'open', label: t('filters.open') },
    { value: 'completed', label: t('filters.completed') },
  ];
  const creatorOptions: FilterOption[] = [
    { value: 'verified', label: t('creatorFilter.verified') },
    { value: 'unverified', label: t('creatorFilter.unverified') },
  ];
  const sortOptions: FilterOption[] = [
    { value: 'newest', label: t('sort.newest') },
    { value: 'most_backed', label: t('sort.mostBacked') },
    { value: 'recently_completed', label: t('sort.recentlyCompleted') },
  ];

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-7 py-10">
      <div className="flex items-start justify-between gap-4 mb-7">
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

      {/* Controls — one wrapping row; sort + count pushed to the right. */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <FilterDropdown label={t('controls.status')} value={state} options={stateOptions} onChange={handleState} />
        <FilterDropdown label={t('controls.creator')} value={creatorStatus} options={creatorOptions} onChange={handleCreator} />
        <div className="ml-auto flex items-center gap-3">
          {data && !loading && (
            <span className="text-xs text-muted whitespace-nowrap tabular-nums">{t('count', { count: data.total })}</span>
          )}
          <FilterDropdown
            label={t('controls.sort')}
            value={sort}
            options={sortOptions}
            onChange={handleSort}
            clearable={false}
            icon="sort"
            align="right"
          />
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
