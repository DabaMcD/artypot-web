'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { overlord as overlordApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { TreasurySummary, PlatformWithdrawal, PlatformWithdrawalCategory } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FieldLabel, FieldHint } from '@/components/ui/Input';
import Link from 'next/link';

const PURPLE = '#8A2BE2';

const CATEGORY_LABELS: Record<PlatformWithdrawalCategory, string> = {
  business_expense: 'Business expense',
  payroll:          'Payroll',
  tax:              'Tax',
  owner_draw:       'Owner draw',
  transfer:         'Transfer',
  other:            'Other',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as PlatformWithdrawalCategory[];

function usd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** A labelled dollar figure. */
function Stat({ label, value, accent, sub }: {
  label: string;
  value: string;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
      <div
        className="shrink-0 font-mono tabular-nums text-base"
        style={accent ? { color: PURPLE } : { color: 'var(--color-foreground)' }}
      >
        {value}
      </div>
    </div>
  );
}

export default function OverlordTreasuryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<TreasurySummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<PlatformWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, w] = await Promise.all([
        overlordApi.treasury(),
        overlordApi.withdrawals.list(),
      ]);
      setData(t.data);
      setWithdrawals(w.data);
    } catch {
      toast('Failed to load Treasury.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }
    fetchAll();
  }, [user, authLoading, router, fetchAll]);

  const handleReverse = async (w: PlatformWithdrawal) => {
    const reason = window.prompt('Reason for reversing this withdrawal?');
    if (!reason || !reason.trim()) return;
    try {
      await overlordApi.withdrawals.reverse(w.id, reason.trim());
      toast('Withdrawal reversed.', 'success');
      fetchAll();
    } catch {
      toast('Failed to reverse withdrawal.', 'error');
    }
  };

  if (authLoading || (!user?.is_overlord && !authLoading)) {
    return null; // redirect in useEffect
  }

  // The amount that, if recorded, brings the discrepancy to ~$0.
  // expected − stripe = −discrepancy. Only meaningful when Stripe is short.
  const reconcilingAmount =
    data && data.discrepancy !== null && data.discrepancy < 0
      ? Math.round(Math.abs(data.discrepancy) * 100) / 100
      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="text-xs font-mono mb-3">
          <Link href="/obelisk" className="hover:underline text-muted">← Overlord</Link>
        </div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <h1 className="text-2xl font-display font-bold text-foreground">Treasury</h1>
          </div>
          {data && (
            <Button size="sm" onClick={() => setShowWithdraw(true)}>
              Withdraw to Mercury
            </Button>
          )}
        </div>
        <p className="text-sm text-muted">
          The Float — what Stripe holds vs. what the ledger says it should, and
          who that money belongs to.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#8A2BE2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-sm text-muted py-6">No data.</p>
      ) : (
        <div className="space-y-6">

          {/* Reconciliation */}
          <div className="bg-surface border border-[#8A2BE2]/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: PURPLE }}>
                Reconciliation
              </h2>
              <ReconBadge reconciled={data.reconciled} discrepancy={data.discrepancy} />
            </div>

            <div className="divide-y divide-border">
              <Stat
                label="Stripe balance"
                sub="available + pending, USD"
                value={data.stripe_balance === null ? '— unavailable' : usd(data.stripe_balance)}
              />
              <Stat
                label="Ledger expected"
                sub="owed to creators + platform float"
                value={usd(data.expected_balance)}
              />
              {data.discrepancy !== null && data.discrepancy !== 0 && (
                <Stat
                  label="Discrepancy"
                  value={`${data.discrepancy > 0 ? '+' : ''}${usd(data.discrepancy)}`}
                />
              )}
            </div>

            {reconcilingAmount !== null && (
              <p className="text-xs text-muted mt-3">
                Stripe is short by {usd(reconcilingAmount)} vs. the ledger. If you
                swept that to Mercury, record it below to reconcile — otherwise
                investigate the gap.
              </p>
            )}
          </div>

          {/* Where the money belongs */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: PURPLE }}>
              Who it belongs to
            </h2>
            <div className="divide-y divide-border">
              <Stat
                label="Owed to creators"
                sub={`${usd(data.owed_available)} available · ${usd(data.owed_clearing)} clearing`}
                value={usd(data.owed_to_creators)}
              />
              <Stat
                label="Platform float"
                sub="your money still in Stripe, withdrawable"
                value={usd(data.platform_float)}
                accent
              />
            </div>
          </div>

          {/* Withdrawals to Mercury */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: PURPLE }}>
                Swept to Mercury
              </h2>
              <span className="font-mono tabular-nums text-sm text-foreground">
                {usd(data.business_withdrawals_total)} <span className="text-muted">lifetime</span>
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <p className="text-sm text-muted py-1">No withdrawals recorded yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {withdrawals.slice(0, 8).map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground">
                        {CATEGORY_LABELS[w.category]}
                        <span className="text-muted"> · {w.destination}</span>
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {w.withdrawn_at}
                        {w.external_reference_id ? ` · ${w.external_reference_id}` : ''}
                        {w.notes ? ` · ${w.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono tabular-nums text-sm text-foreground">−{usd(w.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleReverse(w)}
                        className="text-xs text-muted hover:text-red-400 transition-colors"
                      >
                        reverse
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue & lifetime flows */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: PURPLE }}>
              Revenue &amp; lifetime flows
            </h2>
            <div className="divide-y divide-border">
              <Stat label="Fee revenue (MTD)" value={usd(data.fee_revenue_mtd)} accent />
              <Stat label="Fee revenue (all-time)" value={usd(data.platform_fees_total)} />
              <Stat label="Gross collected from fans" value={usd(data.gross_collected)} />
              <Stat label="Stripe processing fees" value={usd(data.stripe_fees_total)} />
              <Stat label="Paid out to creators" value={usd(data.paid_out_to_creators)} />
              <Stat
                label="Payout fees absorbed"
                sub="rail fees Artypot covered on manual payouts"
                value={`−${usd(data.absorbed_payout_fees)}`}
              />
            </div>
          </div>

          {/* Float breakdown */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: PURPLE }}>
              Float reconciliation
            </h2>
            <div className="divide-y divide-border">
              <Stat label="Platform fees (all-time)" value={usd(data.platform_fees_total)} />
              <Stat label="Less: payout fees absorbed" value={`−${usd(data.absorbed_payout_fees)}`} />
              <Stat label="Less: swept to Mercury" value={`−${usd(data.business_withdrawals_total)}`} />
              <Stat label="Platform float" value={usd(data.platform_float)} accent />
            </div>
          </div>

          <p className="text-xs text-muted/60 font-mono">
            snapshot as of {new Date(data.as_of).toLocaleString()}
          </p>
        </div>
      )}

      {showWithdraw && data && (
        <WithdrawModal
          suggestedAmount={reconcilingAmount}
          platformFloat={data.platform_float}
          onClose={() => setShowWithdraw(false)}
          onCreated={() => { setShowWithdraw(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

function WithdrawModal({ suggestedAmount, platformFloat, onClose, onCreated }: {
  suggestedAmount: number | null;
  platformFloat: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState(suggestedAmount !== null ? String(suggestedAmount) : '');
  const [category, setCategory] = useState<PlatformWithdrawalCategory>('transfer');
  const [destination, setDestination] = useState('Mercury');
  const [refId, setRefId] = useState('');
  const [withdrawnAt, setWithdrawnAt] = useState(today);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = parseFloat(amount);
  const overFloat = !isNaN(numericAmount) && numericAmount > platformFloat;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isNaN(numericAmount) || numericAmount < 0.01) { setError('Amount must be at least $0.01.'); return; }

    setSubmitting(true);
    try {
      await overlordApi.withdrawals.create({
        amount: numericAmount,
        category,
        destination: destination.trim() || 'Mercury',
        external_reference_id: refId.trim() || undefined,
        withdrawn_at: withdrawnAt,
        notes: notes.trim() || undefined,
      });
      toast('Withdrawal recorded.', 'success');
      onCreated();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to record withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Withdraw to Mercury" onClose={onClose} lg>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Amount (USD)</FieldLabel>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            {suggestedAmount !== null && (
              <FieldHint>
                Pre-filled with the {usd(suggestedAmount)} reconciling amount. Edit
                if you withdrew a different sum.
              </FieldHint>
            )}
            {overFloat && (
              <FieldHint>
                <span className="text-amber-400">
                  ⚠ Exceeds platform float ({usd(platformFloat)}) — this dips into
                  creator-owed funds. Allowed, but double-check.
                </span>
              </FieldHint>
            )}
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Select value={category} onChange={(e) => setCategory(e.target.value as PlatformWithdrawalCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Destination</FieldLabel>
            <Input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Mercury"
            />
          </div>
          <div>
            <FieldLabel>Withdrawn at</FieldLabel>
            <Input
              type="date"
              value={withdrawnAt}
              max={today}
              onChange={(e) => setWithdrawnAt(e.target.value)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Reference ID</FieldLabel>
          <Input
            type="text"
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            placeholder="Stripe payout id / Mercury txn (optional)"
          />
        </div>

        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="optional context for future audits"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Recording…' : 'Record withdrawal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReconBadge({ reconciled, discrepancy }: {
  reconciled: boolean | null;
  discrepancy: number | null;
}) {
  if (reconciled === null) {
    return (
      <span className="text-xs font-mono px-2 py-0.5 rounded border border-border text-muted">
        balance unavailable
      </span>
    );
  }
  if (reconciled) {
    return (
      <span className="text-xs font-mono px-2 py-0.5 rounded border border-emerald-800/50 bg-emerald-900/30 text-emerald-400">
        ✓ reconciled
      </span>
    );
  }
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded border border-red-800/50 bg-red-900/30 text-red-400">
      ⚠ off by {discrepancy !== null ? usd(Math.abs(discrepancy)) : '—'}
    </span>
  );
}
