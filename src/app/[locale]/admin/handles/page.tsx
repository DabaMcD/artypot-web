'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type {
  HandleVerificationApplicationRow,
  HandleVerificationApplicationStatus,
  UnclaimedHandlePot,
} from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';
import { Empty } from '@/components/ui/Empty';
import { Input, Textarea, FieldLabel } from '@/components/ui/Input';
import { ALL_PLATFORMS, platformLabel as catalogueLabel } from '@/lib/platforms';

// Catalogue-driven. Includes 'other' so admin queue rows display "Other"
// when reviewing pasted-URL handles (curated platforms map to their proper
// label like "X / Twitter").
const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  ALL_PLATFORMS.map((slug) => [slug, catalogueLabel(slug)]),
);

const STATUS_TONES: Record<HandleVerificationApplicationStatus, 'warn' | 'good' | 'bad' | 'default'> = {
  pending:   'warn',
  approved:  'good',
  denied:    'bad',
  retracted: 'default',
};

// ── Review modal (pending applications only) ─────────────────────────────────

function ReviewModal({
  application,
  onClose,
  onDone,
}: {
  application: HandleVerificationApplicationRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleId = application.claim.handle.id;
  const platformLabel = PLATFORM_LABELS[application.claim.handle.platform] ?? application.claim.handle.platform;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (decision === 'approve') {
        await adminApi.approveHandle(handleId, notes || undefined);
        toast('Handle verified.', 'success');
      } else {
        await adminApi.rejectHandle(handleId, notes || undefined);
        toast('Application denied.', 'error');
      }
      onDone();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to submit decision.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`review @${application.claim.handle.username}`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant={decision === 'approve' ? 'primary' : 'danger'}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Submitting…' : decision === 'approve' ? 'Approve & Verify' : 'Deny Application'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-muted">
          <span className="text-foreground font-medium">@{application.claim.handle.username}</span> on{' '}
          <span className="text-foreground">{platformLabel}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-foreground">{application.user.display_name}</span>
          <span className="font-mono text-[10px] text-muted">{application.user.email}</span>
        </div>

        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">contact message from claimant</div>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{application.contact_message}</p>
        </Card>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDecision('approve')}
            className={`flex-1 py-2 rounded font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
              decision === 'approve'
                ? 'bg-good/10 border-good/40 text-good'
                : 'bg-surface border-border text-muted hover:border-good/30'
            }`}
          >
            ✓ approve
          </button>
          <button
            type="button"
            onClick={() => setDecision('reject')}
            className={`flex-1 py-2 rounded font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
              decision === 'reject'
                ? 'bg-bad/10 border-bad/40 text-bad'
                : 'bg-surface border-border text-muted hover:border-bad/30'
            }`}
          >
            ✕ deny
          </button>
        </div>

        <div>
          <FieldLabel>decision notes <span className="text-muted/50 font-normal normal-case tracking-normal">(optional, internal)</span></FieldLabel>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. confirmed via DM on Discord 2026-05-17"
          />
        </div>

        {decision === 'approve' && (
          <Banner tone="warn">
            Approving this application will verify the handle and reject any competing claims from other users.
          </Banner>
        )}
      </div>
    </Modal>
  );
}

// ── History row detail modal (read-only) ─────────────────────────────────────

