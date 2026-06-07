'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HeaderSearch from '@/components/HeaderSearch';
import BountyCard from '@/components/BountyCard';
import { featuredBounties } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Bounty } from '@/lib/types';

// ── "How it works" steps ───────────────────────────────────────────────────────
const STEPS: { n: number; body: string }[] = [
  { n: 1, body: 'Ask for your favorite creator to do something cool or stupid.' },
  { n: 2, body: "Like-minded fans chip in until the bounty can't be ignored." },
  { n: 3, body: 'The creator delivers, the fans pay them. Spam Ws in chat.' },
];

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
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
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 bg-creator/10 border border-creator/30 text-creator text-xs font-medium px-3 py-1.5 rounded-full mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-creator animate-pulse" />
            crowd-funded creator bounties
          </div>

          <h1 className="font-display font-bold text-5xl sm:text-6xl text-foreground tracking-tight mb-4 leading-[1.05]">
            tell the world
            <br />
            <span className="text-creator">what you want.</span>
          </h1>
          <p className="text-muted text-lg sm:text-xl mb-9 leading-relaxed max-w-xl mx-auto">
            Search for any creator, artist, or public figure — start a bounty and
            let the community fund it. No delivery, no charge.
          </p>

          {/* Search — same widget as the header, just the larger size. */}
          <div className="w-full text-left">
            <HeaderSearch
              size="lg"
              placeholder="Search for a creator, artist, or public figure…"
            />
          </div>

          {/* Secondary links */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <Link href="/bounties" className="text-foreground hover:text-creator transition-colors font-medium">
              Browse open bounties →
            </Link>
            <span className="text-border" aria-hidden>·</span>
            <Link href="/for-creators" className="text-muted hover:text-foreground transition-colors">
              Are you a creator?
            </Link>
          </div>
        </div>
      </section>

      {/* ── TRENDING BOUNTIES ───────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface/40">
        <div className="max-w-6xl mx-auto px-7 py-16 sm:py-20">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted mb-2">trending now</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground leading-tight">
                what people want right now
              </h2>
            </div>
            <Link
              href="/bounties"
              className="shrink-0 text-sm text-creator hover:brightness-110 transition-all font-medium whitespace-nowrap"
            >
              Browse all →
            </Link>
          </div>

          {bountiesLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-surface border border-border rounded-md shadow-[3px_3px_0_#000] animate-pulse" />
              ))}
            </div>
          ) : trendingBounties.length === 0 ? (
            <div className="text-center py-16 text-muted border border-dashed border-border rounded-md">
              No featured bounties yet.{' '}
              <Link href="/bounties" className="text-creator hover:underline">
                Browse all bounties
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted mb-2">the gist</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-14">
            what&apos;s the big idea?
          </h2>

          <div className="grid sm:grid-cols-3 gap-12 sm:gap-8">
            {STEPS.map(({ n, body }) => (
              <div key={n} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-md flex items-center justify-center font-mono font-bold text-lg mb-5 shrink-0 bg-creator text-brand-dark shadow-[3px_3px_0_#000]">
                  {n}
                </div>
                <p className="text-foreground font-medium text-base leading-snug max-w-[16rem]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA (logged-out only) ───────────────────────────────────── */}
      {!user && (
        <section className="border-t border-border bg-surface">
          <div className="max-w-3xl mx-auto px-7 py-20 text-center">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4 leading-tight">
              what do you want to see made?
            </h2>
            <p className="text-muted text-lg mb-8 max-w-md mx-auto leading-relaxed">
              Find your favorite creator and start a bounty. If the crowd wants it
              too, the money shows up.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="bg-creator text-brand-dark font-semibold px-6 py-3 rounded-md shadow-[3px_3px_0_#000] transition-[transform,box-shadow,filter] duration-75 hover:brightness-110 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#000]"
              >
                Create your account →
              </Link>
              <Link
                href="/bounties"
                className="bg-surface-2 border border-border text-foreground font-semibold px-6 py-3 rounded-md shadow-[3px_3px_0_#000] transition-[transform,box-shadow,border-color] duration-75 hover:border-creator/60 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#000]"
              >
                Browse bounties
              </Link>
            </div>
            <p className="text-sm text-muted mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-creator hover:brightness-110 transition-all">
                Log in →
              </Link>
            </p>
          </div>
        </section>
      )}
    </>
  );
}
