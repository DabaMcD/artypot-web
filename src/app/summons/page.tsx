'use client';

import { useState, useEffect, useCallback } from 'react';
import { summons as summonsApi } from '@/lib/api';
import type { Summon, PaginatedResponse } from '@/lib/types';
import SummonCard from '@/components/SummonCard';

type StatusFilter = 'all' | 'answered' | 'unanswered';
type SortOption = 'newest' | 'most_summoned' | 'most_completed';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'answered',   label: 'Answered' },
  { value: 'unanswered', label: 'Unanswered' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest',         label: 'Newly Added' },
  { value: 'most_summoned',  label: 'Most Summoned' },
  { value: 'most_completed', label: 'Most Completed' },
];

export default function SummonedOnesPage() {
  const [data, setData] = useState<PaginatedResponse<Summon> | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce search
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
      const res = await summonsApi.list({
        q: debouncedQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort,
        page,
      });
      setData(res);
    } catch {
      setError('Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, statusFilter, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = (val: StatusFilter) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleSortChange = (val: SortOption) => {
    setSort(val);
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">The Summoned Ones</h1>
        <p className="text-muted">Artists, musicians, and makers whose communities are calling for their best work.</p>
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Search */}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search by name, handle, or domain…"
          className="w-full sm:w-72 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
        />

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg p-1 shrink-0">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleStatusChange(value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === value
                  ? 'bg-creator text-black'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <span className="text-xs text-muted hidden sm:inline">Sort:</span>
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            {SORT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleSortChange(value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
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
      </div>

      {/* Results */}
      {error ? (
        <div className="text-red-400 text-sm">{error}</div>
      ) : loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-20 text-muted">
          {debouncedQuery
            ? `No results for "${debouncedQuery}".`
            : statusFilter !== 'all'
              ? `No ${statusFilter} summons yet.`
              : 'No summons yet.'}
        </div>
      ) : (
        <>
          {/* Result count */}
          <p className="text-xs text-muted mb-4">
            {data.total} {data.total === 1 ? 'result' : 'results'}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((summon) => (
              <SummonCard key={summon.id} summon={summon} />
            ))}
          </div>

          {/* Pagination */}
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
