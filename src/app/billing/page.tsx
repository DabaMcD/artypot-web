'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { billing } from '@/lib/api';
import { BILLING_DAY, nextBillingInfo, WARP_SPEED, PLATFORM_FEE_PCT } from '@/lib/config';
import PaymentMethodManager from '@/components/PaymentMethodManager';
import { ConfirmPaymentModal } from '@/components/ConfirmPaymentModal';
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
  // 3DS / SCA modal — opens when payNow returns requires_action OR when the
  // PaymentAuthBanner triggers a deep link. We keep modal state local to the
  // page so the same Pay Now button can drive it inline without a page reload.
  const [authModal, setAuthModal] = useState<{ clientSecret: string; amountCents?: number } | null>(null);

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

      // 3DS / SCA — surface Stripe's challenge modal in-place.
      if (res.requires_action && res.client_secret) {
        const cents = balance != null ? Math.round(Math.abs(balance) * 100) : undefined;
        setAuthModal({ clientSecret: res.client_secret, amountCents: cents });
        return;
      }

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

  const { label: chargeDate } = nextBillingInfo();
  // Preview fires one "unit" before billing (one day normal, one minute warp)
  const previewDate = (() => {
    if (WARP_SPEED) {
      const now = new Date();
      const previewMinute = BILLING_DAY - 1;
      const d = new Date(now);
      d.setSeconds(0, 0);
      if (now.getMinutes() < previewMinute) {
        d.setMinutes(previewMinute);
      } else {
        d.setHours(now.getHours() + 1, previewMinute, 0, 0);
      }
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    const now = new Date();
    const previewDay = BILLING_DAY - 1;
    const d = now.getDate() < previewDay
      ? new Date(now.getFullYear(), now.getMonth(), previewDay)
      : new Date(now.getFullYear(), now.getMonth() + 1, previewDay);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  return (
    <div className="space-y-7 pt-2 max-w-[680px]">
      {authModal && (
        <ConfirmPaymentModal
          clientSecret={authModal.clientSecret}
          amountCents={authModal.amountCents}
          onSuccess={() => {
            setAuthModal(null);
            setBalance(0);
            toast('Payment authorized.', 'success');
          }}
          onClose={() => setAuthModal(null)}
        />
      )}

      <div>
        <SectionLabel>fan · billing</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">upcoming charge</h1>
      </div>

      {/* Outstanding balance */}
      {!balanceLoading && hasOutstandingBalance && (
        <Banner tone="warn">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-bold text-foreground">
                ${outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} outstanding
              </div>
              <div className="text-sm text-muted mt-0.5">
                Charged automatically on the {BILLING_DAY}th — pay now to avoid the batch.
              </div>
            </div>
            <Button variant="primary" disabled={paying} onClick={handlePayNow}>
              {paying ? 'Processing…' : `Pay $${outstandingAmount.toFixed(2)} Now`}
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
                <td className="py-1.5 text-muted">approved pledges</td>
                <td className="py-1.5 text-right tabular-nums">${outstandingAmount.toFixed(2)}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 font-bold text-foreground">total charged to card</td>
                <td className="py-1.5 text-right font-bold tabular-nums">${outstandingAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-1 text-[11px] text-muted">− platform fee ({PLATFORM_FEE_PCT}%)</td>
                <td className="py-1 text-right text-[11px] text-muted tabular-nums">−${(outstandingAmount * PLATFORM_FEE_PCT / 100).toFixed(2)}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 text-creator font-bold">creators receive</td>
                <td className="py-1.5 text-right text-creator font-bold tabular-nums">${(outstandingAmount * (1 - PLATFORM_FEE_PCT / 100)).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted mt-3 pt-3 border-t border-dashed border-border">
            The {PLATFORM_FEE_PCT}% platform fee covers all transaction costs. You are always charged your exact committed amount.
          </p>
        </Card>
      )}

      {/* Payment method */}
      <div id="payment-method">
        <Card>
          <SectionLabel className="mb-4">payment method</SectionLabel>
          <PaymentMethodManager />
        </Card>
      </div>

      {/* How billing works */}
      <Card dashed>
        <SectionLabel className="mb-4">how billing works</SectionLabel>
        <ul className="space-y-2 text-sm text-muted">
          {[
            'You commit an amount when you back a bounty. Nothing is charged at that point.',
            'When a creator submits their work and the council approves it, your charge is locked in. You can only back out while the bounty is still open.',
            `Locked charges are collected automatically on the ${BILLING_DAY}th of each month, or you can pay early.`,
            `Artypot takes a ${PLATFORM_FEE_PCT}% all-in platform fee from the creator's payout. You always pay your exact committed amount.`,
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
