export const BILLING_DAY = Number(process.env.NEXT_PUBLIC_BILLING_DAY ?? 24);
export const PAYOUT_MINIMUM_AUTOMATED = Number(process.env.NEXT_PUBLIC_PAYOUT_MINIMUM_AUTOMATED ?? 1);
export const PAYOUT_MINIMUM_MANUAL = Number(process.env.NEXT_PUBLIC_PAYOUT_MINIMUM_MANUAL ?? 50);
export const BILLING_GRACE_PERIOD_DAYS = Number(process.env.NEXT_PUBLIC_BILLING_GRACE_PERIOD_DAYS ?? 7);
export const PLATFORM_FEE_PCT = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PCT ?? 20);

/**
 * When true, the login/register pages expose a phone-number signup option
 * alongside email. While we iron out the phone-only signup UX (beta), keep
 * this off so users only see the email path.
 *
 * Default OFF — set NEXT_PUBLIC_PHONE_SIGNUP_ENABLED=true to opt in.
 */
export const PHONE_SIGNUP_ENABLED = process.env.NEXT_PUBLIC_PHONE_SIGNUP_ENABLED === 'true';

/**
 * When true, all day-based intervals are compressed to minutes for local testing.
 * Set via env NEXT_PUBLIC_WARP_SPEED=true. NEVER enable in production.
 */
export const WARP_SPEED = process.env.NEXT_PUBLIC_WARP_SPEED === 'true';

/**
 * Returns the next billing occurrence as a Date and a human-readable label.
 *
 * Normal mode: next Nth-of-month → "Oct 15"
 * Warp mode:   next :Nth-past-the-hour → "3:15 PM"
 *
 * Use this everywhere instead of inline next-billing date math so the
 * display automatically switches when WARP_SPEED is enabled.
 */
export function nextBillingInfo(): { date: Date; label: string } {
  const now = new Date();

  if (WARP_SPEED) {
    // In warp mode billing fires at :BILLING_DAY past every hour
    const d = new Date(now);
    d.setSeconds(0, 0);
    if (now.getMinutes() < BILLING_DAY) {
      d.setMinutes(BILLING_DAY);
    } else {
      d.setHours(now.getHours() + 1, BILLING_DAY, 0, 0);
    }
    return {
      date: d,
      label: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  }

  const d =
    now.getDate() < BILLING_DAY
      ? new Date(now.getFullYear(), now.getMonth(), BILLING_DAY)
      : new Date(now.getFullYear(), now.getMonth() + 1, BILLING_DAY);
  return {
    date: d,
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}
