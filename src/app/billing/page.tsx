'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import PaymentMethodManager from '@/components/PaymentMethodManager';

export default function BillingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-surface animate-pulse rounded mb-6" />
        <div className="h-32 bg-surface animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Payment Methods</h1>
        <p className="text-muted text-sm">
          Your saved cards are used to charge your pledges when a pot pays out. You are only
          charged once a completed work is council-approved and the 7-day review window closes.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <PaymentMethodManager />
      </div>

      {/* How billing works */}
      <div className="border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">How billing works</h2>
        <ul className="space-y-2 text-sm text-muted">
          {[
            'You pledge a fixed amount when you back a pot. Nothing is charged at that point.',
            "When a creator submits their work and the council approves it, a 7-day review window opens.",
            'If you don\'t revoke your pledge during that window, you\'re charged on the next billing cycle (the 24th of the month).',
            'Artypot takes a 5% platform fee. Stripe processing fees (2.9% + $0.30) are deducted from the creator\'s payout unless you opt to cover them.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-brand mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
