'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bounties as bountiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { Bounty, BountyStatus } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';
import { Input, Textarea, FieldLabel, FieldHint } from '@/components/ui/Input';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import ShareButton from '@/components/ShareButton';

// ── Constants ─────────────────────────────────────────────────────────────────

type FilterStatus = BountyStatus | '';

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paid Out', value: 'paid_out' },
  { label: 'Revoked', value: 'revoked' },
];

const COMPLETION_BADGE: Record<string, { tone: 'info' | 'good' | 'bad'; label: string }> = {
  pending_review: { tone: 'info', label: 'Pending Review' },
  approved: { tone: 'good', label: 'Approved' },
  rejected: { tone: 'bad', label: 'Rejected' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">{label}</div>
      <div className="font-mono text-[24px] font-medium tabular-nums text-foreground">{value}</div>
    </Card>
  );
}

function Skeleton() {
  return (
    <Card>
      <div className="divide-y divide-border -mx-5 -my-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-surface-2 animate-pulse rounded" />
              <div className="h-3 w-1/3 bg-surface-2 animate-pulse rounded" />
            </div>
            <div className="h-6 w-20 bg-surface-2 animate-pulse rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── BountyRow ─────────────────────────────────────────────────────────────────

interface BountyRowProps {
  bounty: Bounty;
  expanded: boolean;
  onToggleExpand: (id: number) => void;
  onSubmitted: (updated: Bounty) => void;
}

function BountyRow({ bounty, expanded, onToggleExpand, onSubmitted }: BountyRowProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed URL field when expanded for resubmission
  useEffect(() => {
    if (expanded) {
      setUrl(bounty.completion?.submission_url ?? '');
      setNotes('');
      setError(null);
    }
  }, [expanded, bounty.completion?.submission_url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) { setError('Please enter a URL.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await bountiesApi.submitCompletion(bounty.id, url.trim(), notes.trim() || undefined);
      const updated: Bounty = { ...bounty, status: 'pending', completion: res.data };
      onSubmitted(updated);
      toast('Submitted for review!', 'success');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Submission failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const { completion, status } = bounty;

  // Determine action button
  let actionBtn: React.ReactNode = null;
  if (status === 'open') {
    actionBtn = (
      <Button size="sm" onClick={() => onToggleExpand(bounty.id)}>
        {expanded ? 'Cancel' : 'Submit →'}
      </Button>
    );
  } else if (status === 'pending' && completion?.status === 'rejected') {
    actionBtn = (
      <Button size="sm" onClick={() => onToggleExpand(bounty.id)}>
        {expanded ? 'Cancel' : 'Resubmit →'}
      </Button>
    );
  }

  // Metadata line
  const metaParts: string[] = [
    `$${Number(bounty.total_backed).toLocaleString('en-US', { minimumFractionDigits: 2 })} backed`,
  ];
  const backerCount = bounty.backings?.filter((p) => !p.revoked_at).length;
  if (backerCount !== undefined) {
    const fanSingular = bounty.owner_user?.fan_name || 'supporter';
    const fanPlural = bounty.owner_user?.fan_name_plural || bounty.owner_user?.fan_name || 'supporters';
    metaParts.push(`${backerCount} ${backerCount === 1 ? fanSingular : fanPlural}`);
  }
  if (bounty.completed_at) {
    metaParts.push(
      `Completed ${new Date(bounty.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    );
  }
  if (completion?.verified_at) {
    metaParts.push(
      `Verified ${new Date(completion.verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    );
  }

  return (
    <div className="px-5 py-4">
      {/* Main row */}
      <div className="flex items-start gap-4">
        {/* Left */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/bounties/${bounty.id}`}
            className="text-sm font-medium text-foreground hover:text-creator transition-colors block truncate"
          >
            {bounty.title}
          </Link>
          <div className="font-mono text-[10px] text-muted uppercase tracking-widest mt-0.5">
            {metaParts.join(' · ')}
          </div>
        </div>
        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <ShareButton path={`/bounties/${bounty.id}`} title={bounty.title} />
          <BountyStatusBadge status={status} />
          {actionBtn}
        </div>
      </div>

      {/* Completion detail band */}
      {completion && (
        <div className="mt-2 pl-3 border-l-2 border-border space-y-0.5">
          <div className="flex items-center gap-2">
            <a
              href={completion.submission_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-fan hover:underline truncate max-w-xs"
            >
              {completion.submission_url}
            </a>
            {COMPLETION_BADGE[completion.status] && (
              <Badge tone={COMPLETION_BADGE[completion.status].tone}>
                {COMPLETION_BADGE[completion.status].label}
              </Badge>
            )}
          </div>
          {completion.council_notes && (
            <div className="font-mono text-[10px] text-muted">
              Council: &ldquo;{completion.council_notes}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Inline submission form */}
      {expanded && (
        <Card className="mt-3 !bg-surface-2">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              submit completed work
            </div>
            <div>
              <FieldLabel>Link to the work (URL)</FieldLabel>
              <Input
                type="url"
                required
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <FieldHint>Publicly visible</FieldHint>
            </div>
            <div>
              <FieldLabel>Notes (optional)</FieldLabel>
              <Textarea
                rows={2}
                placeholder="Any context for the council…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <FieldHint>Publicly visible</FieldHint>
            </div>
            {error && (
              <div className="bg-[var(--color-bad-soft)] border border-[var(--color-bad)] text-[var(--color-bad)] rounded px-3 py-2 text-xs">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onToggleExpand(bounty.id)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreatorBountiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('open');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    open: number;
    backed: number;
    inReview: number;
    completed: number;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // Derive stats from an unfiltered first-page fetch on mount
  const fetchStats = useCallback(() => {
    if (!user) return;
    bountiesApi
      .list({ creator_id: user.id })
      .then((res) => {
        const data = res.data;
        setStats({
          open: data.filter((b) => b.status === 'open').length,
          backed: data.reduce((sum, b) => sum + Number(b.total_backed), 0),
          inReview: data.filter((b) => b.status === 'pending').length,
          completed: data.filter((b) => b.status === 'completed' || b.status === 'paid_out').length,
        });
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user, fetchStats]);

  const fetchBounties = useCallback(
    (filter: FilterStatus, p: number) => {
      if (!user) return;
      setLoading(true);
      bountiesApi
        .list({
          creator_id: user.id,
          ...(filter ? { status: filter as BountyStatus } : {}),
          page: p,
        })
        .then((res) => {
          setBounties(res.data);
          setLastPage(res.last_page);
          setTotal(res.total);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [user],
  );

  useEffect(() => {
    if (!user) return;
    fetchBounties(statusFilter, page);
  }, [user, statusFilter, page, fetchBounties]);

  const handleFilterChange = (f: FilterStatus) => {
    if (f === statusFilter) return;
    setStatusFilter(f);
    setPage(1);
    setExpandedId(null);
  };

  const handleToggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSubmitted = (updated: Bounty) => {
    setBounties((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setExpandedId(null);
    fetchStats();
  };

  if (authLoading || !user) {
    return (
      <div className="space-y-6 pt-2">
        <div className="h-8 w-48 bg-surface animate-pulse rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-surface animate-pulse rounded" />
          ))}
        </div>
        <Skeleton />
      </div>
    );
  }

  const fmt$ = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const emptyMessage =
    statusFilter === 'revoked' ? 'No revoked bounties' : 'No bounties yet';

  return (
    <div className="space-y-7 pt-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>creator · bounties</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">My Bounties</h1>
          <p className="text-sm text-muted mt-1">
            {total} {total !== 1 ? 'bounties' : 'bounty'}
          </p>
        </div>
        <Link href="/bounties/new">
          <Button variant="default" size="sm">+ New Bounty →</Button>
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCell label="open bounties" value={stats?.open ?? '—'} />
        <StatCell
          label="total backed"
          value={stats !== null ? fmt$(stats.backed) : '—'}
        />
        <StatCell label="in review" value={stats?.inReview ?? '—'} />
        <StatCell label="completed" value={stats?.completed ?? '—'} />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleFilterChange(tab.value)}
            className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? 'bg-creator text-black border-creator font-semibold'
                : 'bg-surface border-border text-muted hover:border-creator/50 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Skeleton />
      ) : bounties.length === 0 ? (
        <Empty icon="◇" message={emptyMessage}>
          {statusFilter !== 'revoked' && (
            <Link href="/bounties/new">
              <Button variant="default" size="sm">Create one →</Button>
            </Link>
          )}
        </Empty>
      ) : (
        <Card>
          <div className="divide-y divide-border -mx-5 -my-4">
            {bounties.map((bounty) => (
              <BountyRow
                key={bounty.id}
                bounty={bounty}
                expanded={expandedId === bounty.id}
                onToggleExpand={handleToggleExpand}
                onSubmitted={handleSubmitted}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="default"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            ← prev
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {page} / {lastPage}
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage || loading}
          >
            next →
          </Button>
        </div>
      )}
    </div>
  );
}
