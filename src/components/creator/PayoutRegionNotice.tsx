'use client';

import { Link } from '@/i18n/routing';
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
  const leading = compact ? '' : ' leading-relaxed';

  if (p.isPayoutBlocked) {
    return (
      <p className={`text-sm text-bad${leading}`}>
        <strong>Payouts unavailable in your region.</strong>{' '}
        Due to international payment restrictions, we&apos;re unable to process payouts to
        creators in your country at this time. Your bounty activity is otherwise unaffected.
        If you believe this is an error,{' '}
        <a href="mailto:support@artypot.com" className="ap-inline-link">contact support</a>.
      </p>
    );
  }

  if (p.isManualPayout) {
    const min = `$${p.payoutMinimum.toLocaleString('en-US')}`;
    return (
      <p className={`text-sm text-muted${leading}`}>
        <strong className="text-foreground">Manual payouts in your region.</strong>{' '}
        Automatic bank payouts aren&apos;t available where you are — we send payouts manually
        via Wise, PayPal, or wire, with a {min} minimum withdrawal.{' '}
        <Link href="/support" className="ap-inline-link">Contact us to arrange a transfer →</Link>
      </p>
    );
  }

  return null;
}
