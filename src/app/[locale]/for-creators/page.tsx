import { useTranslations, useFormatter } from 'next-intl';
import { Link } from '@/i18n/routing';
import FeaturedBountiesSection from '@/components/FeaturedBountiesSection';
import { SmoothHashLink } from '@/components/SmoothHashLink';
import { PLATFORM_FEE_PCT, BILLING_DAY, PLATFORM_PAYOUT_WAIT_DAYS } from '@/lib/config';

export const metadata = {
  title: 'For Creators',
  description: 'Tell your fans exactly what you want to make. Let them fund it. Get paid when you deliver.',
};

const creatorReceivesPct = 100 - PLATFORM_FEE_PCT;

export default function ForCreatorsPage() {
  const t = useTranslations('ForCreators');
  const format = useFormatter();

  // ── Steps to money in the bank ───────────────────────────────────────────
  const PAYOUT_STEPS: { label: string; sub: string; color: string }[] = [
    {
      label: t('steps.signUp.label'),
      sub: t('steps.signUp.sub'),
      color: 'bg-creator',
    },
    {
      label: t('steps.openBounty.label'),
      sub: t('steps.openBounty.sub'),
      color: 'bg-creator',
    },
    {
      label: t('steps.share.label'),
      sub: t('steps.share.sub'),
      color: 'bg-creator',
    },
    {
      label: t('steps.backingsComeIn.label'),
      sub: t('steps.backingsComeIn.sub'),
      color: 'bg-creator',
    },
    {
      label: t('steps.makeThing.label'),
      sub: t('steps.makeThing.sub'),
      color: 'bg-creator',
    },
    {
      label: t('steps.councilReviews.label'),
      sub: t('steps.councilReviews.sub'),
      color: 'bg-council',
    },
    {
      label: t('steps.fansCharged.label'),
      sub: t('steps.fansCharged.sub', { billingDay: BILLING_DAY }),
      color: 'bg-fan',
    },
    {
      label: t('steps.clearingWindow.label', { waitDays: PLATFORM_PAYOUT_WAIT_DAYS }),
      sub: t('steps.clearingWindow.sub'),
      color: 'bg-fan',
    },
    {
      label: t('steps.withdraw.label'),
      sub: t('steps.withdraw.sub', { creatorPct: creatorReceivesPct }),
      color: 'bg-creator',
    },
  ];

  const fanReasons: [string, string][] = [
    [t('appeal.fans.points.card.title'), t('appeal.fans.points.card.detail')],
    [t('appeal.fans.points.oneThing.title'), t('appeal.fans.points.oneThing.detail')],
    [t('appeal.fans.points.backOut.title'), t('appeal.fans.points.backOut.detail')],
  ];

  const creatorReasons: [string, string][] = [
    [t('appeal.creators.points.worthMaking.title'), t('appeal.creators.points.worthMaking.detail')],
    [t('appeal.creators.points.stayPublic.title'), t('appeal.creators.points.stayPublic.detail')],
    [
      t('appeal.creators.points.payoutSchedule.title'),
      t('appeal.creators.points.payoutSchedule.detail', {
        billingDay: BILLING_DAY,
        waitDays: PLATFORM_PAYOUT_WAIT_DAYS,
      }),
    ],
  ];

  return (
    <div className="min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-6xl font-display font-bold tracking-tight text-foreground leading-tight mb-6">
            {t('hero.titleLine1')}
            <br />
            {t('hero.titleLine2')}
            <br /><span className="text-creator">{t('hero.titleLine3')}</span>
          </h1>

          <p className="text-xl text-muted max-w-xl leading-relaxed mb-10">
            {t('hero.body')}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="bg-creator text-brand-dark font-semibold px-6 py-3 rounded-lg hover:brightness-110 transition-all"
            >
              {t('hero.getStarted')}
            </Link>
            <SmoothHashLink
              href="#how-you-get-paid"
              className="bg-surface border border-border text-foreground font-semibold px-6 py-3 rounded-lg hover:border-creator/50 hover:text-creator transition-colors"
            >
              {t('hero.howYouGetPaid')}
            </SmoothHashLink>
          </div>
        </div>
      </section>

      {/* ── Why it's different ────────────────────────────────────────────── */}
      <section className="bg-surface border-t border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-snug mb-4">
              {t('different.titleLine1')}
              <br /><span className="text-creator">{t('different.titleLine2')}</span>
            </h2>
            <p className="text-lg text-muted">
              {t('different.body')}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <div className="bg-background border border-border rounded-xl p-6">
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Patreon</p>
              <p className="text-muted text-sm leading-relaxed">
                {t('different.patreon')}
              </p>
            </div>

            <div className="bg-background border border-border rounded-xl p-6">
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Ko-fi / tips</p>
              <p className="text-muted text-sm leading-relaxed">
                {t('different.kofi')}
              </p>
            </div>

            <div className="bg-surface border border-creator/30 rounded-xl p-6">
              <p className="text-xs font-mono text-creator uppercase tracking-wider mb-3">Artypot</p>
              <p className="text-foreground text-sm leading-relaxed">
                {t('different.artypot')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The appeal ────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid sm:grid-cols-2 gap-16 items-start max-w-5xl">

            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-4">{t('appeal.fans.label')}</p>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                {t('appeal.fans.titleLine1')}
                <br />{t('appeal.fans.titleLine2')}
              </h2>
              <ul className="space-y-4">
                {fanReasons.map(([title, detail]) => (
                  <li key={title} className="flex gap-3">
                    <span className="text-creator mt-1 shrink-0">✓</span>
                    <div>
                      <p className="text-foreground text-sm font-medium mb-0.5">{title}</p>
                      <p className="text-muted text-sm leading-relaxed">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-4">{t('appeal.creators.label')}</p>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                {t('appeal.creators.titleLine1')}
                <br />{t('appeal.creators.titleLine2')}
              </h2>
              <ul className="space-y-4">
                {creatorReasons.map(([title, detail]) => (
                  <li key={title} className="flex gap-3">
                    <span className="text-creator mt-1 shrink-0">✓</span>
                    <div>
                      <p className="text-foreground text-sm font-medium mb-0.5">{title}</p>
                      <p className="text-muted text-sm leading-relaxed">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── How you get paid ──────────────────────────────────────────────── */}
      <section id="how-you-get-paid" className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">{t('howPaid.label')}</p>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">
            {t('howPaid.title')}
          </h2>
          <p className="text-muted mb-14 max-w-xl leading-relaxed">
            {t('howPaid.body')}
          </p>

          <div className="max-w-2xl space-y-0">
            {PAYOUT_STEPS.map(({ label, sub, color }, i, arr) => (
              <div key={label} className="flex gap-5">
                {/* Timeline spine */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${color}`} />
                  {i < arr.length - 1 && (
                    <div className="w-px grow bg-border mt-1.5" />
                  )}
                </div>

                {/* Content */}
                <div className={`${i < arr.length - 1 ? 'pb-8' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="font-semibold text-foreground text-sm">{label}</p>
                  </div>
                  <p className="text-muted text-sm leading-relaxed">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fee breakdown ─────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid sm:grid-cols-2 gap-12 items-start max-w-5xl">

            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-4">{t('fee.label')}</p>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                {t('fee.title', { feePct: PLATFORM_FEE_PCT })}
              </h2>
              <p className="text-muted leading-relaxed mb-4">
                {t('fee.body1')}
              </p>
              <p className="text-muted leading-relaxed">
                {t('fee.body2')}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <p className="text-xs font-mono text-muted uppercase tracking-wider">{t('fee.exampleLabel')}</p>
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-muted text-sm">{t('fee.totalBacked')}</span>
                  <span className="font-mono font-bold text-foreground">+$2,758.00</span>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-muted text-sm">{t('fee.softFallThrough')}</span>
                  <span className="font-mono text-bad">−$758.00</span>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-muted text-sm">{t('fee.platformFee', { feePct: PLATFORM_FEE_PCT })}</span>
                  <span className="font-mono text-bad">−${(2000 * PLATFORM_FEE_PCT / 100).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-4 bg-creator/5">
                  <span className="text-foreground font-semibold text-sm">{t('fee.youReceive')}</span>
                  <span className="font-mono font-bold text-creator text-xl">
                    {format.number(2000 * creatorReceivesPct / 100, {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Social proof ──────────────────────────────────────────────────── */}
      <FeaturedBountiesSection />

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">
            {t('cta.titleLine1')}
            <br />{t('cta.titleLine2')}
          </h2>
          <p className="text-muted mb-8 max-w-sm mx-auto leading-relaxed">
            {t('cta.body')}
          </p>
          <Link
            href="/register"
            className="inline-block bg-creator text-brand-dark font-semibold px-8 py-3 rounded-lg hover:brightness-110 transition-all"
          >
            {t('cta.createAccount')}
          </Link>
          <p className="text-sm text-muted mt-4">
            {t('cta.alreadyHaveOne')}{' '}
            <Link href="/login" className="text-creator hover:brightness-110 transition-all">
              {t('cta.logIn')}
            </Link>
          </p>
          <p className="text-xs text-muted mt-8">
            <Link href="/about" className="hover:text-foreground transition-colors">{t('cta.howItWorks')}</Link>
            {' · '}
            <Link href="/tos" className="hover:text-foreground transition-colors">{t('cta.terms')}</Link>
            {' · '}
            <Link href="/support" className="hover:text-foreground transition-colors">{t('cta.contact')}</Link>
          </p>
        </div>
      </section>

    </div>
  );
}
