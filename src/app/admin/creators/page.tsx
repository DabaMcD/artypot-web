'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AdminCreator, CreatorW9Status } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ClaimedBadge({ claimed }: { claimed: boolean }) {
  return claimed ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-green-900/30 border-green-700/40 text-green-300">claimed</span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-zinc-800 border-zinc-700 text-zinc-400">unclaimed</span>
  );
}

function W9Badge({ status }: { status: CreatorW9Status | null }) {
  if (!status) return <span className="text-xs text-muted">no W-9</span>;
  const styles: Record<CreatorW9Status, string> = {
    initiated:   'bg-amber-900/30 border-amber-700/40 text-amber-300',
    completed:   'bg-blue-900/30 border-blue-700/40 text-blue-300',
    tin_matched: 'bg-green-900/30 border-green-700/40 text-green-300',
    tin_failed:  'bg-red-900/30 border-red-700/40 text-red-300',
  };
  const labels: Record<CreatorW9Status, string> = {
    initiated:   'W-9 started',
    completed:   'W-9 done',
    tin_matched: 'TIN ✓',
    tin_failed:  'TIN failed',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ── Creator detail drawer ─────────────────────────────────────────────────────

type CreatorDetail = AdminCreator & {
  w9_records: Array<{
    id: number;
    tax_year: number;
    status: CreatorW9Status;
    completed_at: string | null;
    tin_matched_at: string | null;
    created_at: string;
  }>;
};

function CreatorDrawer({ creator, onClose }: { creator: CreatorDetail; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{creator.display_name}</h2>
            {creator.user && <p className="text-sm text-muted">{creator.user.email}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors text-xl leading-none ml-4">×</button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          <ClaimedBadge claimed={creator.claimed} />
          <W9Badge status={creator.w9_status} />
        </div>

        {/* Stats */}
        <dl className="space-y-2 text-sm mb-5">
          <div className="flex justify-between">
            <dt className="text-muted">Creator ID</dt>
            <dd className="text-foreground font-mono">#{creator.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Created</dt>
            <dd className="text-foreground">{new Date(creator.created_at).toLocaleDateString()}</dd>
          </div>
          {creator.claimed_at && (
            <div className="flex justify-between">
              <dt className="text-muted">Claimed</dt>
              <dd className="text-foreground">{new Date(creator.claimed_at).toLocaleDateString()}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Total earned</dt>
            <dd className="text-foreground">${Number(creator.amount_earned ?? 0).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Open pots</dt>
            <dd className="text-foreground">{creator.projects_open ?? 0}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Finished pots</dt>
            <dd className="text-foreground">{creator.projects_finished ?? 0}</dd>
          </div>
        </dl>

        {/* Claimed-by user */}
        {creator.user && (
          <div className="border border-border rounded-xl p-4 bg-surface-2 mb-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Claimed by</h3>
            <Link
              href={`/users/${creator.user.id}`}
              className="font-medium text-foreground hover:text-fan transition-colors text-sm"
            >
              {creator.user.name} →
            </Link>
            <p className="text-xs text-muted mt-0.5">{creator.user.email}</p>
          </div>
        )}

        {/* W-9 history */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">W-9 History</h3>
          {creator.w9_records.length === 0 ? (
            <p className="text-sm text-muted italic">No W-9 records.</p>
          ) : (
            <div className="space-y-2">
              {creator.w9_records.map((w) => (
                <div key={w.id} className="bg-surface-2 border border-border rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{w.tax_year}</p>
                    {w.completed_at && (
                      <p className="text-xs text-muted">Completed {new Date(w.completed_at).toLocaleDateString()}</p>
                    )}
                    {w.tin_matched_at && (
                      <p className="text-xs text-muted">TIN matched {new Date(w.tin_matched_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <W9Badge status={w.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5">
          <Link
            href={`/creators/${creator.id}`}
            target="_blank"
            className="text-sm text-creator hover:underline"
          >
            View creator profile →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type ClaimedFilter = 'all' | 'true' | 'false';

export default function AdminCreatorsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [search, setSearch]           = useState('');
  const [claimedFilter, setClaimedFilter] = useState<ClaimedFilter>('all');
  const [creators, setCreators]       = useState<AdminCreator[]>([]);
  const [page, setPage]               = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<CreatorDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const fetchCreators = useCallback(async (q: string, claimed: ClaimedFilter, p: number) => {
    setLoading(true);
    try {
      const res = await adminApi.listCreators({
        q: q || undefined,
        claimed: claimed !== 'all' ? claimed : 'all',
        page: p,
      });
      setCreators(res.data);
      setPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') {
      fetchCreators('', 'all', 1);
    }
  }, [user, fetchCreators]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchCreators(val, claimedFilter, 1);
    }, 350);
  };

  const handleClaimedChange = (f: ClaimedFilter) => {
    setClaimedFilter(f);
    setPage(1);
    fetchCreators(search, f, 1);
  };

  const openDetail = async (s: AdminCreator) => {
    setLoadingDetail(true);
    try {
      const res = await adminApi.getCreator(s.id);
      setSelected(res.data as CreatorDetail);
    } catch {
      // fallback: show what we have without w9_records
      setSelected({ ...s, w9_records: [] } as CreatorDetail);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (authLoading || !user || user.role !== 'council') return null;

  const CLAIMED_TABS: { label: string; value: ClaimedFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Claimed', value: 'true' },
    { label: 'Unclaimed', value: 'false' },
  ];

  return (
    <>
      {selected && <CreatorDrawer creator={selected} onClose={() => setSelected(null)} />}

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-muted hover:text-foreground transition-colors text-sm">← Admin</Link>
          <span className="text-border">/</span>
          <h1 className="text-xl font-bold text-foreground">Creators</h1>
          <span className="ml-auto text-sm text-muted">{total} total</span>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors"
          />
          <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1">
            {CLAIMED_TABS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleClaimedChange(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  claimedFilter === value
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-16 text-muted text-sm">No creators found.</div>
        ) : (
          <div className="space-y-2">
            {creators.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openDetail(s)}
                disabled={loadingDetail}
                className="w-full text-left bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-foreground/20 transition-colors disabled:opacity-60"
              >
                {/* Avatar initial */}
                <div className="w-8 h-8 rounded-full bg-creator/20 flex items-center justify-center text-creator text-xs font-bold shrink-0">
                  {s.display_name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm truncate">{s.display_name}</span>
                    <ClaimedBadge claimed={s.claimed} />
                    <W9Badge status={s.w9_status} />
                  </div>
                  {s.user && (
                    <p className="text-xs text-muted truncate">{s.user.name} · {s.user.email}</p>
                  )}
                </div>

                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-xs text-muted">${Number(s.amount_earned ?? 0).toFixed(0)} earned</p>
                  <p className="text-xs text-muted">{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              disabled={page === 1 || loading}
              onClick={() => { const p = page - 1; fetchCreators(search, claimedFilter, p); }}
              className="px-4 py-2 text-sm border border-border rounded-lg text-foreground disabled:opacity-40 hover:border-foreground/30 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-muted">Page {page} of {lastPage}</span>
            <button
              type="button"
              disabled={page === lastPage || loading}
              onClick={() => { const p = page + 1; fetchCreators(search, claimedFilter, p); }}
              className="px-4 py-2 text-sm border border-border rounded-lg text-foreground disabled:opacity-40 hover:border-foreground/30 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
