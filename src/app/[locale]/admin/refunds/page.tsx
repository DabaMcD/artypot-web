'use client';

import { formatDateTime as fmtDateTime } from '@/lib/format';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { AdminRefund, FanPaymentBackingsResponse, FanPaymentBackingRow } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Input, FieldLabel, FieldHint, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';

function money(n: number | string): string {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-1.5 pr-3 font-mono text-[9px] uppercase tracking-widest text-muted/70 font-normal text-left">{children}</th>;
}

const REFUND_STATUS_TONE: Record<AdminRefund['status'], 'good' | 'warn' | 'bad'> = {
  succeeded: 'good',
  pending:   'warn',
  failed:    'bad',
};

// ── Confirm modal ─────────────────────────────────────────────────────────────

function RefundConfirmModal({
  row, onClose, onDone,
}: {
  row: FanPaymentBackingRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.refunds.refundBacking(row.backing_id, reason.trim(), notes.trim() || undefined);
      toast(`Refunded ${money(row.amount)} to ${row.fan?.display_name ?? 'fan'}.`, 'success');
      onDone();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Refund failed.', 'error');
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Refund this backing?" onClose={onClose}>
      <div className="space-y-4">
        <div className="border border-border rounded-md bg-surface-2 px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Fan gets back</span>
            <span className="font-mono tabular-nums text-foreground">{money(row.amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Creator clawback (net)</span>
            <span className="font-mono tabular-nums text-bad">−{money(row.creator_net)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Platform fee returned</span>
            <span className="font-mono tabular-nums text-muted">{money(row.amount - row.creator_net)}</span>
          </div>
        </div>

        <p className="font-mono text-[11px] text-muted leading-relaxed">
          The fan&apos;s card is refunded {money(row.amount)} via a partial refund of their grouped
          charge. {row.creator ? <>{row.creator.display_name}&apos;s</> : 'The creator&apos;s'} balance is
          debited the net they received — it may go negative. Both parties are notified.
        </p>

        <div>
          <FieldLabel>Reason (shown to the fan and creator) *</FieldLabel>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Creator could not deliver the work"
          />
          <FieldHint>Required. Included in the refund notifications sent to the fan and creator.</FieldHint>
        </div>

        <div>
          <FieldLabel>Internal notes (optional)</FieldLabel>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Context for other admins"
          />
          <FieldHint>Stored on the refund record — not shown to the fan or creator.</FieldHint>
        </div>

        <p className="font-mono text-[10px] text-muted/70 leading-relaxed">
          The fan keeps the refund either way — this just can&apos;t be reversed from here. To take
          the money back you&apos;d have to re-bill the fan manually.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={submit} disabled={submitting || !reason.trim()}>
            {submitting ? 'Refunding…' : `Refund ${money(row.amount)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Charge lookup + breakdown ─────────────────────────────────────────────────

function ChargeLookup({ onRefunded }: { onRefunded: () => void }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [paymentId, setPaymentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FanPaymentBackingsResponse | null>(null);
  const [confirmRow, setConfirmRow] = useState<FanPaymentBackingRow | null>(null);

  const lookup = useCallback(async (idOverride?: number) => {
    const id = idOverride ?? parseInt(paymentId, 10);
    if (isNaN(id) || id < 1) return;
    setLoading(true);
    try {
      const res = await adminApi.refunds.paymentBackings(id);
      setResult(res.data);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      setResult(null);
      toast(e.status === 404 ? `No payment #${id} found.` : (e.message ?? 'Lookup failed.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [paymentId, toast]);

  // Deep link from billing-run chargeback rows: /admin/refunds?payment=123
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (autoLoaded.current) return;
    const fromUrl = parseInt(searchParams.get('payment') ?? '', 10);
    if (!isNaN(fromUrl) && fromUrl > 0) {
      autoLoaded.current = true;
      setPaymentId(String(fromUrl));
      lookup(fromUrl);
    }
  }, [searchParams, lookup]);

  return (
    <>
      {confirmRow && (
        <RefundConfirmModal
          row={confirmRow}
          onClose={() => setConfirmRow(null)}
          onDone={() => {
            setConfirmRow(null);
            lookup(result?.fan_payment.id);
            onRefunded();
          }}
        />
      )}

      <Card>
        <SectionLabel className="mb-2">look up a charge</SectionLabel>
        <p className="text-sm text-muted mb-3 max-w-2xl">
          One charge covers a fan&apos;s whole billing cycle — backings across multiple bounties and
          creators. Look it up by payment # (on receipts, billing-run details and chargeback rows)
          to refund individual slices.
        </p>
        <form
          className="flex items-end gap-2 max-w-sm"
          onSubmit={(e) => { e.preventDefault(); lookup(); }}
        >
          <div className="flex-1">
            <FieldLabel>Payment #</FieldLabel>
            <Input
              mono
              inputMode="numeric"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 1042"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={loading || !paymentId}>
            {loading ? 'Loading…' : 'Load'}
          </Button>
        </form>

        {result && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-mono text-[11px] text-muted">
                payment <span className="text-foreground">#{result.fan_payment.id}</span>
              </span>
              {result.fan_payment.user && (
                <Link href={`/admin/users?focus=${result.fan_payment.user.id}`} className="font-mono text-[11px] text-muted hover:underline">
                  fan: <span className="text-foreground">{result.fan_payment.user.display_name}</span>
                </Link>
              )}
              <span className="font-mono text-[11px] text-muted">
                gross <span className="text-foreground tabular-nums">{money(result.fan_payment.gross_paid)}</span>
              </span>
              <Badge tone={result.fan_payment.status === 'completed' ? 'good' : 'warn'}>{result.fan_payment.status}</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <Th>Bounty</Th><Th>Creator</Th><Th>Fan paid</Th><Th>Creator net</Th><Th>Status</Th><th className="py-1.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.backings.map((b) => (
                    <tr key={b.backing_id} className="align-top">
                      <td className="py-2.5 pr-3 max-w-[220px]">
                        {b.bounty
                          ? <Link href={`/bounties/${b.bounty.id}`} className="text-foreground hover:underline line-clamp-2">{b.bounty.title}</Link>
                          : <span className="font-mono text-[11px] text-muted">deleted bounty</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-muted">{b.creator?.display_name ?? '—'}</td>
                      <td className="py-2.5 pr-3 font-mono text-[12px] tabular-nums">{money(b.amount)}</td>
                      <td className="py-2.5 pr-3 font-mono text-[12px] tabular-nums text-muted">{money(b.creator_net)}</td>
                      <td className="py-2.5 pr-3">
                        {b.refunded_at
                          ? <Badge tone="info">refunded {fmtDateTime(b.refunded_at)}</Badge>
                          : <Badge tone="good">settled</Badge>}
                      </td>
                      <td className="py-2.5 text-right">
                        {b.refundable && result.fan_payment.status === 'completed' && (
                          <Button variant="danger" size="sm" onClick={() => setConfirmRow(b)}>Refund</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.backings.length === 0 && (
                <p className="font-mono text-[11px] text-muted/70 border border-dashed border-border rounded px-3 py-2.5 mt-2">
                  No backings recorded against this payment.
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

// ── Refund history ────────────────────────────────────────────────────────────

function RefundHistory({ refreshKey }: { refreshKey: number }) {
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await adminApi.refunds.list(p);
      setRefunds(res.data);
      setPage(res.current_page);
      setLastPage(res.last_page);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage, refreshKey]);

  return (
    <div>
      <SectionLabel className="mb-2">refund history</SectionLabel>
      {loading ? (
        <Card><div className="h-16 bg-surface-2 animate-pulse rounded" /></Card>
      ) : refunds.length === 0 ? (
        <Empty icon="↩" title="No refunds yet" message="Refunds issued by admins or creators will appear here." />
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto -mx-5 -my-4">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-border">
                    <Th>When</Th><Th>Fan</Th><Th>Bounty</Th><Th>Refunded</Th><Th>Clawback</Th><Th>Source</Th><Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {refunds.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="py-2.5 pl-5 pr-3 font-mono text-[10px] text-muted whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                      <td className="py-2.5 pr-3">
                        {r.fan
                          ? <Link href={`/admin/users?focus=${r.fan.id}`} className="text-foreground hover:underline">{r.fan.display_name}</Link>
                          : <span className="font-mono text-[11px] text-muted">deleted user</span>}
                      </td>
                      <td className="py-2.5 pr-3 max-w-[220px]">
                        {r.bounty
                          ? <Link href={`/bounties/${r.bounty.id}`} className="text-foreground hover:underline line-clamp-1">{r.bounty.title}</Link>
                          : <span className="font-mono text-[11px] text-muted">—</span>}
                        {r.reason && (
                          <div className="font-mono text-[10px] text-muted/80 line-clamp-1 mt-0.5" title={r.reason}>
                            &ldquo;{r.reason}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[12px] tabular-nums">{money(r.amount)}</td>
                      <td className="py-2.5 pr-3">
                        <span className="font-mono text-[12px] tabular-nums text-bad">−{money(r.creator_clawback)}</span>
                        {r.creator && <div className="font-mono text-[10px] text-muted">{r.creator.display_name}</div>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={r.source === 'admin' ? 'warn' : 'info'}>{r.source}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={REFUND_STATUS_TONE[r.status]}>{r.status}</Badge>
                        {r.failure_reason && <div className="font-mono text-[10px] text-bad mt-0.5 max-w-[140px] truncate" title={r.failure_reason}>{r.failure_reason}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="default" size="sm" disabled={page === 1 || loading} onClick={() => fetchPage(page - 1)}>← Prev</Button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">Page {page} of {lastPage}</span>
              <Button variant="default" size="sm" disabled={page === lastPage || loading} onClick={() => fetchPage(page + 1)}>Next →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminRefundsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) router.push('/');
  }, [authLoading, user, router]);

  if (authLoading || !user || user.role !== 'council') return null;

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      <div>
        <SectionLabel className="mb-1">council · admin</SectionLabel>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <h1 className="font-display font-bold text-[28px]">Refunds</h1>
          <Link href="/admin/billing"><Button variant="ghost" size="sm">← Billing runs</Button></Link>
        </div>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          Refund individual backings out of grouped charges. The fan always gets back the full
          amount they paid; the creator is clawed back the net they received (their balance may go
          negative) and the platform returns its fee.
        </p>
      </div>

      <Suspense fallback={<Card><div className="h-24 bg-surface-2 animate-pulse rounded" /></Card>}>
        <ChargeLookup onRefunded={() => setRefreshKey((k) => k + 1)} />
      </Suspense>
      <RefundHistory refreshKey={refreshKey} />
    </div>
  );
}
