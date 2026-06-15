'use client';

import Link from 'next/link';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import PayoutRegionNotice from '@/components/creator/PayoutRegionNotice';
import type { CreatorPayouts } from '@/lib/hooks/useCreatorPayouts';

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

/**
 * Available-balance + withdraw widget. Presentational — all state and handlers
 * come from the shared {@link useCreatorPayouts} hook. Appears on both the
 * creator dashboard and the dedicated Payouts page.
 */
export default function WithdrawCard({ p }: { p: CreatorPayouts }) {
  const { balance, balanceLoading, bankConnected, canWithdraw, payoutHold, isPayoutBlocked, isManualPayout } = p;
  const availableBalance = balance?.available_balance ?? 0;

  return (
    <div id="available">
      <Card className="border-[var(--color-role)]/30">
        <SectionLabel className="mb-1">available</SectionLabel>
        <div className="font-mono text-[32px] font-medium tabular-nums text-creator mb-3">
          {balanceLoading ? <span className="text-muted/40">—</span> : fmt(availableBalance)}
        </div>

        {isPayoutBlocked || isManualPayout ? (
          <PayoutRegionNotice p={p} compact />
        ) : payoutHold ? (
          <p className="text-sm text-bad">
            Payouts are on hold — complete Stripe verification to withdraw.{' '}
            <Link href="/c/payouts#payout-hold" className="underline underline-offset-2 hover:opacity-80">Resolve now →</Link>
          </p>
        ) : !canWithdraw ? (
          <p className="text-sm text-muted">
            {bankConnected ? 'Complete bank setup to withdraw.' : 'Connect a bank account to withdraw.'}{' '}
            <Link href="/c/payouts" className="ap-inline-link">Payouts →</Link>
          </p>
        ) : availableBalance <= 0 ? (
          <p className="text-sm text-muted">Nothing to withdraw yet.</p>
        ) : p.withdrawConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Send <strong className="text-creator">${parseFloat(p.withdrawAmount || '0').toFixed(2)}</strong> to your linked bank?
            </p>
            <div className="flex gap-2">
              <Button variant="primary" disabled={p.withdrawLoading} onClick={p.handleWithdraw}>
                {p.withdrawLoading ? 'Sending…' : 'Yes, Send It'}
              </Button>
              <Button variant="ghost" disabled={p.withdrawLoading} onClick={() => p.setWithdrawConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted text-sm">$</span>
              <Input
                type="number"
                min="1"
                step="0.01"
                max={availableBalance}
                value={p.withdrawAmount}
                onChange={(e) => p.setWithdrawAmount(e.target.value)}
                placeholder={availableBalance.toFixed(2)}
                className="pl-7"
              />
            </div>
            <Button
              variant="primary"
              disabled={p.withdrawLoading}
              onClick={() => {
                if (!p.withdrawAmount) p.setWithdrawAmount(availableBalance.toFixed(2));
                p.setWithdrawConfirm(true);
              }}
            >
              Withdraw
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
