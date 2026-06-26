'use client';

import { useState, useEffect, Fragment } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import HeaderSearch from '@/components/HeaderSearch';
import BountyCard from '@/components/BountyCard';
import { featuredBounties } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Bounty } from '@/lib/types';

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const t = useTranslations('Home');
  const { user } = useAuth();

  // ── "How it works" steps ──────────────────────────────────────────────────
  const STEPS: { n: number; body: string }[] = [
    { n: 1, body: t('howItWorks.steps.one') },
    { n: 2, body: t('howItWorks.steps.two') },
    { n: 3, body: t('howItWorks.steps.three') },
  ];
  const [trendingBounties, setTrendingBounties] = useState<Bounty[]>([]);
  const [bountiesLoading, setBountiesLoading] = useState(true);

  useEffect(() => {
    featuredBounties
      .list()
      .then((res) => setTrendingBounties(res.data.slice(0, 3)))
      .catch(() => {/* silently skip */})
      .finally(() => setBountiesLoading(false));
  }, []);

  return (
    <>
      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      {/* z-20 keeps the search dropdown stacked above the sections below it. */}
      <section className="relative z-20 px-7 pt-20 pb-20 sm:pt-28">
        {/* soft creator glow behind the hero — clipped in its own overflow-hidden
            layer so it never bleeds horizontally, while the search dropdown
            (which escapes the hero downward) is NOT clipped. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-1/2 top-0 h-[420px] w-[820px] max-w-[140vw] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(71,223,211,0.10) 0%, transparent 65%)' }}
          />
        </div>

        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-display font-bold text-5xl sm:text-6xl text-foreground tracking-tight mb-4 leading-[1.05]">
            {t('hero.titleLine1')}
            <br />
            <span className="text-creator">{t('hero.titleLine2')}</span>
          </h1>
          <p className="text-muted text-lg sm:text-xl mb-9 leading-relaxed max-w-xl mx-auto">
            {t('hero.subtitle')}
          </p>

          {/* Search — same widget as the header, just the larger size. */}
          <div className="w-full text-left">
            <HeaderSearch
              size="lg"
              placeholder={t('hero.searchPlaceholder')}
            />
          </div>

          {/* Secondary links */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <Link href="/bounties" className="text-foreground hover:text-creator transition-colors font-medium">
              {t('hero.browseBounties')}
            </Link>
            <span className="text-border" aria-hidden>·</span>
            <Link href="/for-creators" className="text-muted hover:text-foreground transition-colors">
              {t('hero.areYouCreator')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── TRENDING BOUNTIES ───────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface/40">
        <div className="max-w-6xl mx-auto px-7 py-16 sm:py-20">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted mb-2">{t('trending.label')}</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground leading-tight">
                {t('trending.title')}
              </h2>
            </div>
            <Link
              href="/bounties"
              className="shrink-0 text-sm text-creator hover:brightness-110 transition-all font-medium whitespace-nowrap"
            >
              {t('trending.browseAll')}
            </Link>
          </div>

          {bountiesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-surface border border-border rounded-md shadow-[3px_3px_0_#000] animate-pulse" />
              ))}
            </div>
          ) : trendingBounties.length === 0 ? (
            <div className="text-center py-16 text-muted border border-dashed border-border rounded-md">
              {t('trending.empty')}{' '}
              <Link href="/bounties" className="text-creator hover:underline">
                {t('trending.emptyLink')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {trendingBounties.map((bounty) => (
                <BountyCard key={bounty.id} bounty={bounty} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-border">
        <div className="max-w-5xl mx-auto px-7 py-16 sm:py-24 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted mb-2">{t('howItWorks.label')}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-5">
            {t('howItWorks.title')}
          </h2>
          {/* Plain-language purpose statement that names the app, so the home
              page both explains what Artypot does and surfaces the app name as
              crawlable text (matches the OAuth consent screen). */}
          <p className="text-muted text-lg leading-relaxed max-w-2xl mx-auto mb-14">
            {t('howItWorks.purpose')}
          </p>

          {/* Connected flow: arrows point right between steps on desktop, down
              between them on mobile, so the 1 → 2 → 3 progression reads at a glance. */}
          <div className="flex flex-col items-center sm:flex-row sm:items-start sm:justify-center gap-6 sm:gap-3">
            {STEPS.map(({ n, body }, i) => (
              <Fragment key={n}>
                <div className="flex flex-col items-center w-full max-w-[16rem] sm:flex-1">
                  <div className="w-12 h-12 rounded-md flex items-center justify-center font-mono font-bold text-lg mb-5 shrink-0 bg-creator text-brand-dark shadow-[3px_3px_0_#000]">
                    {n}
                  </div>
                  <p className="text-foreground font-medium text-base leading-snug">
                    {body}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div aria-hidden className="shrink-0 text-creator sm:mt-3">
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="w-7 h-7 rotate-90 sm:rotate-0"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA (logged-out only) ───────────────────────────────────── */}
      {!user && (
        <section className="border-t border-border bg-surface">
          <div className="max-w-3xl mx-auto px-7 py-20 text-center">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4 leading-tight">
              {t('cta.title')}
            </h2>
            <p className="text-muted text-lg mb-8 max-w-md mx-auto leading-relaxed">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="bg-creator text-brand-dark font-semibold px-6 py-3 rounded-md shadow-[3px_3px_0_#000] transition-[transform,box-shadow,filter] duration-75 hover:brightness-110 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#000]"
              >
                {t('cta.createAccount')}
              </Link>
              <Link
                href="/bounties"
                className="bg-surface-2 border border-border text-foreground font-semibold px-6 py-3 rounded-md shadow-[3px_3px_0_#000] transition-[transform,box-shadow,border-color] duration-75 hover:border-creator/60 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#000]"
              >
                {t('cta.browseBounties')}
              </Link>
            </div>
            <p className="text-sm text-muted mt-6">
              {t('cta.haveAccount')}{' '}
              <Link href="/login" className="text-creator hover:brightness-110 transition-all">
                {t('cta.logIn')}
              </Link>
            </p>
          </div>
        </section>
      )}
    </>
  );
}
