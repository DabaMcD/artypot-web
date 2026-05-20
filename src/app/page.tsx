'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreatorSearchWidget from '@/components/CreatorSearchWidget';
import { featuredBounties } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Creator, Bounty } from '@/lib/types';

// ── Inline logo ────────────────────────────────────────────────────────────────
function ArtypotLogo() {
  return (
    <span className="font-display font-bold text-xl tracking-tight select-none">
      <span className="text-foreground">ar</span>
      <span className="text-creator">ty</span>
      <span className="text-foreground">pot</span>
    </span>
  );
}

// ── Creator avatar (mirrors the one in CreatorSearchWidget) ────────────────────
function CreatorAvatar({ creator, size = 'sm' }: { creator: Pick<Creator, 'display_name' | 'profile_picture'>; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs';
  if (creator.profile_picture) {
    return (
      <img
        src={creator.profile_picture}
        alt={creator.display_name}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <span
      className={`${dim} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ background: '#47DFD3', color: '#0a0a0a' }}
    >
      {creator.display_name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  );
}

// ── Trending bounty card ───────────────────────────────────────────────────────
function TrendingBountyCard({ bounty }: { bounty: Bounty }) {
  const backerCount = bounty.pledges?.filter((v) => !v.revoked_at).length ?? 0;
  const pledged = Number(bounty.total_pledged);
  // Rough goal proxy — show progress vs. a soft milestone (or just fill bar)
  const barWidth = Math.min(100, pledged > 0 ? Math.min(100, (pledged / 500) * 100) : 0);

  return (
    <Link
      href={`/bounties/${bounty.id}`}
      className="block group bg-surface border border-border rounded-xl p-5 hover:border-creator/50 transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(71,223,211,0.08)]"
    >
      {/* Creator header */}
      {bounty.owner_user && (
        <div className="flex items-center gap-2 mb-3">
          <CreatorAvatar creator={bounty.owner_user} />
          <span className="text-sm text-creator font-medium truncate">{bounty.owner_user.display_name}</span>
        </div>
      )}

      {/* Title */}
      <h3 className="font-semibold text-foreground group-hover:text-creator transition-colors line-clamp-2 leading-snug mb-4 text-base">
        {bounty.title}
      </h3>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-creator rounded-full transition-all"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-foreground">
          ${pledged.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-xs text-muted font-normal ml-1">pledged</span>
        </span>
        <span className="text-muted text-xs">
          {backerCount} {backerCount === 1 ? 'backer' : 'backers'}
        </span>
      </div>
    </Link>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
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
      {/* ── STICKY NAV ──────────────────────────────────────────────────────── */}
      {!user && (
        <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-border/60">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="shrink-0">
              <ArtypotLogo />
            </Link>

            {/* Right side */}
            <nav className="flex items-center gap-1 sm:gap-4">
              <a
                href="#how-it-works"
                className="hidden sm:block text-sm text-muted hover:text-foreground transition-colors"
              >
                How it works
              </a>
              <Link
                href="/login"
                className="text-sm text-muted hover:text-foreground transition-colors px-2 py-1"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm bg-creator text-brand-dark font-semibold px-3 py-1.5 rounded-md hover:brightness-110 transition-all"
              >
                Sign up
              </Link>
            </nav>
          </div>
        </header>
      )}

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-foreground tracking-tight mb-3 leading-tight">
            tell the world
            <br />
            <span className="text-creator">what you want.</span>
          </h1>
          <p className="text-muted text-lg mb-8 leading-relaxed font-sans">
            Search for any creator, artist, or public figure — start a bounty and let the community fund it.
          </p>

          <div className="w-full">
            <CreatorSearchWidget
              selectedCreator={selectedCreator}
              onSelect={setSelectedCreator}
              onClear={() => setSelectedCreator(null)}
              placeholder="Search for a creator, artist, or public figure…"
            />

            {selectedCreator && (
              <button
                onClick={() => router.push(selectedCreator.slug ? `/${selectedCreator.slug}` : `/creators/${selectedCreator.id}`)}
                className="mt-3 w-full bg-creator text-brand-dark font-semibold py-3 rounded-lg hover:brightness-110 transition-all text-sm"
              >
                See Bounties →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── TRENDING BOUNTIES ───────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground">
              trending bounties
            </h2>
            <Link
              href="/bounties"
              className="text-sm text-creator hover:brightness-110 transition-all font-medium"
            >
              Browse all →
            </Link>
          </div>

          {bountiesLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-surface border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : trendingBounties.length === 0 ? (
            <div className="text-center py-16 text-muted border border-dashed border-border rounded-xl">
              No featured bounties yet.{' '}
              <Link href="/bounties" className="text-creator hover:underline">
                Browse all bounties
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingBounties.map((bounty) => (
                <TrendingBountyCard key={bounty.id} bounty={bounty} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className={user
          ? 'py-12 px-4 border-t border-border'
          : 'py-20 px-4 bg-surface border-y border-border'}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-12">
            how it works
          </h2>

          <div className="grid sm:grid-cols-3 gap-10 sm:gap-6">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-4 shrink-0"
                style={{ background: '#47DFD3', color: '#0a0a0a' }}
              >
                1
              </div>
              <p className="text-foreground font-medium text-base leading-snug font-sans">
                Find a creator and start a bounty
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-4 shrink-0"
                style={{ background: '#47DFD3', color: '#0a0a0a' }}
              >
                2
              </div>
              <p className="text-foreground font-medium text-base leading-snug font-sans">
                Fans chip in if they want it too
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-4 shrink-0"
                style={{ background: '#47DFD3', color: '#0a0a0a' }}
              >
                3
              </div>
              <p className="text-foreground font-medium text-base leading-snug font-sans">
                Creator delivers, gets paid out
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      {!user && (
        <footer className="border-t border-border px-4 py-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-muted text-sm font-sans">© 2026 Artypot LLC</p>
            <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
              <Link href="/about" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
                About
              </Link>
              <Link href="/terms" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
                Privacy
              </Link>
              <Link href="/contact" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
                Contact
              </Link>
            </nav>
          </div>
        </footer>
      )}
    </>
  );
}
