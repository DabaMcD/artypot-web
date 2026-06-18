import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { CSSProperties } from 'react';
import FeaturedBountiesSection from '@/components/FeaturedBountiesSection';
import SpotCard from '@/components/about/SpotCard';
import BountyGrowthDemo from '@/components/about/BountyGrowthDemo';
import LifecycleRail from '@/components/about/LifecycleRail';
import { Badge } from '@/components/ui/Badge';
import { PLATFORM_FEE_PCT } from '@/lib/config';

export const metadata = {
  title: 'About',
  description:
    'Like Kickstarter, but no money moves until the thing is done. Fans pool money on specific requests; nobody is charged until the work is delivered and approved.',
};

// Pins .ap-sketch-u (which reads --color-role) to fan yellow regardless of the
// visitor's role, since AppShell sets data-role from the logged-in user.
const fanRole = { '--color-role': 'var(--color-fan)' } as CSSProperties;

const microLabel = 'font-mono text-[10px] uppercase tracking-[2px] text-muted';

// Signature hard-shadow press buttons
const pressBtn =
  'inline-block bg-fan text-brand-dark font-bold px-6 py-3 rounded-md shadow-[3px_3px_0_#000] transition-[transform,box-shadow] duration-75 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#000]';
const pressBtnSecondary =
  'inline-block bg-surface-2 border border-border text-foreground font-semibold px-6 py-3 rounded-md shadow-[3px_3px_0_#000] transition-[transform,box-shadow,border-color] duration-75 hover:border-creator/60 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#000]';

// Style metadata for each tagline pill; copy lives in the "About" catalog.
const TAGLINES: { key: string; pill: string; dot: string }[] = [
  { key: 'kickstarter', pill: 'bg-fan/10 border-fan/30 text-fan', dot: 'bg-fan' },
  { key: 'changeOrg', pill: 'bg-fan/10 border-fan/30 text-fan', dot: 'bg-fan' },
  { key: 'device', pill: 'bg-creator/10 border-creator/30 text-creator', dot: 'bg-creator' },
];

// Style metadata for each how-it-works step; copy lives in the "About" catalog.
const HOW_IT_WORKS: { key: string; step: string; chip: string; spot: string }[] = [
  { key: 'open', step: '01', chip: 'bg-fan', spot: 'var(--color-fan)' },
  { key: 'grow', step: '02', chip: 'bg-creator', spot: 'var(--color-creator)' },
  { key: 'ship', step: '03', chip: 'bg-council', spot: 'var(--color-council)' },
];

// Style metadata for each role; copy lives in the "About" catalog.
const ROLES: {
  key: string;
  tone: 'fan' | 'creator' | 'council';
  spot: string;
  skin: string;
  dot: string;
  text: string;
}[] = [
  {
    key: 'fans',
    tone: 'fan',
    spot: 'var(--color-fan)',
    skin: 'border-fan/30 bg-fan/5',
    dot: 'bg-fan',
    text: 'text-fan',
  },
  {
    key: 'creator',
    tone: 'creator',
    spot: 'var(--color-creator)',
    skin: 'border-creator/30 bg-creator/5',
    dot: 'bg-creator',
    text: 'text-creator',
  },
  {
    key: 'council',
    tone: 'council',
    spot: 'var(--color-council)',
    skin: 'border-council/30 bg-council/5',
    dot: 'bg-council',
    text: 'text-council',
  },
];

// Keys for each guarantee card; copy lives in the "About" catalog.
const GUARANTEES = ['charged', 'fee', 'payout', 'noAccess'] as const;

