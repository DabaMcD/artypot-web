'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { billing } from '@/lib/api';
import type { PaymentMethod } from '@/lib/types';
import AddCardForm from '@/components/AddCardForm';

function cardLabel(card: PaymentMethod): string {
  const brand = card.brand.charAt(0).toUpperCase() + card.brand.slice(1);
  return `${brand} ••••${card.last4}`;
}

export function StaleCardBar() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  const fetchMethods = async () => {
    try {
      const res = await billing.paymentMethods();
      setMethods(res.data ?? []);
    } catch {
      // Silently swallow — not critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMethods();
    }
  }, [user]);

  if (!user || loading) return null;

  const staleCard = methods.find(m => !m.is_active);
  if (!staleCard) return null;

  if (showAddCard) {
    return (
      <div className="bg-warn-soft border border-warn text-foreground rounded-md px-5 py-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="shrink-0 w-6 h-6 rounded-full border-2 border-warn text-warn flex items-center justify-center text-xs font-black leading-none">!</span>
          <p className="text-sm font-semibold">Update your payment method</p>
        </div>
        <AddCardForm
          onSuccess={() => {
            setShowAddCard(false);
            fetchMethods();
          }}
          onCancel={() => setShowAddCard(false)}
        />
      </div>
    );
  }

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      await billing.confirmPaymentMethod(staleCard.id);
      await fetchMethods();
    } catch {
      // Silently swallow
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    setActionLoading(true);
    try {
      await billing.deletePaymentMethod(staleCard.id);
      await fetchMethods();
    } catch {
      // Silently swallow
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 bg-warn-soft border border-warn text-foreground rounded-md px-5 py-4 mb-6">
      <span className="shrink-0 w-6 h-6 rounded-full border-2 border-warn text-warn flex items-center justify-center text-xs font-black leading-none">!</span>
      <p className="flex-1 text-sm">
        Is your <span className="font-semibold">{cardLabel(staleCard)}</span> still yours?
      </p>
      <div className="flex items-center gap-4 shrink-0">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={actionLoading}
          className="text-sm font-semibold whitespace-nowrap hover:underline underline-offset-2 disabled:opacity-50"
        >
          Yes, keep it
        </button>
        <button
          type="button"
          onClick={() => setShowAddCard(true)}
          disabled={actionLoading}
          className="text-sm font-semibold whitespace-nowrap hover:underline underline-offset-2 disabled:opacity-50"
        >
          Update card
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={actionLoading}
          className="text-sm whitespace-nowrap text-foreground/50 hover:text-foreground/80 transition-colors disabled:opacity-50"
        >
          Remove it
        </button>
      </div>
    </div>
  );
}
