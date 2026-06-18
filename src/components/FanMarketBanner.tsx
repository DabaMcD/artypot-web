'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { countryName } from '@/lib/countries';

/**
 * Market gate for fans. Shown only when the authenticated fan's location verdict
 * is frozen (fan_market_open === false) — payment processing isn't available in
 * their region yet. Such a fan can still PLACE backings, which render "soft":
 * they're demand signals for creators, never charged, until we launch in their
 * region — at which point they're emailed (market_available). Persistent — no
 * dismiss. Tone matches PaymentGraceBanner / NudgeBar 'warn'.
 */
export function FanMarketBanner() {
  const { user } = useAuth();
  const t = useTranslations('Banners');
  if (!user || user.fan_market_open !== false) return null;

  const region = user.fan_market_country ? countryName(user.fan_market_country) : t('fanMarket.regionFallback');

  return (
    <div className="flex items-center gap-4 bg-warn-soft border border-warn text-foreground rounded-md px-5 py-4 mb-6">
      <span className="shrink-0 w-6 h-6 rounded-full border-2 border-warn text-warn flex items-center justify-center text-xs font-black leading-none">!</span>
      <p className="flex-1 text-sm">
        <span className="font-semibold">{t('fanMarket.title', { region })}</span>
        <span className="text-foreground/80">
          {' '}{t('fanMarket.body')}
        </span>
      </p>
    </div>
  );
}
