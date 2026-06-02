'use client';

import { useState, useEffect, useCallback } from 'react';
import { billing, backings as backingsApi } from '@/lib/api';
import type { PaymentMethod } from '@/lib/types';
import { useToast } from '@/lib/toast-context';
import { useNudgeContext } from '@/lib/nudge-context';
import { nextBillingInfo } from '@/lib/config';
import AddCardForm from './AddCardForm';

const BRAND_ICONS: Record<string, string> = {
  visa: '💳 Visa',
  mastercard: '💳 Mastercard',
  amex: '💳 Amex',
  discover: '💳 Discover',
  jcb: '💳 JCB',
  unionpay: '💳 UnionPay',
  diners: '💳 Diners',
};

function cardLabel(cardBrand: string) {
  return BRAND_ICONS[cardBrand.toLowerCase()] ?? `💳 ${cardBrand}`;
}

const REASON_LABEL: Record<NonNullable<PaymentMethod['invalidation_reason']>, string> = {
  expired:              'expired',
  detached_at_stripe:   'removed at your bank',
  replaced_by_updater:  'replaced by your card issuer',
  billing_failure:      'billing failure',
};

interface Props {
  /** Called whenever the list of payment methods changes (useful for parent gating). */
  onMethodsChange?: (methods: PaymentMethod[]) => void;
  /** If true renders more compactly (e.g. inline on bounty page). */
  compact?: boolean;
}

