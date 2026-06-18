'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { useMoney } from '@/lib/format';
import type { CreatorPayouts } from '@/lib/hooks/useCreatorPayouts';

/**
 * Region-based payout notice for the withdraw / bank-account surfaces. Renders
 * the appropriate message when the creator's country can't use Stripe self-serve
 * withdrawal, and `null` otherwise (categories 1 / unset).
 *
 * - `payout_category === 3` (sanctioned): payouts can't be processed at all.
 *   Copy mirrors the /c/money "Payouts unavailable in your region" banner.
 * - `payout_category === 2` (manual): no Stripe self-serve — payouts are arranged
 *   by hand (Wise / PayPal / wire) above a higher minimum withdrawal.
 *
 * `compact` trims the spacing for the narrow sidebar {@link WithdrawCard}; the
 * default suits the wider {@link BankAccountCard} body.
 */
export default function PayoutRegionNotice({
  p,
  compact = false,
}: {
  p: CreatorPayouts;
  compact?: boolean;
}) {
  const t = useTranslations('PayoutRegionNotice');
  const money = useMoney();
  const leading = compact ? '' : ' leading-relaxed';

  if (p.isPayoutBlocked) {
    return (
      <p className={`text-sm text-bad${leading}`}>
        <strong>{t('blocked.heading')}</strong>{' '}
        {t('blocked.body')}{' '}
        {t('blocked.errorPrompt')}{' '}
        <a href="mailto:support@artypot.com" className="ap-inline-link">{t('blocked.contactLink')}</a>.
      </p>
    );
  }

  if (p.isManualPayout) {
    const min = money(p.payoutMinimum);
    return (
      <p className={`text-sm text-muted${leading}`}>
        <strong className="text-foreground">{t('manual.heading')}</strong>{' '}
        {t('manual.body', { min })}{' '}
        <Link href="/support" className="ap-inline-link">{t('manual.contactLink')}</Link>
      </p>
    );
  }

  return null;
}
