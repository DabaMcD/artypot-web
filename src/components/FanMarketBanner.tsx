'use client';

import { useAuth } from '@/lib/auth-context';

/**
 * Phase 1 US-only gate for fans. Shown only when the authenticated user has
 * DECLARED a country outside a supported fan market (fan_market_open === false).
 * Such a fan can still PLACE backings, but those render "soft" — they can't add a
 * card or be charged until we launch in their country. Persistent — no dismiss.
 *
 * Pattern: matches PaymentGraceBanner / NudgeBar 'warn' tone.
 */
export function FanMarketBanner() {
  const { user } = useAuth();
  if (!user || user.fan_market_open !== false) return null;

  return (
    <div className="flex items-center gap-4 bg-warn-soft border border-warn text-foreground rounded-md px-5 py-4 mb-6">
      <span className="shrink-0 w-6 h-6 rounded-full border-2 border-warn text-warn flex items-center justify-center text-xs font-black leading-none">!</span>
      <p className="flex-1 text-sm">
        <span className="font-semibold">We can&apos;t charge cards in your country yet.</span>
        <span className="text-foreground/80">
          {' '}Artypot is currently US-only. You can still back bounties, but those backings stay
          pending — they won&apos;t be charged or count toward creators&apos; totals until we launch
          in your country. We hope to support you soon.
        </span>
      </p>
    </div>
  );
}
