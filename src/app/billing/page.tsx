'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { billing } from '@/lib/api';
import PaymentMethodManager from '@/components/PaymentMethodManager';

export default function BillingPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    billing
      .cash()
      .then((res) => setBalance(res.balance))
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false));
  }, [user]);

  const handlePayNow = async () => {
    if (paying) return;
    setPaying(true);
    try {
      const res = await billing.payNow();
      toast(res.message, 'success');
      setBalance(0);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Payment failed.', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-surface animate-pulse rounded mb-6" />
        <div className="h-32 bg-surface animate-pulse rounded-xl" />
      </div>
    );
  }

  const hasOutstandingBalance = balance !== null && balance < 0;
  const outstandingAmount = hasOutstandingBalance ? Math.abs(balance) : 0;

  // Billing timeline dates
  const now = new Date();
  const dayOfMonth = now.getDate();
  const previewDate = dayOfMonth < 23
    ? `${now.toLocaleDateString('en-US', { month: 'short' })} 23`
    : `${new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short' })} 23`;
  const chargeDate = dayOfMonth < 24
    ? `${now.toLocaleDateString('en-US', { month: 'short' })} 24`
    : `${new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short' })} 24`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">Payment Methods</h1>
        <p className="text-muted text-sm">
          Your saved cards are charged for the bounties you back when they pay out. You are only
          charged once a completed work is council-approved and the 48-hour review window closes.
        </p>
      </div>

      {/* Outstanding balance section — only shown when negative */}
      {!balanceLoading && hasOutstandingBalance && (
        <div className="border border-amber-800/40 bg-amber-900/10 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-foreground mb-1">Outstanding Balance</h3>
          <p className="text-2xl font-bold text-red-400 mb-2">
            ${outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-muted text-sm mb-4 leading-relaxed">
            Your balance is charged automatically on the 24th of each month. Paying early is an
            option, but usually not necessary — waiting avoids multiple small Stripe transactions.
          </p>
          <button
            onClick={handlePayNow}
            disabled={paying}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold px-4 py-2 text-sm rounded-lg transition-colors"
          >
            {paying
              ? 'Processing…'
              : `Pay $${outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} now`}
          </button>
        </div>
      )}

      {/* Charge breakdown — only when outstanding balance exists */}
      {!balanceLoading && hasOutstandingBalance && (
        <div className="border border-border rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Charge Breakdown
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1.5 text-muted">Approved pledges</td>
                <td className="py-1.5 text-right text-foreground font-mono">${outstandingAmount.toFixed(2)}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 font-semibold text-foreground">Total charged to card</td>
                <td className="py-1.5 text-right font-bold text-foreground font-mono">${outstandingAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-muted text-xs">− Platform fee (15%)</td>
                <td className="py-1.5 text-right text-muted text-xs font-mono">−${(outstandingAmount * 0.15).toFixed(2)}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 text-sm text-creator font-semibold">Creators receive</td>
                <td className="py-1.5 text-right text-creator font-bold font-mono">
                  ${(outstandingAmount * 0.85).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted mt-3">
            The 15% platform fee covers all transaction costs. You are always charged your exact committed amount.
          </p>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <PaymentMethodManager />
      </div>

      {/* How billing works */}
      <div className="border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">How billing works</h2>
        <ul className="space-y-2 text-sm text-muted">
          {[
            'You commit an amount when you back a bounty. Nothing is charged at that point.',
            'When a creator submits their work and the Council approves it, your charge is locked in immediately. You can only back out while the bounty is still open.',
            'Locked charges are collected automatically on the 24th of each month, or you can pay early using the button above.',
            'Artypot takes a 15% all-in platform fee from the creator\'s payout. This covers all processing costs — you are always charged your exact committed amount.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-fan mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Billing Timeline */}
      <div className="border border-border rounded-xl p-5 mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">This Month&apos;s Timeline</h2>
        <div className="space-y-3">
          {[
            { label: 'Now', desc: 'Approved pledges are locked in' },
            { label: previewDate, desc: 'Billing preview sent to your inbox' },
            { label: `${chargeDate} · 09:00 UTC`, desc: 'Your card is charged' },
            { label: '7 days after charge', desc: 'Funds clear and creators can withdraw' },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${i === 0 ? 'bg-fan' : 'bg-border'}`} />
                {i < 3 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="pb-3">
                <div className="text-xs text-muted uppercase tracking-wider">{item.label}</div>
                <div className="text-sm text-foreground mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
