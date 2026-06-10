'use client';

import { useAuth } from '@/lib/auth-context';

/**
 * Phase 1 US-only gate for fans. Shown when the authenticated user's country
 * isn't a supported fan market yet: their existing backings render soft and
 * their activity is paused. Persistent state — no dismiss button.
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
        <span className="font-semibold">Your country isn&apos;t supported yet — your activity is paused.</span>
        <span className="text-foreground/80">
          {' '}Artypot is currently US-only. Your existing backings won&apos;t be charged and won&apos;t count
          toward creators&apos; totals until we launch in your country. We hope to support you soon.
        </span>
      </p>
    </div>
  );
}
