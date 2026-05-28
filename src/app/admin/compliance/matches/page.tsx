'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { ComplianceMatchCandidate } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';
import { Input, FieldLabel, Textarea } from '@/components/ui/Input';

type Tab = 'pending' | 'history';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_TONES: Record<string, 'bad' | 'good' | 'default' | 'warn'> = {
  confirmed_match: 'bad',
  false_positive:  'good',
  dismissed:       'default',
  pending:         'warn',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed_match: 'Confirmed Match',
  false_positive:  'False Positive',
  dismissed:       'Dismissed',
  pending:         'Pending',
};

function MatchStrengthBar({ strength }: { strength: number }) {
  const color = strength >= 95 ? 'bg-bad' : strength >= 85 ? 'bg-warn' : 'bg-muted/40';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-surface-2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${strength}%` }} />
      </div>
      <span className="font-mono text-[11px] text-muted">{strength}%</span>
    </div>
  );
}

// ── Review modal ──────────────────────────────────────────────────────────────

function ReviewModal({
  candidate,
  onClose,
  onDone,
}: {
  candidate: ComplianceMatchCandidate;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [action, setAction] = useState<'confirmed_match' | 'false_positive' | 'dismissed' | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!action) return;
    setLoading(true);
    try {
      await adminApi.reviewMatch(candidate.id, action, notes || undefined);
      toast('Match reviewed.', 'success');
      onDone();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to submit review.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Review match: ${candidate.entity?.entity_name ?? `entity #${candidate.country_sanctions_entity_id}`}`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={action === 'confirmed_match' ? 'danger' : 'primary'} onClick={handleSubmit} disabled={!action || loading}>
            {loading ? 'Submitting…' : action ? `Submit: ${STATUS_LABELS[action]}` : 'Select an action'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* User info */}
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">User</div>
          <div className="text-sm text-foreground font-medium">{candidate.user?.display_name ?? `#${candidate.user_id}`}</div>
          <div className="font-mono text-[10px] text-muted">{candidate.user?.email}</div>
        </Card>

        {/* Entity info */}
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">Entity</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-foreground font-medium">{candidate.entity?.entity_name}</span>
            {candidate.entity?.entity_type && <Badge tone="default">{candidate.entity.entity_type}</Badge>}
          </div>
          {candidate.entity?.sanction && (
            <div className="text-xs text-muted mt-1">
              Program: {candidate.entity.sanction.program_name} · {candidate.entity.sanction.country_code}
            </div>
          )}
          <div className="mt-2">
            <MatchStrengthBar strength={candidate.match_strength} />
          </div>
          <div className="font-mono text-[10px] text-muted mt-1">
            matched field: {candidate.matched_field} · threshold: ≥{candidate.entity?.match_strength_required ?? '?'}%
          </div>
        </Card>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          {(['confirmed_match', 'false_positive', 'dismissed'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              className={`py-2 rounded font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
                action === a
                  ? a === 'confirmed_match'
                    ? 'bg-bad/10 border-bad/40 text-bad'
                    : a === 'false_positive'
                    ? 'bg-good/10 border-good/40 text-good'
                    : 'bg-surface-2 border-border text-foreground'
                  : 'bg-surface border-border text-muted hover:text-foreground'
              }`}
            >
              {STATUS_LABELS[a]}
            </button>
          ))}
        </div>

        <div>
          <FieldLabel>Review notes <span className="text-muted/50 font-normal normal-case tracking-normal">(optional)</span></FieldLabel>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal notes…" />
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('pending');

  // Pending
  const [pendingRows, setPendingRows] = useState<ComplianceMatchCandidate[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLastPage, setPendingLastPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(true);

  // History
  const [historyRows, setHistoryRows] = useState<ComplianceMatchCandidate[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyQ, setHistoryQ] = useState('');

  // Modal
  const [reviewing, setReviewing] = useState<ComplianceMatchCandidate | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchPending = useCallback(async (page: number) => {
    setPendingLoading(true);
    try {
      const res = await adminApi.complianceMatches(page);
      setPendingRows(res.data);
      setPendingPage(res.current_page);
      setPendingLastPage(res.last_page);
      setPendingTotal(res.total);
    } catch { /* silent */ } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (page: number, status: string, q: string) => {
    setHistoryLoading(true);
    try {
      const res = await adminApi.complianceMatchHistory({
        page,
        status: status || undefined,
        q: q.trim() || undefined,
      });
      setHistoryRows(res.data);
      setHistoryPage(res.current_page);
      setHistoryLastPage(res.last_page);
      setHistoryTotal(res.total);
    } catch { /* silent */ } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') fetchPending(1);
  }, [user, fetchPending]);

  useEffect(() => {
    if (user?.role === 'council' && tab === 'history') {
      fetchHistory(1, historyStatus, historyQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user, historyStatus, fetchHistory]);

  const handleSearchChange = (val: string) => {
    setHistoryQ(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchHistory(1, historyStatus, val);
    }, 350);
  };

  if (authLoading || !user || user.role !== 'council') return null;

  const HISTORY_STATUS_PILLS = [
    { label: 'All', value: '' },
    { label: 'Confirmed', value: 'confirmed_match' },
    { label: 'False Positive', value: 'false_positive' },
    { label: 'Dismissed', value: 'dismissed' },
  ];

  return (
    <>
      {reviewing && (
        <ReviewModal
          candidate={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); fetchPending(pendingPage); }}
        />
      )}

      <div className="space-y-6 pt-2 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>council · admin · compliance</SectionLabel>
            <h1 className="font-display font-bold text-[28px] text-foreground mt-1">OFAC matches</h1>
            <p className="text-sm text-muted mt-1">
              {tab === 'pending' ? `${pendingTotal} pending review` : `${historyTotal} in history`}
            </p>
          </div>
          <Link href="/admin/compliance"><Button variant="ghost" size="sm">← Compliance</Button></Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit">
          {([{ label: 'Pending Review', value: 'pending' as const }, { label: 'History', value: 'history' as const }]).map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                tab === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Pending ── */}
        {tab === 'pending' && (
          <>
            {pendingLoading ? (
              <Card><div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
            ) : pendingRows.length === 0 ? (
              <Empty>No pending match candidates.</Empty>
            ) : (
              <Card>
                <div className="divide-y divide-border -mx-5 -my-4">
                  {pendingRows.map((row) => (
                    <div key={row.id} className="flex items-start gap-3 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-foreground">{row.user?.display_name ?? `User #${row.user_id}`}</span>
                          <span className="font-mono text-[10px] text-muted">{row.user?.email}</span>
                          {row.user?.country_code && <Badge tone="default">{row.user.country_code}</Badge>}
                        </div>
                        <MatchStrengthBar strength={row.match_strength} />
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted">{row.entity?.entity_name}</span>
                          {row.entity?.entity_type && <Badge tone="default">{row.entity.entity_type}</Badge>}
                          {row.entity?.sanction?.program_name && (
                            <span className="text-xs text-muted">· {row.entity.sanction.program_name}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="default" size="sm" onClick={() => setReviewing(row)}>Review →</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {pendingLastPage > 1 && (
              <div className="flex items-center justify-between">
                <Button variant="default" size="sm" disabled={pendingPage === 1 || pendingLoading} onClick={() => fetchPending(pendingPage - 1)}>← prev</Button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{pendingPage} / {pendingLastPage}</span>
                <Button variant="default" size="sm" disabled={pendingPage === pendingLastPage || pendingLoading} onClick={() => fetchPending(pendingPage + 1)}>next →</Button>
              </div>
            )}
          </>
        )}

        {/* ── History ── */}
        {tab === 'history' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-1 border border-border rounded p-1 bg-surface w-fit flex-wrap">
                {HISTORY_STATUS_PILLS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setHistoryStatus(value)}
                    className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer ${
                      historyStatus === value ? 'bg-[var(--color-role-soft)] text-[var(--color-role)]' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <FieldLabel>Search user</FieldLabel>
                <Input
                  type="search"
                  value={historyQ}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="name or email…"
                />
              </div>
            </div>

            {historyLoading ? (
              <Card><div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />)}</div></Card>
            ) : historyRows.length === 0 ? (
              <Empty>No reviewed matches match these filters.</Empty>
            ) : (
              <Card>
                <div className="overflow-x-auto -mx-5 -my-4">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">User</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Entity</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Strength</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Status</th>
                        <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Reviewed</th>
                        <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {historyRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-5 py-3">
                            <div className="text-foreground">{row.user?.display_name ?? `#${row.user_id}`}</div>
                            <div className="font-mono text-[10px] text-muted">{row.user?.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-foreground">{row.entity?.entity_name}</div>
                            {row.entity?.entity_type && <Badge tone="default">{row.entity.entity_type}</Badge>}
                          </td>
                          <td className="px-4 py-3"><MatchStrengthBar strength={row.match_strength} /></td>
                          <td className="px-4 py-3"><Badge tone={STATUS_TONES[row.status] ?? 'default'}>{STATUS_LABELS[row.status] ?? row.status}</Badge></td>
                          <td className="px-4 py-3 text-muted font-mono text-[11px]">{fmt(row.reviewed_at)}</td>
                          <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{row.review_notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            {historyLastPage > 1 && (
              <div className="flex items-center justify-between">
                <Button variant="default" size="sm" disabled={historyPage === 1 || historyLoading} onClick={() => fetchHistory(historyPage - 1, historyStatus, historyQ)}>← prev</Button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{historyPage} / {historyLastPage}</span>
                <Button variant="default" size="sm" disabled={historyPage === historyLastPage || historyLoading} onClick={() => fetchHistory(historyPage + 1, historyStatus, historyQ)}>next →</Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
