'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise, stripeAppearance } from '@/lib/stripe';
import { billing } from '@/lib/api';

// ── Inner form — must be a child of <Elements> ────────────────────────────
interface InnerProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

function CardFormInner({ onSuccess, onCancel }: InnerProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setError('');
    setSubmitting(true);

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: {
        // Required by Stripe even with redirect: 'if_required'
        return_url: typeof window !== 'undefined' ? window.location.href : '',
      },
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message ?? 'Card setup failed. Please try again.');
      setSubmitting(false);
    } else {
      // SetupIntent confirmed without redirect — card is saved
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'accordion',
          fields: { billingDetails: { name: 'auto' } },
          paymentMethodOrder: ['card'],
        }}
      />

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-1 bg-brand text-black font-semibold py-2.5 text-sm rounded-lg hover:bg-brand-dim transition-colors disabled:opacity-50"
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
      .catch(() => setFetchError('Could not initialise payment setup. Please try again.'));
  }, []);

  if (fetchError) {
    return (
      <div className="text-red-400 text-sm py-2">{fetchError}</div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="py-6 flex justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: stripeAppearance }}
    >
      <CardFormInner onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
