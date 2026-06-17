'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { billing } from '@/lib/api';
import { COUNTRIES } from '@/lib/countries';

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

// ── Inner form — must be a child of <Elements> ────────────────────────────
interface InnerProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

function CardFormInner({ clientSecret, onSuccess, onCancel }: InnerProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Billing address — an independent location signal (alongside the card's
  // issuing country and the request-IP country) used for market eligibility,
  // tax determination, and the EU/GST location-evidence trail. Captured here
  // and threaded into the PaymentMethod's billing_details so the
  // setup_intent.succeeded webhook can persist it (PaymentMethodRecord
  // billing_country / billing_postal_code). Country is required; postal is
  // optional since not every country uses one.
  const [billingCountry, setBillingCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    if (!billingCountry) {
      setError('Please select the billing country for this card.');
      return;
    }

    setError('');
    setSubmitting(true);

    const { error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          address: {
            country: billingCountry,
            // Omit empty postal so Stripe stores null rather than "".
            ...(postalCode.trim() ? { postal_code: postalCode.trim() } : {}),
          },
        },
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Card setup failed. Please try again.');
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  const fieldClass =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-fan transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card input — styled box matching the dark surface */}
      <div className="bg-surface-2 border border-border rounded-lg px-3 py-3">
        <CardElement options={{ style: CARD_STYLE, hidePostalCode: true }} />
      </div>

      {/* Billing location */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="billing-country" className="block text-xs text-muted mb-1">
            Billing country
          </label>
          <select
            id="billing-country"
            value={billingCountry}
            onChange={(e) => setBillingCountry(e.target.value)}
            className={fieldClass}
            required
          >
            <option value="">— select —</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="billing-postal" className="block text-xs text-muted mb-1">
            ZIP / postal code
          </label>
          <input
            id="billing-postal"
            type="text"
            inputMode="text"
            autoComplete="postal-code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="optional"
            className={fieldClass}
          />
        </div>
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
          {submitting ? 'Saving…' : 'Save card'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ── Outer wrapper — fetches SetupIntent client_secret then mounts Elements ─
interface AddCardFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function AddCardForm({ onSuccess, onCancel }: AddCardFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    billing
      .setupIntent()
      .then((res) => setClientSecret(res.data.client_secret))
      .catch((err: { reason?: string; message?: string }) => {
        // Market gate: the API blocks adding a card outside open fan markets.
        if (err?.reason === 'market_unavailable') {
          setFetchError(
            err.message
              ?? "Adding a payment method isn't available in your country yet — we hope to support it soon.",
          );
          return;
        }
        setFetchError('Could not initialise payment setup. Please try again.');
      });
  }, []);

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
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardFormInner clientSecret={clientSecret} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