function HistoryDetailModal({
  application,
  onClose,
}: {
  application: HandleVerificationApplicationRow;
  onClose: () => void;
}) {
  const platformLabel = PLATFORM_LABELS[application.claim.handle.platform] ?? application.claim.handle.platform;
  return (
    <Modal title={`@${application.claim.handle.username}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={STATUS_TONES[application.status]}>{application.status}</Badge>
          <Badge tone="default">{platformLabel}</Badge>
        </div>

        <div className="text-sm text-muted">
          <div>
            <span className="text-foreground">{application.user.display_name}</span>{' '}
            <span className="text-muted/70 font-mono text-[10px]">{application.user.email}</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted">
            submitted {new Date(application.created_at).toLocaleString()}
          </div>
        </div>

        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">contact message</div>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{application.contact_message}</p>
        </Card>

        {application.reviewer && (
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">decision</div>
            <p className="text-sm text-foreground">
              {application.status === 'approved' ? 'approved' : application.status === 'denied' ? 'denied' : application.status}
              {' '}by{' '}
              <span className="text-foreground">{application.reviewer.display_name}</span>{' '}
              <span className="text-muted/70 font-mono text-[10px]">{application.reviewer.email}</span>
            </p>
            {application.reviewed_at && (
              <p className="font-mono text-[10px] text-muted mt-1">{new Date(application.reviewed_at).toLocaleString()}</p>
            )}
            {application.decision_notes && (
              <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-3 pt-3 border-t border-border">
                {application.decision_notes}
              </p>
            )}
          </Card>
        )}

        {!application.reviewer && application.status === 'retracted' && (
          <Banner tone="default">
            This application was superseded by a newer submission from the same creator.
          </Banner>
        )}
      </div>
    </Modal>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type Tab = 'pending' | 'history' | 'outreach';
type HistoryFilter = 'all' | HandleVerificationApplicationStatus;

export default function AdminHandlesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('pending');

  // Pending state
  const [pendingRows, setPendingRows] = useState<HandleVerificationApplicationRow[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLastPage, setPendingLastPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(true);

  // History state
  const [historyRows, setHistoryRows] = useState<HandleVerificationApplicationRow[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<HistoryFilter>('all');
  const [reviewerQ, setReviewerQ] = useState('');
  const [creatorQ, setCreatorQ] = useState('');

  // Outreach state — top unclaimed handles ranked by waiting pot
  const [outreachRows, setOutreachRows] = useState<UnclaimedHandlePot[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(true);

  // Modals
  const [reviewing, setReviewing] = useState<HandleVerificationApplicationRow | null>(null);
  const [viewing, setViewing] = useState<HandleVerificationApplicationRow | null>(null);

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchPending = useCallback(async (page: number) => {
    setPendingLoading(true);
    try {
      const res = await adminApi.listHandleReviews(page);
      setPendingRows(res.data);
      setPendingPage(res.current_page);
      setPendingLastPage(res.last_page);
      setPendingTotal(res.total);
    } catch {
      // silent
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (page: number, status: HistoryFilter, reviewer: string, creator: string) => {
    setHistoryLoading(true);
    try {
      const res = await adminApi.listHandleHistory({
        status,
        reviewer_q: reviewer.trim() || undefined,
        creator_q:  creator.trim()  || undefined,
        page,
      });
      setHistoryRows(res.data);
      setHistoryPage(res.current_page);
      setHistoryLastPage(res.last_page);
      setHistoryTotal(res.total);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') fetchPending(1);
  }, [user, fetchPending]);

  useEffect(() => {
    if (user?.role === 'council' && tab === 'history') {
      fetchHistory(1, historyStatusFilter, reviewerQ, creatorQ);
    }
    // We deliberately exclude reviewerQ/creatorQ from deps so that typing doesn't
    // refetch on every keystroke; debouncing is handled in handleSearchChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user, historyStatusFilter, fetchHistory]);

  useEffect(() => {
    if (user?.role !== 'council' || tab !== 'outreach') return;
    setOutreachLoading(true);
    adminApi.listUnclaimedPots()
      .then((res) => setOutreachRows(res.data))
      .catch(() => setOutreachRows([]))
      .finally(() => setOutreachLoading(false));
  }, [tab, user]);

  // Debounced search input handler — re-fetches history after the user pauses typing.
  const handleSearchChange = (which: 'reviewer' | 'creator', val: string) => {
    if (which === 'reviewer') setReviewerQ(val); else setCreatorQ(val);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchHistory(
        1,
        historyStatusFilter,
        which === 'reviewer' ? val : reviewerQ,
        which === 'creator'  ? val : creatorQ,
      );
    }, 350);
  };

  if (authLoading || !user || user.role !== 'council') return null;

  const HISTORY_STATUS_TABS: { label: string; value: HistoryFilter }[] = [
    { label: 'All',       value: 'all' },
    { label: 'Approved',  value: 'approved' },
    { label: 'Denied',    value: 'denied' },
    { label: 'Retracted', value: 'retracted' },
  ];

  return (
    <>
      {reviewing && (
        <ReviewModal
          application={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            fetchPending(pendingPage);
            if (tab === 'history') fetchHistory(historyPage, historyStatusFilter, reviewerQ, creatorQ);
          }}
        />
      )}

      {viewing && (
        <HistoryDetailModal application={viewing} onClose={() => setViewing(null)} />
      )}

      <div className="space-y-6 pt-2 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">handle verification</h1>
            <p className="text-sm text-muted mt-1">
              {tab === 'pending'
                ? `${pendingTotal} pending ${pendingTotal === 1 ? 'request' : 'requests'}`
                : tab === 'history'
                  ? `${historyTotal} in history`
                  : `${outreachRows.length} unclaimed ${outreachRows.length === 1 ? 'handle' : 'handles'} with money waiting`}
            </p>
          </div>
          <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
          {([
            { label: 'Pending',  value: 'pending' as const },
            { label: 'History',  value: 'history' as const },
            { label: 'Outreach', value: 'outreach' as const },
          ]).map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                tab === value
                  ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Pending tab ───────────────────────────────────────────────── */}
        {tab === 'pending' && (
          <>
            {pendingLoading ? (
              <Card>
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}
                </div>
              </Card>
            ) : pendingRows.length === 0 ? (
              <Empty>No pending handle verification requests.</Empty>
            ) : (
              <Card>
                <div className="divide-y divide-border -mx-5 -my-4">
                  {pendingRows.map((row) => {
                    const platformLabel = PLATFORM_LABELS[row.claim.handle.platform] ?? row.claim.handle.platform;
                    return (
                      <div key={row.id} className="flex items-start gap-3 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-mono text-sm text-foreground">@{row.claim.handle.username}</span>
                            <Badge tone="default">{platformLabel}</Badge>
                            <Badge tone="warn">pending</Badge>
                          </div>
                          <p className="text-sm text-muted">
                            approved by{' '}
                            <span className="text-foreground">{row.user.display_name}</span>
                            {' '}<span className="text-muted/70 font-mono text-[10px]">{row.user.email}</span>
                          </p>
                          <p className="font-mono text-[10px] text-muted/70 mt-0.5 truncate max-w-sm">
                            {row.contact_message}
                          </p>
                        </div>

                        <Button variant="default" size="sm" onClick={() => setReviewing(row)}>
                          review →
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {pendingLastPage > 1 && (
              <div className="flex items-center justify-between">
                <Button variant="default" size="sm" disabled={pendingPage === 1 || pendingLoading}
                  onClick={() => fetchPending(pendingPage - 1)}>← prev</Button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{pendingPage} / {pendingLastPage}</span>
                <Button variant="default" size="sm" disabled={pendingPage === pendingLastPage || pendingLoading}
                  onClick={() => fetchPending(pendingPage + 1)}>next →</Button>
              </div>
            )}
          </>
        )}

        {/* ── History tab ───────────────────────────────────────────────── */}
        {tab === 'history' && (
          <>
            {/* Filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
                {HISTORY_STATUS_TABS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setHistoryStatusFilter(value)}
                    className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                      historyStatusFilter === value
                        ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>filter by admin</FieldLabel>
                  <Input
                    type="search"
                    value={reviewerQ}
                    onChange={(e) => handleSearchChange('reviewer', e.target.value)}
                    placeholder="admin name or email…"
                  />
                </div>
                <div>
                  <FieldLabel>filter by creator</FieldLabel>
                  <Input
                    type="search"
                    value={creatorQ}
                    onChange={(e) => handleSearchChange('creator', e.target.value)}
                    placeholder="creator name, email, or handle…"
                  />
                </div>
              </div>
            </div>

            {historyLoading ? (
              <Card>
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}
                </div>
              </Card>
            ) : historyRows.length === 0 ? (
              <Empty>No decisions match these filters.</Empty>
            ) : (
              <Card>
                <div className="divide-y divide-border -mx-5 -my-4">
                  {historyRows.map((row) => {
                    const platformLabel = PLATFORM_LABELS[row.claim.handle.platform] ?? row.claim.handle.platform;
                    const decisionAt = row.reviewed_at ?? row.created_at;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setViewing(row)}
                        className="w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-mono text-sm text-foreground">@{row.claim.handle.username}</span>
                            <Badge tone="default">{platformLabel}</Badge>
                            <Badge tone={STATUS_TONES[row.status]}>{row.status}</Badge>
                          </div>
                          <p className="text-sm text-muted">
                            <span className="text-foreground">{row.user.display_name}</span>
                            {' '}<span className="text-muted/70 font-mono text-[10px]">{row.user.email}</span>
                          </p>
                          <p className="font-mono text-[10px] text-muted/70 mt-0.5">
                            {row.reviewer ? (
                              <>by <span className="text-muted">{row.reviewer.display_name}</span> · {new Date(decisionAt).toLocaleString()}</>
                            ) : (
                              <>{row.status} · {new Date(decisionAt).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted shrink-0 mt-1">view →</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}

            {historyLastPage > 1 && (
              <div className="flex items-center justify-between">
                <Button variant="default" size="sm" disabled={historyPage === 1 || historyLoading}
                  onClick={() => fetchHistory(historyPage - 1, historyStatusFilter, reviewerQ, creatorQ)}>← prev</Button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{historyPage} / {historyLastPage}</span>
                <Button variant="default" size="sm" disabled={historyPage === historyLastPage || historyLoading}
                  onClick={() => fetchHistory(historyPage + 1, historyStatusFilter, reviewerQ, creatorQ)}>next →</Button>
              </div>
            )}
          </>
        )}

        {/* ── Outreach tab — top unclaimed handles by waiting pot ─────────── */}
        {tab === 'outreach' && (
          <>
            <p className="text-sm text-muted -mt-2">
              Creators who don&apos;t know money is waiting for them. Biggest pots first —
              reach out tastefully via their public business contact.
            </p>
            {outreachLoading ? (
              <Card>
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-10 bg-surface-2 animate-pulse rounded" />)}
                </div>
              </Card>
            ) : outreachRows.length === 0 ? (
              <Empty>No unclaimed handles have open pots right now.</Empty>
            ) : (
              <Card>
                <div className="divide-y divide-border -mx-5 -my-4">
                  {outreachRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-foreground">@{row.username}</span>
                        <Badge tone="default">{PLATFORM_LABELS[row.platform] ?? row.platform}</Badge>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted/70">
                          {row.open_bounty_count} open {row.open_bounty_count === 1 ? 'bounty' : 'bounties'}
                        </span>
                      </div>
                      <span className="font-mono text-base font-bold text-good shrink-0">
                        ${row.pot_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
