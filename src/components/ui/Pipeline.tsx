'use client';

import { BILLING_DAY } from '@/lib/config';
import { useTranslations } from 'next-intl';
import { useMoney } from '@/lib/format';

interface Balances {
  pending: number;
  /** Subset of pending from fans with an active payment method. When provided,
   *  the cell shows the solid amount as the headline and a "+ $X soft" line for
   *  the remainder, matching the "open backing" card pattern. */
  solidPending?: number;
  clearing: number;
  available: number;
}

interface BalancePipelineProps {
  balances: Balances;
}

export function BalancePipeline({ balances }: BalancePipelineProps) {
  const t = useTranslations('Pipeline');
  const money = useMoney();

  const softPending =
    balances.solidPending !== undefined
      ? Math.max(0, balances.pending - balances.solidPending)
      : undefined;

  return (
    <div className="grid grid-cols-3 border border-border rounded-md overflow-hidden bg-surface">
      {/* Pending */}
      <div className="ap-pipe-pending p-4 sm:p-5 border-r border-border hover:bg-surface-2 transition-colors">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted mb-2">
          <span className="w-2 h-2 rounded-full bg-warn flex-shrink-0" />
          {t('pending')}
        </div>
        <div className="font-mono font-medium text-xl text-foreground tabular-nums">
          {money(balances.solidPending ?? balances.pending)}
        </div>
        <div className="text-sm text-muted mt-1">{t('pendingNote', { day: BILLING_DAY })}</div>
        {softPending !== undefined && softPending > 0.005 && (
          <div className="font-mono text-[10px] text-muted mt-1">
            {t('softLine', { amount: money(softPending) })}
          </div>
        )}
      </div>

      {/* Clearing */}
      <div className="ap-pipe-clearing p-4 sm:p-5 border-r border-border hover:bg-surface-2 transition-colors">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted mb-2">
          <span className="w-2 h-2 rounded-full bg-info flex-shrink-0" />
          {t('clearing')}
        </div>
        <div className="font-mono font-medium text-xl text-foreground tabular-nums">
          {money(balances.clearing)}
        </div>
        <div className="text-sm text-muted mt-1">{t('clearingNote')}</div>
      </div>

      {/* Available */}
      <div className="ap-pipe-available p-4 sm:p-5 hover:bg-surface-2 transition-colors">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted mb-2">
          <span className="w-2 h-2 rounded-full bg-good flex-shrink-0" />
          {t('available')}
        </div>
        <div className="font-mono font-medium text-xl text-foreground tabular-nums">
          {money(balances.available)}
        </div>
        <div className="text-sm text-muted mt-1">{t('availableNote')}</div>
      </div>
    </div>
  );
}
