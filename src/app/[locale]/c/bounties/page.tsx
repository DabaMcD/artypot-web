'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useMoney, useDateFormats } from '@/lib/format';
import { bounties as bountiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { toExternalUrl } from '@/lib/url';
import type { Bounty, BountyStatus, BountyRefundPreview } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';
import { Input, Textarea, FieldLabel, FieldHint } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';

// ── Constants ─────────────────────────────────────────────────────────────────

type FilterStatus = BountyStatus | '';

// `labelKey` resolves against t('filters.<labelKey>') at render (hooks can't run here).
const FILTER_TABS: { labelKey: string; value: FilterStatus }[] = [
  { labelKey: 'all', value: '' },
  { labelKey: 'open', value: 'open' },
  { labelKey: 'pending', value: 'pending' },
  { labelKey: 'completed', value: 'completed' },
  { labelKey: 'paidOut', value: 'paid_out' },
  { labelKey: 'revoked', value: 'revoked' },
];

// `labelKey` resolves against t('completionBadge.<labelKey>') at render.
const COMPLETION_BADGE: Record<string, { tone: 'info' | 'good' | 'bad'; labelKey: string }> = {
  pending_review: { tone: 'info', labelKey: 'pendingReview' },
  approved: { tone: 'good', labelKey: 'approved' },
  rejected: { tone: 'bad', labelKey: 'rejected' },
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

// ── Refund-all modal ──────────────────────────────────────────────────────────

function RefundAllModal({ bounty, onClose }: { bounty: Bounty; onClose: () => void }) {
  const t = useTranslations('CreatorBounties');
  const money = useMoney();
  const { toast } = useToast();
  const [preview, setPreview] = useState<BountyRefundPreview | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    bountiesApi.refundPreview(bounty.id)
      .then((r) => { if (alive) setPreview(r.data); })
      .catch(() => { if (alive) toast(t('refundModal.toasts.loadFailed'), 'error'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [bounty.id, toast, t]);

  const execute = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await bountiesApi.refundAll(bounty.id, reason.trim());
      const { refunded, revoked, failed } = res.data;
      const parts = [
        refunded > 0 ? t('refundModal.toasts.refundedPart', { count: refunded }) : null,
        revoked > 0 ? t('refundModal.toasts.cancelledPart', { count: revoked }) : null,
      ].filter(Boolean);
      const summary = parts.join(', ') || t('refundModal.toasts.nothingToRefund');
      toast(
        failed > 0
          ? t('refundModal.toasts.partialFailure', { summary, failed })
          : t('refundModal.toasts.success', { summary }),
        failed > 0 ? 'error' : 'success',
      );
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? t('refundModal.toasts.refundFailed');
      toast(msg, 'error');
      setSubmitting(false);
    }
  };

  const nothingToDo = preview !== null
    && preview.settled.length === 0
    && preview.unsettled_count === 0;

  return (
    <Modal title={t('refundModal.title')} onClose={onClose}>
      {loading || !preview ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}
        </div>
      ) : nothingToDo ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {t('refundModal.nothingLeft')}
          </p>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>{t('refundModal.close')}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {t.rich('refundModal.intro', {
              title: bounty.title,
              titled: (chunks) => <span className="text-foreground">{chunks}</span>,
            })}
          </p>

          {preview.settled.length > 0 && (
            <div className="border border-border rounded-md bg-surface-2 max-h-44 overflow-y-auto divide-y divide-border">
              {preview.settled.map((s) => (
                <div key={s.backing_id} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-muted truncate pr-3">{s.fan.display_name}</span>
                  <span className="font-mono tabular-nums text-foreground shrink-0">{money(s.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {preview.unsettled_count > 0 && (
            <p className="font-mono text-[11px] text-muted">
              {t('refundModal.unsettled', {
                count: preview.unsettled_count,
                total: money(preview.unsettled_total),
              })}
            </p>
          )}

          <div className="border-t border-dashed border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t('refundModal.costToYou')}</span>
              <span className="font-mono tabular-nums text-bad">−{money(preview.total_clawback)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t('refundModal.yourBalance')}</span>
              <span className={`font-mono tabular-nums ${preview.sufficient ? 'text-foreground' : 'text-bad'}`}>
                {money(preview.balance)}
              </span>
            </div>
          </div>

          {preview.sufficient ? (
            <>
              <div>
                <FieldLabel>{t('refundModal.reasonLabel')}</FieldLabel>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder={t('refundModal.reasonPlaceholder')}
                />
                <FieldHint>{t('refundModal.reasonHint')}</FieldHint>
              </div>

              <p className="font-mono text-[10px] text-muted/70 leading-relaxed">
                {t('refundModal.irreversibleNote')}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>{t('refundModal.cancel')}</Button>
                <Button variant="danger" size="sm" onClick={execute} disabled={submitting || !reason.trim()}>
                  {submitting ? t('refundModal.refunding') : t('refundModal.refundAmount', { amount: money(preview.total_refund) })}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-bad">
                {t.rich('refundModal.insufficient', {
                  email: 'support@artypot.com',
                  mail: (chunks) => <a href="mailto:support@artypot.com" className="underline">{chunks}</a>,
                })}
              </p>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={onClose}>{t('refundModal.close')}</Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
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
  const t = useTranslations('CreatorBounties');
  const money = useMoney();
  const dateFmt = useDateFormats();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRefund, setShowRefund] = useState(false);

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
    if (!url.trim()) { setError(t('row.form.errorNoUrl')); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await bountiesApi.submitCompletion(bounty.id, url.trim(), notes.trim() || undefined);
      const updated: Bounty = { ...bounty, status: 'pending', completion: res.data };
      onSubmitted(updated);
      toast(t('row.form.submittedToast'), 'success');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? t('row.form.submitFailed');
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
        {expanded ? t('row.actions.cancel') : t('row.actions.submit')}
      </Button>
    );
  } else if (status === 'pending' && completion?.status === 'rejected') {
    actionBtn = (
      <Button size="sm" onClick={() => onToggleExpand(bounty.id)}>
        {expanded ? t('row.actions.cancel') : t('row.actions.resubmit')}
      </Button>
    );
  } else if (status === 'completed' || status === 'paid_out') {
    // Escape valve: refund every backer (gated server-side on balance).
    actionBtn = (
      <Button size="sm" variant="ghost" onClick={() => setShowRefund(true)}>
        {t('row.actions.refundBackers')}
      </Button>
    );
  }

  // Metadata line
  const metaParts: string[] = [
    t('row.meta.backed', { amount: money(Number(bounty.total_backed)) }),
  ];
  const backerCount = bounty.backings?.filter((p) => !p.revoked_at).length;
  if (backerCount !== undefined) {
    const fanSingular = bounty.owner_user?.fan_name || t('row.meta.fanSingular');
    const fanPlural = bounty.owner_user?.fan_name_plural || bounty.owner_user?.fan_name || t('row.meta.fanPlural');
    metaParts.push(`${backerCount} ${backerCount === 1 ? fanSingular : fanPlural}`);
  }
  if (bounty.completed_at) {
    metaParts.push(t('row.meta.completed', { date: dateFmt.short(bounty.completed_at) }));
  }
  if (completion?.verified_at) {
    metaParts.push(t('row.meta.verified', { date: dateFmt.short(completion.verified_at) }));
  }

  return (
    <div className="px-5 py-4">
      {showRefund && <RefundAllModal bounty={bounty} onClose={() => setShowRefund(false)} />}

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
          <BountyStatusBadge status={status} />
          {actionBtn}
        </div>
      </div>

      {/* Completion detail band */}
      {completion && (
        <div className="mt-2 pl-3 border-l-2 border-border space-y-0.5">
          <div className="flex items-center gap-2">
            <a
              href={toExternalUrl(completion.submission_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-fan hover:underline truncate max-w-xs"
            >
              {completion.submission_url}
            </a>
            {COMPLETION_BADGE[completion.status] && (
              <Badge tone={COMPLETION_BADGE[completion.status].tone}>
                {t(`completionBadge.${COMPLETION_BADGE[completion.status].labelKey}`)}
              </Badge>
            )}
          </div>
          {completion.council_notes && (
            <div className="font-mono text-[10px] text-muted">
              {t('row.councilNote', { note: completion.council_notes })}
            </div>
          )}
        </div>
      )}

      {/* Inline submission form */}
      {expanded && (
        <Card className="mt-3 !bg-surface-2">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t('row.form.heading')}
            </div>
            <div>
              <FieldLabel>{t('row.form.urlLabel')}</FieldLabel>
              <Input
                type="url"
                required
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <FieldHint>{t('row.form.publiclyVisible')}</FieldHint>
            </div>
            <div>
              <FieldLabel>{t('row.form.notesLabel')}</FieldLabel>
              <Textarea
                rows={2}
                placeholder={t('row.form.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <FieldHint>{t('row.form.publiclyVisible')}</FieldHint>
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
                {t('row.form.cancel')}
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? t('row.form.submitting') : t('row.form.submit')}
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
  const t = useTranslations('CreatorBounties');
  const money = useMoney();
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

  const emptyMessage =
    statusFilter === 'revoked' ? t('empty.revoked') : t('empty.none');

  return (
    <div className="space-y-7 pt-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{t('header.breadcrumbCreator')} · {t('header.breadcrumbBounties')}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('header.title')}</h1>
          <p className="text-sm text-muted mt-1">
            {t('header.count', { count: total })}
          </p>
        </div>
        <Link href="/bounties/new">
          <Button variant="default" size="sm">{t('header.newBounty')}</Button>
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCell label={t('stats.openBounties')} value={stats?.open ?? '—'} />
        <StatCell
          label={t('stats.totalBacked')}
          value={stats !== null ? money(stats.backed) : '—'}
        />
        <StatCell label={t('stats.inReview')} value={stats?.inReview ?? '—'} />
        <StatCell label={t('stats.completed')} value={stats?.completed ?? '—'} />
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
            {t(`filters.${tab.labelKey}`)}
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
              <Button variant="default" size="sm">{t('empty.createOne')}</Button>
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
            {t('pagination.prev')}
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
            {t('pagination.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
