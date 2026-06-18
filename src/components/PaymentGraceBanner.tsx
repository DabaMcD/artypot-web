'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { useDateFormats } from '@/lib/format';
import { BILLING_GRACE_PERIOD_DAYS } from '@/lib/config';

/**
 * Shown when the authenticated user's last billing charge failed and they are
 * still inside the grace window. Critical state — no dismiss button.
 *
 * Pattern: matches StaleCardBar / NudgeBar 'bad' tone.
 */
export function PaymentGraceBanner() {
  const { user } = useAuth();
  const t = useTranslations('Banners');
  const { short: formatDate } = useDateFormats();
  if (!user || !user.payment_failed_at) return null;

  // Prefer backend-provided expiry; otherwise compute from payment_failed_at + grace days.
  let graceExpires: Date | null = null;
  if (user.payment_grace_expires_at) {
    graceExpires = new Date(user.payment_grace_expires_at);
  } else if (user.payment_failed_at) {
    const failed = new Date(user.payment_failed_at);
    graceExpires = new Date(failed.getTime() + BILLING_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  }

  if (!graceExpires || isNaN(graceExpires.getTime())) return null;
  if (Date.now() >= graceExpires.getTime()) return null; // grace expired — backend handles enforcement

  const dateLabel = formatDate(graceExpires.toISOString());

  return (
    <div className="flex items-center gap-4 bg-bad-soft border border-bad text-foreground rounded-md px-5 py-4 mb-6">
      <span className="shrink-0 w-6 h-6 rounded-full border-2 border-bad text-bad flex items-center justify-center text-xs font-black leading-none">!</span>
      <p className="flex-1 text-sm">
        <span className="font-semibold">{t('paymentGrace.title')}</span>
        <span className="text-foreground/80"> {t('paymentGrace.body', { date: dateLabel })}</span>
      </p>
      <div className="shrink-0">
        <Link
          href="/billing"
          className="text-sm font-semibold whitespace-nowrap hover:underline underline-offset-2"
        >
          {t('paymentGrace.cta')}
        </Link>
      </div>
    </div>
  );
}
