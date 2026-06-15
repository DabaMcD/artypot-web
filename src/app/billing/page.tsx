'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { billing, backings as backingsApi } from '@/lib/api';
import type { PublicUserBacking } from '@/lib/types';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import Link from 'next/link';
import { BILLING_DAY, nextBillingInfo, WARP_SPEED } from '@/lib/config';
import PaymentMethodManager from '@/components/PaymentMethodManager';
import { ConfirmPaymentModal } from '@/components/ConfirmPaymentModal';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Timeline } from '@/components/ui/Timeline';

export default function BillingPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [lockedBackings, setLockedBackings] = useState<PublicUserBacking[]>([]);
  const [brokeCooldown, setBrokeCooldown] = useState<{ ends_at: string; started_at: string } | null>(null);
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
    Promise.all([
      billing.cash(),
      backingsApi.list({ bounty_status: 'completed', per_page: 100, sort: 'amount' }),
    ])
      .then(([cashRes, backingRes]) => {
        setBalance(cashRes.balance);
        setLockedBackings(backingRes.data);
        setBrokeCooldown(cashRes.broke_cooldown);
      })
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

      {brokeCooldown && (
        <Card accent>
          <SectionLabel className="mb-2 text-warn">broke cooldown in effect</SectionLabel>
          <p className="text-sm text-muted leading-snug">
            You declared broke on {new Date(brokeCooldown.started_at).toLocaleDateString()}.
            New backings are blocked until{' '}
            <span className="font-mono text-foreground">
              {new Date(brokeCooldown.ends_at).toLocaleString()}
            </span>.
          </p>
        </Card>
      )}

      {/* What will be charged */}
      {!balanceLoading && hasOutstandingBalance && (
        <Card>
          <div className="flex items-baseline justify-between gap-4 mb-1">
            <SectionLabel>what will be charged</SectionLabel>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {chargeDate} · 09:00 UTC
            </div>
          </div>
          <p className="text-sm text-muted mb-4">
            ${outstandingAmount.toFixed(2)} will be charged automatically on {chargeDate}. No action needed.
          </p>

          {lockedBackings.length > 0 && (
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-[10px] uppercase tracking-widest text-muted font-normal">Bounty</th>
                  <th className="pb-2 text-left text-[10px] uppercase tracking-widest text-muted font-normal">State</th>
                  <th className="pb-2 text-right text-[10px] uppercase tracking-widest text-muted font-normal">Your Backing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lockedBackings.map((backing) => (
                  <tr key={backing.id}>
                    <td className="py-3 pr-4">
                      <Link href={`/bounties/${backing.bounty_id}`} className="text-fan hover:underline line-clamp-2 leading-snug">
                        {backing.bounty?.title ?? `Bounty #${backing.bounty_id}`}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <BountyStatusBadge status={backing.bounty?.status ?? 'completed'} />
                    </td>
                    <td className="py-3 text-right tabular-nums">${Number(backing.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-4 pt-4 border-t border-dashed border-border flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              prefer to clear now?
            </span>
            <button
              type="button"
              onClick={handlePayNow}
              disabled={paying}
              className="font-mono text-[11px] text-fan hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
            >
              {paying ? 'processing…' : `settle $${outstandingAmount.toFixed(2)} now →`}
            </button>
          </div>
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
            'You always pay your exact committed amount — no fees are ever added on top.',
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
            { when: 'now', what: 'approved backings are locked in', done: true },
            { when: previewDate, what: 'billing preview sent to your inbox' },
            { when: `${chargeDate} · 09:00 UTC`, what: 'your card is charged' },
          ]}
        />
      </Card>
    </div>
  );
}
