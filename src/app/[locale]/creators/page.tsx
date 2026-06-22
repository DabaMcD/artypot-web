'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { creators as creatorsApi } from '@/lib/api';
import type { CreatorDirectoryEntry, CreatorFacets, PaginatedResponse } from '@/lib/types';
import CreatorCard from '@/components/CreatorCard';
import { Pills, ControlGroup, type PillOption } from '@/components/browse/Pills';
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
  const [master, setMaster] = useState<Master>('verified');
  const [platform, setPlatform] = useState('');
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
        platform: platform || undefined,
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
    const next = val as Master;
    setMaster(next);
    setSort('newest'); // sort sets differ between the two faces
    setPlatform('');
    setPage(1);
  };
  const handlePlatform = (val: string) => {
    setPlatform(val);
    setPage(1);
  };
  const handleSort = (val: string) => {
    setSort(val);
    setPage(1);
  };

  const facet = facets?.[master];

  const masterOptions: PillOption[] = [
    { value: 'verified', label: t('master.verified'), count: facets?.verified.total },
    { value: 'unverified', label: t('master.unverified'), count: facets?.unverified.total },
  ];

  // Platform chips: "All" + every platform that actually has results under the
  // selected master (counts are scoped to that master).
  const platformOptions: PillOption[] = [
    { value: '', label: t('platformAll'), count: facet?.total },
    ...ALL_PLATFORMS.filter((p) => (facet?.platforms[p] ?? 0) > 0).map((p) => ({
      value: p,
      label: platformLabel(p),
      count: facet?.platforms[p],
    })),
  ];

  const sortOptions: PillOption[] = SORTS[master].map((s) => ({ value: s.value, label: t(s.labelKey) }));

  return (
    <div className="max-w-6xl mx-auto px-7 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-1">{t('title')}</h1>
        <p className="text-muted">{t('subtitle')}</p>
      </div>

      {/* Master filter */}
      <div className="mb-5">
        <Pills options={masterOptions} value={master} onChange={handleMaster} ariaLabel={t('master.label')} />
      </div>

      {/* Sub-filters */}
      <div className="space-y-4 mb-7">
        <ControlGroup label={t('controls.platform')}>
          <Pills options={platformOptions} value={platform} onChange={handlePlatform} ariaLabel={t('controls.platform')} />
        </ControlGroup>
        <ControlGroup label={t('controls.sort')}>
          <Pills options={sortOptions} value={sort} onChange={handleSort} ariaLabel={t('controls.sort')} />
        </ControlGroup>
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
          {t('empty')}
        </div>
      ) : (
        <>
          <div className="text-xs text-muted mb-4">{t('count', { count: data.total })}</div>
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
