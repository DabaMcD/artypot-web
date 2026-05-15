'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { billing } from '@/lib/api';
import { BILLING_DAY } from '@/lib/config';
import PaymentMethodManager from '@/components/PaymentMethodManager';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { Timeline } from '@/components/ui/Timeline';

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
      <div className="space-y-6 pt-2">
        <div className="h-8 w-48 bg-surface animate-pulse rounded" />
        <div className="h-32 bg-surface animate-pulse rounded" />
      </div>
    );
  }

  const hasOutstandingBalance = balance !== null && balance < 0;
  const outstandingAmount = hasOutstandingBalance ? Math.abs(balance) : 0;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const previewDay = BILLING_DAY - 1;
  const previewDate = dayOfMonth < previewDay
    ? `${now.toLocaleDateString('en-US', { month: 'short' })} ${previewDay}`
    : `${new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${previewDay}`;
  const chargeDate = dayOfMonth < BILLING_DAY
    ? `${now.toLocaleDateString('en-US', { month: 'short' })} ${BILLING_DAY}`
    : `${new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${BILLING_DAY}`;

  return (
    <div className="space-y-7 pt-2 max-w-[680px]">
      <div>
        <SectionLabel>fan · billing</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">upcoming charge</h1>
      </div>

      {/* Outstanding balance */}
      {!balanceLoading && hasOutstandingBalance && (
        <Banner tone="warn">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-display font-bold text-foreground">
                ${outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} outstanding
              </div>
              <div className="font-display text-sm text-muted mt-0.5">
                charged automatically on the {BILLING_DAY}th — pay now to avoid the batch.
              </div>
            </div>
            <Button variant="primary" disabled={paying} onClick={handlePayNow}>
              {paying ? 'processing…' : `pay $${outstandingAmount.toFixed(2)} now`}
            </Button>
          </div>
        </Banner>
      )}

      {/* Charge breakdown */}
      {!balanceLoading && hasOutstandingBalance && (
        <Card>
          <SectionLabel className="mb-4">charge breakdown</SectionLabel>
          <table className="w-full font-mono text-sm">
            <tbody>
              <tr>
                <td className="py-1.5 font-display text-muted">approved pledges</td>
                <td className="py-1.5 text-right tabular-nums">${outstandingAmount.toFixed(2)}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 font-display font-bold text-foreground">total charged to card</td>
                <td className="py-1.5 text-right font-bold tabular-nums">${outstandingAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-1 font-display text-[11px] text-muted">− platform fee (15%)</td>
                <td className="py-1 text-right text-[11px] text-muted tabular-nums">−${(outstandingAmount * 0.15).toFixed(2)}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 font-display text-creator font-bold">creators receive</td>
                <td className="py-1.5 text-right text-creator font-bold tabular-nums">${(outstandingAmount * 0.85).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <p className="font-display text-xs text-muted mt-3 pt-3 border-t border-dashed border-border">
            the 15% platform fee covers all transaction costs. you are always charged your exact committed amount.
          </p>
        </Card>
      )}

      {/* Payment method */}
      <Card>
        <SectionLabel className="mb-4">payment method</SectionLabel>
        <PaymentMethodManager />
      </Card>

      {/* How billing works */}
      <Card dashed>
        <SectionLabel className="mb-4">how billing works</SectionLabel>
        <ul className="space-y-2 font-display text-sm text-muted">
          {[
            'you commit an amount when you back a bounty. nothing is charged at that point.',
            'when a creator submits their work and the council approves it, your charge is locked in. you can only back out while the bounty is still open.',
            `locked charges are collected automatically on the ${BILLING_DAY}th of each month, or you can pay early.`,
            'artypot takes a 15% all-in platform fee from the creator\'s payout. you always pay your exact committed amount.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-fan mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Timeline */}
      <Card>
        <SectionLabel className="mb-4">this month&apos;s timeline</SectionLabel>
        <Timeline
          items={[
            { when: 'now', what: 'approved pledges are locked in', done: true },
            { when: previewDate, what: 'billing preview sent to your inbox' },
            { when: `${chargeDate} · 09:00 UTC`, what: 'your card is charged' },
            { when: '7 days after charge', what: 'funds clear and creators can withdraw' },
          ]}
        />
      </Card>
    </div>
  );
}
