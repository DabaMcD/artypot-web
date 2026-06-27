'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { creators as creatorsApi } from '@/lib/api';
import type { CreatorDirectoryEntry, CreatorFacets, PaginatedResponse } from '@/lib/types';
import CreatorCard from '@/components/CreatorCard';
import {
  FilterDropdown,
  SegmentedToggle,
  type FilterOption,
  type SegmentOption,
} from '@/components/browse/BrowseControls';
import { ALL_PLATFORMS, platformLabel } from '@/lib/platforms';

type Master = 'verified' | 'unverified';

const SORTS: Record<Master, { value: string; labelKey: string }[]> = {
  verified: [
    { value: 'newest', labelKey: 'sort.newest' },
    { value: 'most_open', labelKey: 'sort.mostOpen' },
    { value: 'most_completed', labelKey: 'sort.mostCompleted' },
    { value: 'most_backed', labelKey: 'sort.mostBacked' },
  ],
  unverified: [
    { value: 'newest', labelKey: 'sort.newest' },
    { value: 'most_bounties', labelKey: 'sort.mostBounties' },
    { value: 'most_backed', labelKey: 'sort.mostBacked' },
  ],
};

export default function CreatorsPage() {
  const t = useTranslations('Creators');

  const [master, setMaster] = useState<Master>('unverified');
  const [platform, setPlatform] = useState<string | null>(null); // null = all platforms
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedResponse<CreatorDirectoryEntry> | null>(null);
  const [facets, setFacets] = useState<CreatorFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    creatorsApi.facets().then((res) => setFacets(res.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await creatorsApi.browse({
        type: master,
        platform: platform ?? undefined,
        sort,
        page,
      });
      setData(res);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [master, platform, sort, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMaster = (val: string) => {
    setMaster(val as Master);
    setSort('newest'); // the two faces expose different sorts
    setPlatform(null);
    setPage(1);
  };
  const handlePlatform = (val: string | null) => {
    setPlatform(val);
    setPage(1);
  };
  const handleSort = (val: string | null) => {
    setSort(val ?? 'newest');
    setPage(1);
  };

  const facet = facets?.[master];

  const masterOptions: SegmentOption[] = [
    { value: 'verified', label: t('master.verified'), count: facets?.verified.total },
    { value: 'unverified', label: t('master.unverified'), count: facets?.unverified.total },
  ];

  // Only platforms that actually have results under the current master, counted.
  const platformOptions: FilterOption[] = ALL_PLATFORMS.filter((p) => (facet?.platforms[p] ?? 0) > 0).map((p) => ({
    value: p,
    label: platformLabel(p),
    count: facet?.platforms[p],
  }));

  const sortOptions: FilterOption[] = SORTS[master].map((s) => ({ value: s.value, label: t(s.labelKey) }));

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-7 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground mb-1">{t('title')}</h1>
        <p className="text-muted">{t('subtitle')}</p>
      </div>

      {/* Master axis */}
      <div className="mb-3">
        <SegmentedToggle value={master} options={masterOptions} onChange={handleMaster} ariaLabel={t('master.label')} />
      </div>

      {/* Sub-filters — one wrapping row; sort + count to the right. */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {platformOptions.length > 0 && (
          <FilterDropdown label={t('controls.platform')} value={platform} options={platformOptions} onChange={handlePlatform} />
        )}
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
        <div className="text-center py-20 text-muted border border-dashed border-border rounded-xl">{t('empty')}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.data.map((entry) => (
              <CreatorCard key={`${master}-${entry.id}`} creator={entry} />
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
