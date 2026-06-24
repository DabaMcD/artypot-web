export const BILLING_DAY = Number(process.env.NEXT_PUBLIC_BILLING_DAY ?? 15);
export const PAYOUT_MINIMUM_AUTOMATED = Number(process.env.NEXT_PUBLIC_PAYOUT_MINIMUM_AUTOMATED ?? 1);
export const PAYOUT_MINIMUM_MANUAL = Number(process.env.NEXT_PUBLIC_PAYOUT_MINIMUM_MANUAL ?? 50);
// Must match the backend default (config/artypot.php → billing_grace_period_days,
// env BILLING_GRACE_PERIOD_DAYS). The PaymentGraceBanner computes the grace-expiry
// date client-side from this value, so a mismatch would show the wrong deadline.
export const BILLING_GRACE_PERIOD_DAYS = Number(process.env.NEXT_PUBLIC_BILLING_GRACE_PERIOD_DAYS ?? 14);
// Days a collected payment is held before becoming withdrawable by the creator
// (the "clearing"/hold window — for fraud review and dispute resolution). This
// is NOT the fan-side BILLING_GRACE_PERIOD_DAYS. Must match the backend
// (config/artypot.php → payout_wait_days, env PLATFORM_PAYOUT_WAIT_DAYS).
export const PLATFORM_PAYOUT_WAIT_DAYS = Number(process.env.NEXT_PUBLIC_PLATFORM_PAYOUT_WAIT_DAYS ?? 7);
export const PLATFORM_FEE_PCT = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PCT ?? 20);

/**
 * Frontend fallback for the default backing amount when the user's
 * `default_backing_amount` is null (existing rows before the column was
 * introduced). New users get 5.00 from the DB column default; existing
 * users read this constant until they set their own default.
 */
export const DEFAULT_BACKING_AMOUNT_FALLBACK = Number(process.env.NEXT_PUBLIC_DEFAULT_BACKING_AMOUNT ?? 5);

/**
 * When true, the login/register pages expose a phone-number signup option
 * alongside email. While we iron out the phone-only signup UX (beta), keep
 * this off so users only see the email path.
 *
 * Default OFF — set NEXT_PUBLIC_PHONE_SIGNUP_ENABLED=true to opt in.
 *
 * DEPENDENCY: this is only the UI gate. Phone-only signup also requires the
 * backend SMS kill-switch to be ON (artypot-api: config/artypot.php `sms_enabled`
 * / env `SMS_ENABLED`, plus `SmsService::send`). If this flag is true while
 * SMS is disabled server-side, RegisterController rejects phone signups with a
 * 422. Only enable this once the backend SMS capability is live.
 */
export const PHONE_SIGNUP_ENABLED = process.env.NEXT_PUBLIC_PHONE_SIGNUP_ENABLED === 'true';

/**
 * When true, all day-based intervals are compressed to minutes for local testing.
 * Set via env NEXT_PUBLIC_WARP_SPEED=true. NEVER enable in production.
 */
export const WARP_SPEED = process.env.NEXT_PUBLIC_WARP_SPEED === 'true';

/**
 * Returns the next billing occurrence as a Date.
 *
 * Normal mode: next Nth-of-month
 * Warp mode:   next :Nth-past-the-hour
 *
 * Use this everywhere instead of inline next-billing date math so the
 * date automatically switches when WARP_SPEED is enabled. Format the returned
 * `date` at the call site with a locale-aware formatter (e.g.
 * `useDateFormats().short(date.toISOString())`).
 */
export function nextBillingInfo(): { date: Date } {
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
    return { date: d };
  }

  const d =
    now.getDate() < BILLING_DAY
      ? new Date(now.getFullYear(), now.getMonth(), BILLING_DAY)
      : new Date(now.getFullYear(), now.getMonth() + 1, BILLING_DAY);
  return { date: d };
}
