'use client';

import { Link } from '@/i18n/routing';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { CreatorPayouts } from '@/lib/hooks/useCreatorPayouts';

/**
 * Read-only available-balance card for the creator dashboard (/c).
 *
 * Withdrawal is executed only on /c/payouts — the single withdraw home — so this
 * summary never holds the live withdraw input. It shows the available balance and
 * routes to /c/payouts, where the bank setup, region notice, and hold-resolution
 * machinery (the full WithdrawCard) lives.
 */
export default function AvailableBalanceSummary({ p }: { p: CreatorPayouts }) {
  const { balance, balanceLoading, canWithdraw, isPayoutBlocked, isManualPayout } = p;
  const availableBalance = balance?.available_balance ?? 0;
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // Offer a direct "Withdraw →" only when the creator can self-serve a payout
  // right now; otherwise send them to /c/payouts to finish bank setup or read
  // the region/hold notice that applies to them.
  const canSelfWithdraw = canWithdraw && !isPayoutBlocked && !isManualPayout && availableBalance > 0;

  return (
    <Card>
      <SectionLabel className="mb-1">available</SectionLabel>
      <div className="font-mono text-[32px] font-medium tabular-nums text-foreground">
        {balanceLoading ? '—' : fmt(availableBalance)}
      </div>
      <Link href={canSelfWithdraw ? '/c/payouts#available' : '/c/payouts'} className="block mt-3">
        <Button variant={canSelfWithdraw ? 'primary' : 'default'} className="w-full justify-center">
          {canSelfWithdraw ? 'Withdraw →' : 'Manage payouts →'}
        </Button>
      </Link>
    </Card>
  );
}
