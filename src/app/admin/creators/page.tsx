'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AdminCreator, CreatorW9Status } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ClaimedBadge({ claimed }: { claimed: boolean }) {
  return claimed ? (
    <Badge tone="good">claimed</Badge>
  ) : (
    <Badge tone="default">unclaimed</Badge>
  );
}

function W9Badge({ status }: { status: CreatorW9Status | null }) {
  if (!status) return <span className="font-mono text-[10px] uppercase tracking-widest text-muted">no W-9</span>;
  const tones: Record<CreatorW9Status, 'warn' | 'info' | 'good' | 'bad'> = {
    initiated:   'warn',
    completed:   'info',
    tin_matched: 'good',
    tin_failed:  'bad',
  };
  const labels: Record<CreatorW9Status, string> = {
    initiated:   'W-9 started',
    completed:   'W-9 done',
    tin_matched: 'TIN ✓',
    tin_failed:  'TIN failed',
  };
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}

// ── Creator detail modal ──────────────────────────────────────────────────────

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

function CreatorModal({ creator, onClose }: { creator: CreatorDetail; onClose: () => void }) {
  return (
    <Modal title={creator.display_name} onClose={onClose} lg>
      {/* Email */}
      {creator.user && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-4">{creator.user.email}</p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        <ClaimedBadge claimed={creator.claimed} />
        <W9Badge status={creator.w9_status} />
      </div>

      {/* Stats */}
      <Card accent className="mb-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted font-display">Creator ID</dt>
            <dd className="font-mono tabular-nums text-foreground">#{creator.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted font-display">Created</dt>
            <dd className="font-mono tabular-nums text-foreground">{new Date(creator.created_at).toLocaleDateString()}</dd>
          </div>
          {creator.claimed_at && (
            <div className="flex justify-between">
              <dt className="text-muted font-display">Claimed</dt>
              <dd className="font-mono tabular-nums text-foreground">{new Date(creator.claimed_at).toLocaleDateString()}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted font-display">Total earned</dt>
            <dd className="font-mono tabular-nums text-foreground">${Number(creator.amount_earned ?? 0).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted font-display">Open pots</dt>
            <dd className="font-mono tabular-nums text-foreground">{creator.projects_open ?? 0}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted font-display">Finished pots</dt>
            <dd className="font-mono tabular-nums text-foreground">{creator.projects_finished ?? 0}</dd>
          </div>
        </dl>
      </Card>

      {/* Claimed-by user */}
      {creator.user && (
        <Card accent className="mb-4">
          <SectionLabel className="mb-2">Claimed by</SectionLabel>
          <Link
            href={`/users/${creator.user.id}`}
            className="font-display font-medium text-foreground hover:text-fan transition-colors text-sm"
          >
            {creator.user.name} →
          </Link>
          <p className="font-mono text-[10px] text-muted mt-0.5">{creator.user.email}</p>
        </Card>
      )}

      {/* W-9 history */}
      <div>
        <SectionLabel className="mb-2">W-9 History</SectionLabel>
        {creator.w9_records.length === 0 ? (
          <Empty message="No W-9 records." />
        ) : (
          <div className="space-y-2">
            {creator.w9_records.map((w) => (
              <Card key={w.id} accent>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono tabular-nums text-sm text-foreground">{w.tax_year}</p>
                    {w.completed_at && (
                      <p className="font-mono text-[10px] text-muted">Completed {new Date(w.completed_at).toLocaleDateString()}</p>
                    )}
                    {w.tin_matched_at && (
                      <p className="font-mono text-[10px] text-muted">TIN matched {new Date(w.tin_matched_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <W9Badge status={w.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <Link
          href={`/creators/${creator.id}`}
          target="_blank"
          className="font-mono text-[10px] uppercase tracking-widest text-creator hover:underline"
        >
          View creator profile →
        </Link>
      </div>
    </Modal>
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
    { label: 'All',       value: 'all' },
    { label: 'Claimed',   value: 'true' },
    { label: 'Unclaimed', value: 'false' },
  ];

  return (
    <>
      {selected && <CreatorModal creator={selected} onClose={() => setSelected(null)} />}

      <div className="space-y-6 pt-2 max-w-3xl">
        {/* Header */}
        <div>
          <SectionLabel className="mb-1">council · admin</SectionLabel>
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display font-bold text-[28px]">Creators</h1>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">{total} total</span>
              <Link href="/admin">
                <Button variant="ghost" size="sm">← admin</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name…"
            className="flex-1"
          />
          <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
            {CLAIMED_TABS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleClaimedChange(value)}
                className={`px-3 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  claimedFilter === value
                    ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]'
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
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />
              ))}
            </div>
          </Card>
        ) : creators.length === 0 ? (
          <Empty message="No creators found." />
        ) : (
          <Card>
            <div className="divide-y divide-border -mx-5 -my-4">
              {creators.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openDetail(s)}
                  disabled={loadingDetail}
                  className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-surface-2 transition-colors disabled:opacity-60"
                >
                  {/* Avatar initial */}
                  <div className="w-8 h-8 rounded-full bg-creator/20 flex items-center justify-center text-creator font-mono text-xs font-bold shrink-0">
                    {s.display_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-medium text-foreground text-sm truncate">{s.display_name}</span>
                      <ClaimedBadge claimed={s.claimed} />
                      <W9Badge status={s.w9_status} />
                    </div>
                    {s.user && (
                      <p className="font-mono text-[10px] text-muted truncate">{s.user.name} · {s.user.email}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="font-mono tabular-nums text-[10px] text-muted">${Number(s.amount_earned ?? 0).toFixed(0)} earned</p>
                    <p className="font-mono text-[10px] text-muted">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="default"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => { const p = page - 1; fetchCreators(search, claimedFilter, p); }}
            >
              ← Prev
            </Button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">
              Page {page} of {lastPage}
            </span>
            <Button
              variant="default"
              size="sm"
              disabled={page === lastPage || loading}
              onClick={() => { const p = page + 1; fetchCreators(search, claimedFilter, p); }}
            >
              Next →
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
