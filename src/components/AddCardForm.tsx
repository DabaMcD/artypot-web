'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Elements, CardElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { billing } from '@/lib/api';

// CardElement style tokens — Stripe renders in an iframe so CSS vars don't reach here;
// keep these in sync with globals.css manually.
const CARD_STYLE = {
  base: {
    color: '#F2EFE6',       // --color-foreground
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '14px',
    fontSmoothing: 'antialiased',
    '::placeholder': { color: '#BFB0A9' }, // --color-muted
    iconColor: '#BFB0A9',
  },
  invalid: {
    color: '#f87171',
    iconColor: '#f87171',
  },
};

// Elements appearance for Stripe-rendered fields (the Address Element). CardElement
// is styled separately via CARD_STYLE above; this mirrors the same dark-surface
// tokens from globals.css — keep in sync if those change.
const ELEMENTS_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#ffd966',        // --color-fan
    colorBackground: '#201E1B',     // --color-surface-2
    colorText: '#F2EFE6',           // --color-foreground
    colorTextPlaceholder: '#BFB0A9',// --color-muted
    colorDanger: '#f87171',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSizeBase: '14px',
    borderRadius: '8px',
  },
  rules: {
    '.Input': { backgroundColor: '#201E1B', border: '1px solid #332F2B' },
    '.Input:focus': { border: '1px solid #ffd966', boxShadow: 'none' },
    '.Label': { color: '#BFB0A9', fontSize: '12px' },
  },
};

// Stripe localises its Elements to one of its supported locales. Spanish maps
// through; everything else (incl. eo / en-x-brainrot, which Stripe can't render)
// falls back to English.
function stripeLocaleFor(locale: string): 'es' | 'en' {
  return locale === 'es' ? 'es' : 'en';
}

// ── Inner form — must be a child of <Elements> ────────────────────────────
interface InnerProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

function CardFormInner({ clientSecret, onSuccess, onCancel }: InnerProps) {
  const t = useTranslations('AddCardForm');
  const stripe = useStripe();
  const elements = useElements();

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    const addressElement = elements.getElement(AddressElement);
    if (!cardElement || !addressElement) return;

    // Country-aware billing address from Stripe's Address Element: it only asks
    // for postal/state where the chosen country actually uses them, so what we
    // attach is valid per-country (no more free-form ZIP on a Belgian card).
    // The resulting billing_details flow onto the PaymentMethod and are persisted
    // as location evidence by the setup_intent.succeeded webhook
    // (PaymentMethodRecord billing_country / billing_postal_code / billing_state).
    const { complete, value } = await addressElement.getValue();
    if (!complete) {
      setError(t('errors.addressIncomplete'));
      return;
    }

    setError('');
    setSubmitting(true);

    const { error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: value.name,
          address: value.address,
        },
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? t('errors.cardSetupFailed'));
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card input — styled box matching the dark surface. Postal stays hidden
          here; the Address Element below collects it country-aware. */}
      <div className="bg-surface-2 border border-border rounded-lg px-3 py-3">
        <CardElement options={{ style: CARD_STYLE, hidePostalCode: true }} />
      </div>

      {/* Billing address — Stripe Address Element renders country-aware fields
          (postal/state appear only where the country uses them). */}
      <div>
        <label className="block text-xs text-muted mb-1.5">{t('fields.billingAddress')}</label>
        <AddressElement options={{ mode: 'billing', fields: { phone: 'never' } }} />
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-1 bg-fan text-black font-semibold py-2.5 text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? t('actions.saving') : t('actions.saveCard')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            {t('actions.cancel')}
          </button>
        )}
      </div>

      {/* Recurring-billing authorization — shown at the point of consent (saving
          the card), not just in the TOS. */}
      <p className="text-xs text-muted leading-relaxed">{t('authorization')}</p>
    </form>
  );
}

// ── Outer wrapper — fetches SetupIntent client_secret then mounts Elements ─
interface AddCardFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function AddCardForm({ onSuccess, onCancel }: AddCardFormProps) {
  const t = useTranslations('AddCardForm');
  const locale = useLocale();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    billing
      .setupIntent()
      .then((res) => setClientSecret(res.data.client_secret))
      .catch((err: { reason?: string; message?: string }) => {
        // Market gate: the API blocks adding a card outside open fan markets.
        if (err?.reason === 'market_unavailable') {
          setFetchError(err.message ?? t('errors.marketUnavailable'));
          return;
        }
        setFetchError(t('errors.setupInitFailed'));
      });
  }, [t]);

  if (fetchError) {
    return <div className="text-red-400 text-sm py-2">{fetchError}</div>;
  }

  if (!clientSecret) {
    return (
      <div className="py-6 flex justify-center">
        <div className="w-5 h-5 border-2 border-fan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, locale: stripeLocaleFor(locale), appearance: ELEMENTS_APPEARANCE }}
    >
      <CardFormInner clientSecret={clientSecret} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
