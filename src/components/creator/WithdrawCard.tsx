'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import PayoutRegionNotice from '@/components/creator/PayoutRegionNotice';
import { useMoney } from '@/lib/format';
import type { CreatorPayouts } from '@/lib/hooks/useCreatorPayouts';

/**
 * Available-balance + withdraw widget. Presentational — all state and handlers
 * come from the shared {@link useCreatorPayouts} hook. Appears on both the
 * creator dashboard and the dedicated Payouts page.
 */
export default function WithdrawCard({ p }: { p: CreatorPayouts }) {
  const t = useTranslations('WithdrawCard');
  const fmt = useMoney();
  const { balance, balanceLoading, bankConnected, canWithdraw, payoutHold, isPayoutBlocked, isManualPayout } = p;
  const availableBalance = balance?.available_balance ?? 0;

  return (
    <div id="available">
      <Card className="border-[var(--color-role)]/30">
        <SectionLabel className="mb-1">{t('sectionLabel')}</SectionLabel>
        <div className="font-mono text-[32px] font-medium tabular-nums text-creator mb-3">
          {balanceLoading ? <span className="text-muted/40">—</span> : fmt(availableBalance)}
        </div>

        {isPayoutBlocked || isManualPayout ? (
          <PayoutRegionNotice p={p} compact />
        ) : payoutHold ? (
          <p className="text-sm text-bad">
            {t('payoutHold')}{' '}
            <Link href="/c/payouts#payout-hold" className="underline underline-offset-2 hover:opacity-80">{t('resolveNow')}</Link>
          </p>
        ) : !canWithdraw ? (
          <p className="text-sm text-muted">
            {bankConnected ? t('completeBankSetup') : t('connectBank')}{' '}
            <Link href="/c/payouts" className="ap-inline-link">{t('payoutsLink')}</Link>
          </p>
        ) : availableBalance <= 0 ? (
          <p className="text-sm text-muted">{t('nothingToWithdraw')}</p>
        ) : p.withdrawConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              {t.rich('confirmPrompt', {
                amount: fmt(parseFloat(p.withdrawAmount || '0')),
                strong: (chunks) => <strong className="text-creator">{chunks}</strong>,
              })}
            </p>
            <div className="flex gap-2">
              <Button variant="primary" disabled={p.withdrawLoading} onClick={p.handleWithdraw}>
                {p.withdrawLoading ? t('sending') : t('confirmSend')}
              </Button>
              <Button variant="ghost" disabled={p.withdrawLoading} onClick={() => p.setWithdrawConfirm(false)}>
                {t('cancel')}
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
              {t('withdraw')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
