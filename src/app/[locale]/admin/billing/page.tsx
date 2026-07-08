'use client';

import { formatDate as fmtDate, formatDateTime as fmtDateTime } from '@/lib/format';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type {
  BillingRun,
  BillingRunDetail,
  BillingRunStatus,
  BillingRunChargeback,
} from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';

// ── Formatting helpers ────────────────────────────────────────────────────────

function money(n: number | string): string {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function duration(start: string | null, end: string | null): string {
  if (!start) return '—';
  if (!end) return 'running…';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const STATUS_TONE: Record<BillingRunStatus, 'info' | 'good' | 'bad' | 'warn'> = {
  pending:   'warn',
  running:   'info',
  completed: 'good',
  failed:    'bad',
};

// ── Tiny presentational atoms ─────────────────────────────────────────────────

/** A count that turns red/amber when non-zero, muted when zero — for at-a-glance triage. */
function ProblemCount({ n, tone }: { n: number; tone: 'bad' | 'warn' }) {
  if (n === 0) return <span className="font-mono text-[11px] text-muted/50 tabular-nums">0</span>;
  const cls = tone === 'bad' ? 'text-bad' : 'text-warn';
  return <span className={`font-mono text-[11px] tabular-nums font-semibold ${cls}`}>{n}</span>;
}

function StatTile({
  label, value, sub, tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'good' | 'bad' | 'warn' | 'info';
}) {
  const valueColor = {
    default: 'text-foreground',
    good:    'text-good',
    bad:     'text-bad',
    warn:    'text-warn',
    info:    'text-info',
  }[tone];
  return (
    <div className="border border-border rounded-md bg-surface-2 px-3 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted/70 mb-1">{label}</div>
      <div className={`font-mono text-[15px] tabular-nums ${valueColor}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function UserCell({ user }: { user: { id: number; display_name: string; email: string | null } | null }) {
  if (!user) return <span className="font-mono text-[11px] text-muted">deleted user</span>;
  return (
    <Link href={`/admin/users?focus=${user.id}`} className="group min-w-0 block">
      <div className="text-sm text-foreground group-hover:underline truncate">{user.display_name}</div>
      <div className="font-mono text-[10px] text-muted truncate">#{user.id}{user.email ? ` · ${user.email}` : ''}</div>
    </Link>
  );
}

// ── Chargeback resolution badge ───────────────────────────────────────────────

function ChargebackImpact({ cb }: { cb: BillingRunChargeback }) {
  // Clawback is always applied since 2026-06 (negative balances allowed), so
  // the signal is the amount: zero means the slices were already refunded or
  // the charge couldn't be matched.
  if (cb.pre_clearing === null) {
    return <Badge tone="bad">platform loss · unknown charge</Badge>;
  }
  if (cb.clawback_amount != null && cb.clawback_amount > 0) {
    return <Badge tone="warn">creator clawback {money(cb.clawback_amount)}</Badge>;
  }
  return <Badge tone="info">no clawback · already refunded</Badge>;
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function RunDetailModal({ runId, onClose }: { runId: number; onClose: () => void }) {
  const [run, setRun] = useState<BillingRunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    adminApi.billingRuns.get(runId)
      .then((r) => { if (alive) setRun(r.data); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [runId]);

  return (
    <Modal title={run ? `Billing run · ${fmtDate(run.run_date)}` : 'Billing run'} onClose={onClose} lg>
      {loading || !run ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-surface-2 animate-pulse rounded" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Status + lifecycle */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[run.status]}>{run.status}</Badge>
            <span className="font-mono text-[10px] text-muted">
              ran {fmtDateTime(run.started_at)} · {duration(run.started_at, run.completed_at)}
            </span>
          </div>

          {run.error_message && (
            <div className="bg-bad-soft border border-bad text-bad rounded px-3 py-2 text-sm font-mono whitespace-pre-wrap break-words">
              {run.error_message}
            </div>
          )}

          {/* Money rollup — confirmed (webhook-derived), not the dispatch snapshot */}
          <div>
            <SectionLabel className="mb-2">money collected (confirmed)</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile label="collected" tone="good" value={money(run.summary.collected_amount)} sub={`${run.summary.collected_count} payments`} />
              <StatTile label="failed" tone={run.summary.failed_count > 0 ? 'bad' : 'default'} value={money(run.summary.failed_amount)} sub={`${run.summary.failed_count} fans`} />
              <StatTile label="awaiting 3DS" tone={run.summary.pending_action_count > 0 ? 'warn' : 'default'} value={money(run.summary.pending_action_amount)} sub={`${run.summary.pending_action_count} fans`} />
              <StatTile label="fees" value={money(run.total_fees)} sub={`${run.summary.charged_users} fans charged`} />
            </div>
          </div>

          {/* Problem rollup */}
          <div>
            <SectionLabel className="mb-2">issues</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile label="failed attempts" tone={run.summary.failed_attempts > 0 ? 'bad' : 'default'} value={String(run.summary.failed_attempts)} sub="stripe declines" />
              <StatTile label="dropped debits" tone={run.summary.dropped_backings > 0 ? 'warn' : 'default'} value={String(run.summary.dropped_backings)} sub="no valid card" />
              <StatTile label="chargebacks" tone={run.summary.chargeback_count > 0 ? 'bad' : 'default'} value={String(run.summary.chargeback_count)} sub={money(run.summary.chargeback_amount)} />
              <StatTile label="in flight" tone={run.summary.in_flight_count > 0 ? 'info' : 'default'} value={String(run.summary.in_flight_count)} sub={money(run.summary.in_flight_amount)} />
            </div>
          </div>

          {/* Failed collections */}
          <DetailSection
            label="failed collections"
            count={run.failed_payments.length}
            tone="bad"
            empty="No failed collections — every charge that fired went through."
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>Fan</Th><Th>Amount</Th><Th>Tries</Th><Th>Decline</Th><Th>Last attempt</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {run.failed_payments.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="py-2 pr-3 max-w-[180px]"><UserCell user={p.user} /></td>
                    <td className="py-2 pr-3 font-mono text-[12px] tabular-nums text-foreground">{money(p.gross_paid)}</td>
                    <td className="py-2 pr-3 font-mono text-[12px] tabular-nums text-muted">{p.attempts}</td>
                    <td className="py-2 pr-3">
                      {p.decline_code || p.error_code ? (
                        <div>
                          <div className="font-mono text-[11px] text-bad">{p.decline_code ?? p.error_code}</div>
                          {p.error_message && <div className="font-mono text-[10px] text-muted max-w-[220px] truncate" title={p.error_message}>{p.error_message}</div>}
                        </div>
                      ) : <span className="font-mono text-[11px] text-muted">—</span>}
                    </td>
                    <td className="py-2 font-mono text-[10px] text-muted whitespace-nowrap">{fmtDateTime(p.last_attempt_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailSection>

          {/* Dropped debits */}
          <DetailSection
            label="dropped debits · no valid payment method"
            count={run.dropped_backings.length}
            tone="warn"
            empty="No backings were dropped — every owed fan had a valid card on file."
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>Fan</Th><Th>Bounty</Th><Th>Amount</Th><Th>Dropped</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {run.dropped_backings.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="py-2 pr-3 max-w-[160px]"><UserCell user={b.user} /></td>
                    <td className="py-2 pr-3 max-w-[200px]">
                      {b.bounty
                        ? <Link href={`/bounties/${b.bounty.id}`} className="text-sm text-foreground hover:underline line-clamp-2">{b.bounty.title}</Link>
                        : <span className="font-mono text-[11px] text-muted">deleted bounty</span>}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[12px] tabular-nums text-warn">{money(b.amount)}</td>
                    <td className="py-2 font-mono text-[10px] text-muted whitespace-nowrap">{fmtDateTime(b.revoked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailSection>

          {/* Chargebacks */}
          <DetailSection
            label="chargebacks · later-invalidated payments"
            count={run.chargebacks.length}
            tone="bad"
            empty="No chargebacks against payments from this run."
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>Fan</Th><Th>Amount</Th><Th>Reason</Th><Th>Status</Th><Th>Impact</Th><th className="py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {run.chargebacks.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="py-2 pr-3 max-w-[160px]"><UserCell user={c.user} /></td>
                    <td className="py-2 pr-3 font-mono text-[12px] tabular-nums text-bad">{money(c.amount)}</td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-muted max-w-[140px] truncate" title={c.reason ?? ''}>{c.reason ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={c.is_terminal ? 'default' : 'warn'}>{c.status_label ?? c.status ?? 'unknown'}</Badge>
                    </td>
                    <td className="py-2 pr-3"><ChargebackImpact cb={c} /></td>
                    <td className="py-2 text-right">
                      {c.fan_payment_id != null && (
                        <Link
                          href={`/admin/refunds?payment=${c.fan_payment_id}`}
                          className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground whitespace-nowrap"
                        >
                          refunds →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailSection>

          {/* Awaiting authentication */}
          <DetailSection
            label="awaiting authentication · 3DS / SCA"
            count={run.pending_action.length}
            tone="warn"
            empty="No payments stuck on bank authentication."
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>Fan</Th><Th>Amount</Th><Th>Challenged</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {run.pending_action.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="py-2 pr-3 max-w-[200px]"><UserCell user={p.user} /></td>
                    <td className="py-2 pr-3 font-mono text-[12px] tabular-nums text-warn">{money(p.gross_paid)}</td>
                    <td className="py-2 font-mono text-[10px] text-muted whitespace-nowrap">{fmtDateTime(p.requires_action_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailSection>
        </div>
      )}
    </Modal>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-1.5 pr-3 font-mono text-[9px] uppercase tracking-widest text-muted/70 font-normal">{children}</th>;
}

function DetailSection({
  label, count, tone, empty, children,
}: {
  label: string;
  count: number;
  tone: 'bad' | 'warn';
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <SectionLabel>{label}</SectionLabel>
        {count > 0 && <ProblemCount n={count} tone={tone} />}
      </div>
      {count === 0 ? (
        <p className="font-mono text-[11px] text-muted/70 border border-dashed border-border rounded px-3 py-2.5">{empty}</p>
      ) : (
        <Card accent className="overflow-x-auto"><div className="min-w-[480px]">{children}</div></Card>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminBillingRunsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [runs, setRuns] = useState<BillingRun[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  const fetchRuns = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await adminApi.billingRuns.list(p);
      setRuns(res.data);
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
    if (user?.role === 'council') fetchRuns(1);
  }, [user, fetchRuns]);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await adminApi.billingRuns.trigger();
      toast('Billing run dispatched — refresh shortly to see results.', 'success');
      setTimeout(() => fetchRuns(1), 1500);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      toast(
        e.status === 429
          ? 'A run was just triggered — wait a few minutes before retrying.'
          : (e.message ?? 'Failed to dispatch billing run.'),
        'error',
      );
    } finally {
      setTriggering(false);
    }
  };

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <>
      {detailId !== null && <RunDetailModal runId={detailId} onClose={() => setDetailId(null)} />}

      <div className="space-y-6 pt-2 max-w-5xl">
        {/* Header */}
        <div>
          <SectionLabel className="mb-1">council · admin</SectionLabel>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <h1 className="font-display font-bold text-[28px]">Billing Runs</h1>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">
                {total} run{total === 1 ? '' : 's'}
              </span>
              {/* Triggering a run charges real money — overlord-only. Council
                  members see the read-only runs list but not this control. */}
              {user.is_overlord && (
                <Button variant="primary" size="sm" onClick={handleTrigger} disabled={triggering}>
                  {triggering ? 'Dispatching…' : '▸ Trigger run'}
                </Button>
              )}
              <Link href="/admin"><Button variant="ghost" size="sm">← Admin</Button></Link>
            </div>
          </div>
          <p className="text-sm text-muted mt-2 max-w-2xl">
            Each monthly cycle charges every fan&apos;s unsettled balance. Charges are{' '}
            <em>initiated</em> here; collections, declines and chargebacks land asynchronously via
            Stripe webhooks — figures below reflect the confirmed live state, not the dispatch-time snapshot.
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <Card>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-surface-2 animate-pulse rounded" />)}
            </div>
          </Card>
        ) : runs.length === 0 ? (
          <Empty icon="$" title="No billing runs yet" message="Trigger a run to charge unsettled balances." />
        ) : (
          <Card>
            <div className="overflow-x-auto -mx-5 -my-4">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-border">
                    <Th>Run date</Th>
                    <Th>Status</Th>
                    <Th>Collected</Th>
                    <Th>Failed</Th>
                    <Th>Dropped</Th>
                    <Th>Chargebacks</Th>
                    <Th>3DS</Th>
                    <Th>Fees</Th>
                    <th className="py-1.5 pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runs.map((r) => {
                    const s = r.summary;
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-surface-2 transition-colors cursor-pointer"
                        onClick={() => setDetailId(r.id)}
                      >
                        <td className="py-3 pl-5 pr-3">
                          <div className="text-sm text-foreground">{fmtDate(r.run_date)}</div>
                          <div className="font-mono text-[10px] text-muted">{duration(r.started_at, r.completed_at)}</div>
                        </td>
                        <td className="py-3 pr-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                        <td className="py-3 pr-3">
                          <div className="font-mono text-[12px] tabular-nums text-good">{money(s.collected_amount)}</div>
                          <div className="font-mono text-[10px] text-muted">{s.collected_count}/{s.charged_users}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <ProblemCount n={s.failed_count} tone="bad" />
                          {s.failed_amount > 0 && <div className="font-mono text-[10px] text-muted">{money(s.failed_amount)}</div>}
                        </td>
                        <td className="py-3 pr-3"><ProblemCount n={s.dropped_backings} tone="warn" /></td>
                        <td className="py-3 pr-3">
                          <ProblemCount n={s.chargeback_count} tone="bad" />
                          {s.chargeback_amount > 0 && <div className="font-mono text-[10px] text-muted">{money(s.chargeback_amount)}</div>}
                        </td>
                        <td className="py-3 pr-3"><ProblemCount n={s.pending_action_count} tone="warn" /></td>
                        <td className="py-3 pr-3 font-mono text-[12px] tabular-nums text-muted">{money(r.total_fees)}</td>
                        <td className="py-3 pr-5 text-right">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">view →</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="default" size="sm" disabled={page === 1 || loading} onClick={() => fetchRuns(page - 1)}>← Prev</Button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">Page {page} of {lastPage}</span>
            <Button variant="default" size="sm" disabled={page === lastPage || loading} onClick={() => fetchRuns(page + 1)}>Next →</Button>
          </div>
        )}
      </div>
    </>
  );
}
