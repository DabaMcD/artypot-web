'use client';

import { useState, useEffect, useCallback } from 'react';
import { billing } from '@/lib/api';
import type { PaymentMethod } from '@/lib/types';
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

function cardLabel(brand: string) {
  return BRAND_ICONS[brand.toLowerCase()] ?? `💳 ${brand}`;
}

interface Props {
  /** Called whenever the list of payment methods changes (useful for parent gating). */
  onMethodsChange?: (methods: PaymentMethod[]) => void;
  /** If true renders more compactly (e.g. inline on pot page). */
  compact?: boolean;
}

export default function PaymentMethodManager({ onMethodsChange, compact = false }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

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
  }, [fetchMethods]);

  const handleAdded = async () => {
    setShowAdd(false);
    await fetchMethods();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this payment method?')) return;
    setRemoving(id);
    try {
      await billing.deletePaymentMethod(id);
      const updated = methods.filter((m) => m.id !== id);
      setMethods(updated);
      onMethodsChange?.(updated);
    } catch {
      setError('Could not remove payment method.');
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="py-4 flex justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
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
                onClick={() => handleRemove(m.id)}
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
        <div className="border border-brand/30 rounded-xl p-5 bg-surface">
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
          className={`text-sm font-medium text-brand hover:underline ${compact ? '' : 'mt-1 block'}`}
        >
          + Add payment method
        </button>
      )}
    </div>
  );
}