export default function PaymentMethodManager({ onMethodsChange, compact = false }: Props) {
  const { toast } = useToast();
  const { refresh: refreshNudge } = useNudgeContext();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  // The card the user has asked to remove. The actual delete fires from the
  // modal's confirm button (or directly if the modal isn't needed).
  const [removeTarget, setRemoveTarget] = useState<PaymentMethod | null>(null);

  // Total of the user's active backings, used in the "last valid PM" warning.
  const [backingTotalAmount, setBackingTotalAmount] = useState(0);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await billing.paymentMethods();
      setMethods(res.data);
      onMethodsChange?.(res.data);
    } catch {
      setError('Could not load payment methods.');
    } finally {
      setLoading(false);
    }
  }, [onMethodsChange]);

  useEffect(() => {
    fetchMethods();
    backingsApi.list().then((res) => setBackingTotalAmount(res.total_active_amount)).catch(() => {});
  }, [fetchMethods]);

  const handleAdded = async () => {
    setShowAdd(false);
    await fetchMethods();
    void refreshNudge();
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    const targetId = removeTarget.id;
    setRemoveTarget(null);
    setRemoving(targetId);
    try {
      const res = await billing.deletePaymentMethod(targetId);
      const updated = methods.filter((m) => m.id !== targetId);
      setMethods(updated);
      onMethodsChange?.(updated);
      // The legacy "immediately revoke backings on last-PM removal" path is
      // gone — revoked_count will always be 0 here. We keep the toast for the
      // case where a future server change re-introduces some kind of inline
      // revocation; otherwise it's silent.
      if (res.data.revoked_count > 0) {
        toast(
          `Payment method removed — ${res.data.revoked_count} commitment${res.data.revoked_count === 1 ? '' : 's'} ($${res.data.revoked_amount.toFixed(2)}) cancelled.`,
          'error',
        );
      }
    } catch {
      setError('Could not remove payment method.');
    } finally {
      setRemoving(null);
    }
  };

  // Decide whether to fire the informational modal: only when the
  // post-removal state would be "no valid payment methods on file." If the
  // user has another valid card after removing this one, no modal — they're
  // still backed.
  const requestRemove = (m: PaymentMethod) => {
    const wouldLeaveAnyValid = methods.some((other) => other.id !== m.id && other.is_valid);
    if (wouldLeaveAnyValid) {
      // Single-tap path — no modal.
      void (async () => {
        setRemoving(m.id);
        try {
          await billing.deletePaymentMethod(m.id);
          const updated = methods.filter((x) => x.id !== m.id);
          setMethods(updated);
          onMethodsChange?.(updated);
        } catch {
          setError('Could not remove payment method.');
        } finally {
          setRemoving(null);
        }
      })();
      return;
    }
    setRemoveTarget(m);
  };

  const { label: nextChargeLabel } = nextBillingInfo();

  if (loading) {
    return (
      <div className="py-4 flex justify-center">
        <div className="w-5 h-5 border-2 border-fan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Informational confirm — fires only when removal would leave the user
          with no valid PM. The modal does not block; "Remove anyway" proceeds. */}
      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setRemoveTarget(null); }}
        >
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-3">Remove this payment method?</h2>
            <div className="text-sm text-muted leading-relaxed space-y-2 mb-6">
              <p>
                This is your <strong className="text-foreground">only valid payment method</strong> on file. If you remove it:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  Your{' '}
                  <strong className="text-foreground">${backingTotalAmount.toFixed(2)}</strong>{' '}
                  in active backings will be marked soft and revoked at the next billing cycle on{' '}
                  <strong className="text-foreground">{nextChargeLabel}</strong>.
                </li>
                <li>You can add a new payment method any time before then to keep your backings active.</li>
                <li>You can add a new payment method after revocation, but you&apos;ll need to re-back any bounties you want to support.</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={!!removing}
                className="flex-1 border border-border text-foreground text-sm font-medium py-2.5 rounded-lg hover:border-foreground/30 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={!!removing}
                className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {removing ? 'Removing…' : 'Remove anyway'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Saved cards */}
        {methods.length > 0 && (
          <div className="space-y-2">
            {methods.map((m) => (
              <div
                key={m.id}
                className={`bg-surface-2 border rounded-lg px-4 py-3 ${m.is_valid ? 'border-border' : 'border-warn'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-foreground text-sm font-medium">
                      {cardLabel(m.brand)}
                    </span>
                    <span className="text-muted text-sm">•••• {m.last4}</span>
                    <span className="text-muted text-xs">{m.exp_month}/{m.exp_year}</span>
                    {!m.is_valid && m.invalidation_reason && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-warn">
                        {REASON_LABEL[m.invalidation_reason] ?? m.invalidation_reason}
                      </span>
                    )}
                  </div>
                  {m.is_valid && (
                    <button
                      onClick={() => requestRemove(m)}
                      disabled={removing === m.id}
                      className="text-xs text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      {removing === m.id ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>

                {/* Invalid card — Update / Remove. No "Yes, keep it": validity
                    is a fact from Stripe + expiration, not user assertion. */}
                {!m.is_valid && (
                  <div className="mt-3 pt-3 border-t border-warn/40 flex items-center gap-4 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowAdd(true)}
                      className="text-sm font-semibold whitespace-nowrap hover:underline underline-offset-2"
                    >
                      Update card
                    </button>
                    <button
                      type="button"
                      onClick={() => requestRemove(m)}
                      disabled={removing === m.id}
                      className="text-sm whitespace-nowrap text-foreground/50 hover:text-foreground/80 transition-colors disabled:opacity-50"
                    >
                      {removing === m.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {methods.length === 0 && !showAdd && (
          <p className={`text-muted text-sm ${compact ? '' : 'py-2'}`}>
            No payment methods saved yet.
          </p>
        )}

        {/* Add card form */}
        {showAdd ? (
          <div className="border border-fan/30 rounded-xl p-5 bg-surface">
            {!compact && (
              <p className="text-sm font-medium text-foreground mb-4">Add a card</p>
            )}
            <AddCardForm
              onSuccess={handleAdded}
              onCancel={() => setShowAdd(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className={`text-sm font-medium text-fan hover:underline ${compact ? '' : 'mt-1 block'}`}
          >
            + Add payment method
          </button>
        )}
      </div>
    </>
  );
}
