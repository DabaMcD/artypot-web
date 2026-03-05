import { loadStripe } from '@stripe/stripe-js';

// Initialised once outside any component so the Stripe object is a singleton.
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
);

/** Appearance tokens wired to the artypot dark theme. */
export const stripeAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#F5A623',
    colorBackground: '#1e1e1e',
    colorText: '#ededed',
    colorTextSecondary: '#888888',
    colorDanger: '#f87171',
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
    borderRadius: '8px',
    focusBoxShadow: 'none',
    focusOutline: '1px solid #F5A623',
  },
};
