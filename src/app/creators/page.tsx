'use client';

import { useState, useEffect, useCallback } from 'react';
import { creators as creatorsApi } from '@/lib/api';
import type { Creator, PaginatedResponse } from '@/lib/types';
import CreatorCard from '@/components/CreatorCard';
import { SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';

type SortOption = 'newest' | 'most_backed' | 'most_completed';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest',         label: 'newest' },
  { value: 'most_backed',   label: 'most bounties' },
  { value: 'most_completed', label: 'most completed' },
];

export default function CreatorsPage() {
  const [data, setData] = useState<PaginatedResponse<Creator> | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await creatorsApi.list({
        q: debouncedQuery || undefined,
        sort,
        page,
      });
      setData(res);
    } catch {
      setError('Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, sort, page]);

  useEffect(() => { load(); }, [load]);

  const handleSortChange = (val: SortOption) => { setSort(val); setPage(1); };

  return (
    <div className="space-y-6 pt-2">
      <div>
        <SectionLabel>fan</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">search creators</h1>
        <p className="text-sm text-muted mt-1">artists, musicians, and makers whose communities are calling for their best work.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="search by name, handle, or domain…"
          className="sm:w-72"
        />

        {/* Sort */}
        <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface shrink-0 ml-auto">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleSortChange(value)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                sort === value
                  ? 'bg-surface-2 text-foreground'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {error ? (
        <p className="text-sm text-bad">{error}</p>
      ) : loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface animate-pulse rounded" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <Empty
          message={debouncedQuery
            ? `no results for "${debouncedQuery}"`
            : 'no verified creators yet'}
        />
      ) : (
        <>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {data.total} {data.total === 1 ? 'result' : 'results'}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>

          {/* Pagination */}
          {data.last_page > 1 && (
            <div className="flex items-center justify-center gap-3 mt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                ← prev
              </Button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {data.current_page} / {data.last_page}
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === data.last_page}
              >
                next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
