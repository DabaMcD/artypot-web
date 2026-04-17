'use client';

import { useState, useEffect, useCallback } from 'react';
import { billing, votives as votivesApi } from '@/lib/api';
import type { PaymentMethod } from '@/lib/types';
import { useToast } from '@/lib/toast-context';
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

interface Props {
  /** Called whenever the list of payment methods changes (useful for parent gating). */
  onMethodsChange?: (methods: PaymentMethod[]) => void;
  /** If true renders more compactly (e.g. inline on pot page). */
  compact?: boolean;
}

export default function PaymentMethodManager({ onMethodsChange, compact = false }: Props) {
  const { toast } = useToast();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  // For the confirm dialog
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  // Total active votive amount — fetched once on mount for last-card warning
  const [votiveTotalAmount, setVotiveTotalAmount] = useState(0);

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
    votivesApi.list().then((res) => setVotiveTotalAmount(res.total_active_amount)).catch(() => {});
  }, [fetchMethods]);

  const handleAdded = async () => {
    setShowAdd(false);
    await fetchMethods();
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    const targetId = removeTarget;
    setRemoveTarget(null);
    setRemoving(targetId);
    try {
      const res = await billing.deletePaymentMethod(targetId);
      const updated = methods.filter((m) => m.id !== targetId);
      setMethods(updated);
      onMethodsChange?.(updated);
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

  const isLastCard = methods.length === 1;

  if (loading) {
    return (
      <div className="py-4 flex justify-center">
        <div className="w-5 h-5 border-2 border-fan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Remove confirm dialog */}
      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setRemoveTarget(null); }}
        >
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isLastCard ? 'Remove last payment method' : 'Remove payment method'}
            </h2>
            <div className="text-sm text-muted leading-relaxed mb-6">
              {isLastCard && votiveTotalAmount > 0 ? (
                <>
                  <p className="mb-2">
                    This is your <strong className="text-foreground">only payment method</strong>. Removing it will
                    immediately cancel{' '}
                    <strong className="text-foreground">
                      all ${votiveTotalAmount.toFixed(2)} of your active commitments
                    </strong>.
                  </p>
                  <p>You won&apos;t be charged for completed pots until you add a new payment method.</p>
                </>
              ) : isLastCard ? (
                <p>This is your only saved payment method. Remove it?</p>
              ) : (
                <p>Remove this payment method?</p>
              )}
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
                {removing ? 'Removing…' : 'Remove'}
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
                className="flex items-center justify-between bg-surface-2 border border-border rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-foreground text-sm font-medium">
                    {cardLabel(m.brand)}
                  </span>
                  <span className="text-muted text-sm">
                    •••• {m.last4}
                  </span>
                  <span className="text-muted text-xs">
                    {m.exp_month}/{m.exp_year}
                  </span>
                </div>
                <button
                  onClick={() => setRemoveTarget(m.id)}
                  disabled={removing === m.id}
                  className="text-xs text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  {removing === m.id ? 'Removing…' : 'Remove'}
                </button>
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
