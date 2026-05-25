import { loadStripe } from '@stripe/stripe-js';

// Initialised once outside any component so the Stripe object is a singleton.
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
);