export default function AboutPage() {
  const t = useTranslations('About');

  return (
    <div className="min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative">
        {/* Soft fan glow behind the hero, clipped so it never bleeds sideways. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-1/2 top-0 h-[420px] w-[820px] max-w-[140vw] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,217,102,0.10) 0%, transparent 65%)' }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-7 pt-24 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
            <div>
              <div className="flex flex-col items-start gap-2 mb-8">
                {TAGLINES.map(({ key, pill, dot }) => (
                  <p key={key} className={`inline-flex items-center gap-2 border text-xs font-medium px-3 py-1.5 rounded-full ${pill}`}>
                    <span aria-hidden className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                    {t(`hero.taglines.${key}`)}
                  </p>
                ))}
              </div>

              <h1 className="font-display font-bold text-5xl sm:text-6xl tracking-tight text-foreground leading-[1.1] mb-6">
                {t('hero.titleLine1')}
                <br />
                <span className="text-fan">
                  {t('hero.titleLine2Prefix')}{' '}
                  <span className="ap-sketch-u" style={fanRole}>{t('hero.titleLine2Sketch')}</span>
                </span>
              </h1>

              <p className="text-xl text-muted max-w-xl leading-relaxed mb-10">
                {t('hero.lede')}{' '}
                <span className="text-foreground">{t('hero.ledeEmphasis')}</span>
              </p>

              <div className="flex flex-wrap gap-4 mb-6">
                <Link href="/bounties" className={pressBtn}>{t('hero.browseBounties')}</Link>
                <Link href="/search" className={pressBtnSecondary}>{t('hero.exploreCreators')}</Link>
              </div>
              <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">
                {t('hero.notSure')}
              </a>
            </div>

            {/* The product object, shown instead of described. */}
            <BountyGrowthDemo />
          </div>
        </div>
      </section>

      {/* ── The psychology ────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-7 py-24">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <p className={`${microLabel} mb-3`}>{t('psychology.label')}</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground leading-snug mb-5">
              {t('psychology.titleLine1')}
              <br />{t('psychology.titleLine2')}
              <br /><span className="ap-sketch-u" style={fanRole}>{t('psychology.titleSketch')}</span>
            </h2>
            <p className="text-lg text-muted">
              {t('psychology.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <SpotCard spotColor="var(--color-muted)" className="border-border bg-background p-7">
              <p className={`${microLabel} mb-4`}>{t('psychology.usualLabel')}</p>
              <p className="text-muted leading-relaxed">
                {t('psychology.usualBody')}
              </p>
            </SpotCard>

            <SpotCard spotColor="var(--color-fan)" className="border-fan/30 bg-background p-7">
              <p className="font-mono text-[10px] uppercase tracking-[2px] text-fan mb-4">{t('psychology.oursLabel')}</p>
              <p className="text-foreground leading-relaxed">
                {t('psychology.oursBody')}
              </p>
            </SpotCard>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-7 py-20">
          <p className={`${microLabel} mb-3`}>{t('howItWorks.label')}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">{t('howItWorks.title')}</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ key, step, chip, spot }) => (
              <SpotCard key={step} spotColor={spot} className="border-border bg-surface p-6">
                <div className={`w-12 h-12 rounded-md font-mono font-bold text-lg flex items-center justify-center shadow-[3px_3px_0_#000] text-brand-dark mb-5 ${chip}`}>
                  {step}
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">{t(`howItWorks.steps.${key}.title`)}</h3>
                <p className="text-base text-muted leading-relaxed">{t(`howItWorks.steps.${key}.description`)}</p>
              </SpotCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who's in the room ─────────────────────────────────────────────── */}
      <section id="roles" className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-7 py-20">
          <p className={`${microLabel} mb-3`}>{t('roles.label')}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">
            {t('roles.title')}
          </h2>
          <p className="text-muted mb-12">{t('roles.subtitle')}</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {ROLES.map(({ key, tone, spot, skin, dot, text }) => (
              <SpotCard key={key} spotColor={spot} className={`${skin} p-6`}>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span aria-hidden className={`w-3 h-3 rounded-full shrink-0 ${dot}`} />
                    <h3 className={`font-display font-bold text-2xl ${text}`}>{t(`roles.cast.${key}.name`)}</h3>
                  </div>
                  <Badge tone={tone} className="shrink-0">{t(`roles.cast.${key}.badge`)}</Badge>
                </div>
                <p className="text-base text-muted leading-relaxed">{t(`roles.cast.${key}.body`)}</p>
              </SpotCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── The money ─────────────────────────────────────────────────────── */}
      <section id="the-money" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-7 py-20">
          <div className="max-w-3xl mb-12">
            <p className={`${microLabel} mb-3`}>{t('money.label')}</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4">{t('money.title')}</h2>
            <p className="text-muted leading-relaxed">
              {t('money.intro')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GUARANTEES.map((key) => (
              <div key={key} className="rounded-xl border border-border bg-surface p-5">
                <p className="font-semibold text-foreground mb-2">
                  <span aria-hidden className="text-fan mr-2">✓</span>
                  {t(`money.guarantees.${key}.title`, { pct: PLATFORM_FEE_PCT })}
                </p>
                <p className="text-sm text-muted leading-relaxed">{t(`money.guarantees.${key}.detail`)}</p>
              </div>
            ))}
          </div>

          <div id="lifecycle" className="mt-14 rounded-xl border border-border bg-surface p-6 sm:p-10">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-10">
              <h3 className="font-display font-bold text-2xl text-foreground">{t('money.lifecycleTitle')}</h3>
              <p className={microLabel}>{t('money.lifecycleLabel')}</p>
            </div>
            <LifecycleRail />
          </div>
        </div>
      </section>

      {/* ── The fine print ────────────────────────────────────────────────── */}
      <section id="fine-print" className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-7 py-20">
          <div className="max-w-3xl mb-12">
            <p className={`${microLabel} mb-3`}>{t('finePrint.label')}</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">{t('finePrint.title')}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            <div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">{t('finePrint.recordTitle')}</h3>
              <p className="text-base text-muted leading-relaxed mb-3">
                {t('finePrint.recordBody1')}
              </p>
              <p className="text-base text-muted leading-relaxed">
                {t('finePrint.recordBody2')}
              </p>
            </div>

            <div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">{t('finePrint.statusTitle')}</h3>
              <p className="text-base text-muted leading-relaxed mb-3">
                {t.rich('finePrint.statusBody1', {
                  emph: (chunks) => <span className="text-foreground">{chunks}</span>,
                })}
              </p>
              <p className="text-base text-muted leading-relaxed">
                {t('finePrint.statusBody2')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured bounties ─────────────────────────────────────────────── */}
      <FeaturedBountiesSection />

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative border-t border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-1/2 bottom-0 h-[300px] w-[700px] max-w-[140vw] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,217,102,0.08) 0%, transparent 65%)' }}
          />
        </div>

        <div className="max-w-3xl mx-auto px-7 py-24 text-center">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground leading-tight mb-4">
            {t('cta.titleLine1')}
            <br />{t('cta.titleLine2')}
          </h2>
          <p className="text-muted text-lg mb-9">
            {t('cta.subtitle')}
          </p>
          <Link href="/bounties" className={`${pressBtn} px-8`}>
            {t('cta.browse')}
          </Link>
          <Link
            href="/bounties/new"
            className="block text-sm text-muted hover:text-foreground transition-colors mt-5"
          >
            {t('cta.start')}
          </Link>
        </div>
      </section>

    </div>
  );
}
