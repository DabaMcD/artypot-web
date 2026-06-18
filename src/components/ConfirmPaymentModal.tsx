'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Elements, useStripe } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useMoney } from '@/lib/format';

interface ConfirmPaymentModalProps {
  /** Stripe PaymentIntent client_secret from /v1/billing/pending-action or pay-now. */
  clientSecret: string;
  /** Amount in cents — shown to the user so they know what they're authorizing. */
  amountCents?: number;
  /** Called after a successful confirmation (parent should refresh state + dismiss). */
  onSuccess: () => void;
  /** Called when the user closes the modal without completing. */
  onClose: () => void;
}

/**
 * Renders Stripe's 3DS / SCA challenge for an in-flight PaymentIntent.
 *
 * Auto-fires `stripe.confirmCardPayment()` on mount — that call opens Stripe's
 * own iframe / popup for the bank's authentication flow. We don't render a
 * card form here; the card is already on file. We just hand Stripe the
 * client_secret and let it drive the challenge.
 */
export function ConfirmPaymentModal(props: ConfirmPaymentModalProps) {
  return (
    <Elements stripe={stripePromise}>
      <ConfirmInner {...props} />
    </Elements>
  );
}

function ConfirmInner({ clientSecret, amountCents, onSuccess, onClose }: ConfirmPaymentModalProps) {
  const t = useTranslations('ConfirmPaymentModal');
  const money = useMoney();
  const stripe = useStripe();
  const [status, setStatus] = useState<'idle' | 'authenticating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const dollarAmount = amountCents != null ? money(amountCents / 100) : null;

  // Fire `confirmCardPayment` once Stripe.js is ready. Stripe handles the
  // entire 3DS UI (modal / redirect to bank); we just await the result.
  useEffect(() => {
    if (!stripe || status !== 'idle') return;

    setStatus('authenticating');
    stripe.confirmCardPayment(clientSecret).then(({ error, paymentIntent }) => {
      if (error) {
        setErrorMessage(error.message ?? t('errors.authFailed'));
        setStatus('error');
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        setStatus('success');
        // Give Stripe a beat to fire the webhook, then trigger the parent
        // refresh. The webhook is the canonical settlement trigger, but
        // the UI shouldn't sit waiting on backend round-trips visible to
        // the user.
        setTimeout(onSuccess, 600);
      } else if (paymentIntent?.status === 'requires_action') {
        // User dismissed the bank's challenge — keep modal open so they can retry.
        setErrorMessage(t('errors.notCompleted'));
        setStatus('error');
      } else {
        setErrorMessage(t('errors.unexpectedStatus', { status: paymentIntent?.status ?? '' }));
        setStatus('error');
      }
    });
  }, [stripe, clientSecret, status, onSuccess, t]);

  const retry = () => {
    setErrorMessage('');
    setStatus('idle');
  };

  return (
    <Modal title={t('title')} onClose={onClose}>
      {status === 'authenticating' && (
        <div className="py-6 text-center">
          <div className="w-8 h-8 border-2 border-fan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">
            {dollarAmount
              ? t.rich('authenticating.waitingWithAmount', {
                  amount: dollarAmount,
                  strong: (chunks) => (
                    <strong className="text-foreground">{chunks}</strong>
                  ),
                })
              : t('authenticating.waiting')}
          </p>
          <p className="text-xs text-muted/60 mt-2">
            {t('authenticating.popupHint')}
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="py-6 text-center">
          <div className="text-creator text-3xl mb-3">✓</div>
          <p className="text-foreground font-semibold mb-1">{t('success.heading')}</p>
          <p className="text-sm text-muted">{t('success.body')}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="py-2">
          <p className="text-sm text-bad mb-4">{errorMessage}</p>
          <div className="flex flex-col gap-2">
            <Button onClick={retry}>{t('error.tryAgain')}</Button>
            <Link
              href="/billing"
              className="text-center text-sm text-muted hover:text-foreground py-2 transition-colors"
              onClick={onClose}
            >
              {t('error.useDifferentCard')}
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
