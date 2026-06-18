'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { billing } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useMoney } from '@/lib/format';
import { ConfirmPaymentModal } from './ConfirmPaymentModal';

interface PendingAction {
  pending: boolean;
  fan_payment_id?: number;
  client_secret?: string;
  amount_cents?: number;
  expires_at?: string;
}

/**
 * Shown when the authenticated user has an outstanding 3DS / SCA challenge
 * (a FanPayment in `requires_action` state). Sits alongside PaymentGraceBanner
 * inside AppShell — same `bad` tone.
 *
 * When the user clicks the CTA (or lands on /billing#authenticate), opens
 * ConfirmPaymentModal which hands the client_secret to stripe.confirmCardPayment.
 */
export function PaymentAuthBanner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('Banners');
  const money = useMoney();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Re-fetch when route changes (user might have just been redirected from Stripe).
  useEffect(() => {
    if (!user) {
      setPending(null);
      return;
    }
    let cancelled = false;
    billing
      .pendingAction()
      .then((data) => {
        if (!cancelled) setPending(data);
      })
      .catch(() => {
        if (!cancelled) setPending(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  // Auto-open the modal when the user lands on /billing#authenticate (deep link
  // from the notification email / in-app notification). We only run this when
  // pending data is loaded AND the hash matches.
  useEffect(() => {
    if (!pending?.pending) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#authenticate') {
      setModalOpen(true);
    }
  }, [pending]);

  if (!user || !pending?.pending) return null;

  const dollars = pending.amount_cents != null
    ? money(pending.amount_cents / 100)
    : null;

  return (
    <>
      <div className="flex items-center gap-4 bg-bad-soft border border-bad text-foreground rounded-md px-5 py-4 mb-6">
        <span className="shrink-0 w-6 h-6 rounded-full border-2 border-bad text-bad flex items-center justify-center text-xs font-black leading-none">!</span>
        <p className="flex-1 text-sm">
          <span className="font-semibold">{t('paymentAuth.title')}</span>
          <span className="text-foreground/80">
            {dollars
              ? <> {t.rich('paymentAuth.bodyWithAmount', { amount: dollars, strong: (chunks) => <strong>{chunks}</strong> })}</>
              : <> {t('paymentAuth.body')}</>}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="shrink-0 text-sm font-semibold whitespace-nowrap hover:underline underline-offset-2 cursor-pointer"
        >
          {t('paymentAuth.cta')}
        </button>
      </div>

      {modalOpen && pending.client_secret && (
        <ConfirmPaymentModal
          clientSecret={pending.client_secret}
          amountCents={pending.amount_cents}
          onSuccess={() => {
            setModalOpen(false);
            setPending(null);
            // Re-poll so any new state (or grace period from a failed auth) is reflected.
            billing.pendingAction().then(setPending).catch(() => {});
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
