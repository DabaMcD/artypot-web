'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { creators as creatorsApi, handles as handlesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Button } from '@/components/ui/Button';
import { SectionLabel } from '@/components/ui/Card';
import ShareButton from '@/components/ShareButton';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import { Badge } from '@/components/ui/Badge';
import type { HandlePlatform } from '@/lib/types';
import { PLATFORM_HANDLE_CONFIG } from '@/components/ui/PlatformHandleInput';

/**
 * Depth-2 catch-all: artypot.com/{platform}/{handle}.
 *
 * Next.js requires the depth-1 segment to share its param name with /{slug},
 * hence `params.slug` here actually carries the *platform* portion of the URL.
 * Platform names are reserved against creator slugs (see App\Support\CreatorSlug::RESERVED)
 * so there is no ambiguity between this route and /{creator-slug}.
 */

// Catalogue-driven — new platforms appear here automatically when added to
// @/lib/platforms.ts. Note: 'other' is intentionally NOT in KNOWN_PLATFORMS
// because /{platform}/{handle} routing requires a clean slug; 'other' handles
// have no canonical short identifier (their key is a URL) and are reached
// only via search or a creator's profile.
import { CURATED_PLATFORMS, platformLabel as catalogueLabel } from '@/lib/platforms';

const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  CURATED_PLATFORMS.map((slug) => [slug, catalogueLabel(slug)]),
);

const KNOWN_PLATFORMS = new Set<string>(CURATED_PLATFORMS);

type SimpleBounty = { id: number; title: string; status: string; total_backed: string; created_at: string };

type ResolveResult =
  | { kind: 'loading' }
  | { kind: 'not-platform' }
  | { kind: 'unverified'; handle: { id: number | null; platform: string; username: string }; bounties: SimpleBounty[] }
  | { kind: 'error' };

// ── Mini bounty card (simplified — handle bounties aren't full Bounty objects) ──

function HandleBountyCard({ bounty }: { bounty: SimpleBounty }) {
  return (
    <div className="relative bg-surface border border-border rounded-xl p-5 hover:border-fan/50 transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Stretched link covers the card; share button sits above it via z-10 */}
        <h3 className="font-semibold text-foreground group-hover:text-fan transition-colors line-clamp-2 leading-snug">
          <Link
            href={`/bounties/${bounty.id}`}
            className="after:absolute after:inset-0 focus:outline-none"
          >
            {bounty.title}
          </Link>
        </h3>
        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
          <ShareButton path={`/bounties/${bounty.id}`} title={bounty.title} />
          <BountyStatusBadge status={bounty.status} />
        </div>
      </div>
      <div className="pt-3 border-t border-border">
        <div className="text-fan font-bold text-lg">
          ${Number(bounty.total_backed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlatformHandlePage({ params }: { params: Promise<{ slug: string; handle: string }> }) {
  const { slug: platform, handle } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<ResolveResult>({ kind: 'loading' });
  const [claiming, setClaiming] = useState(false);

  // "Is this you?" — create an unverified claim for the authenticated user,
  // then drop them onto the handles section to verify ownership. Creators land
  // on /c/handles; everyone else goes through /become-creator, which hosts the
  // same HandlesSection (and won't bounce non-creators the way /c/* does).
  const handleClaim = useCallback(async () => {
    if (state.kind !== 'unverified') return;
    if (!user) {
      router.push('/login');
      return;
    }
    setClaiming(true);
    try {
      const platformKey = platform.toLowerCase() as HandlePlatform;
      await handlesApi.store(platformKey, state.handle.username);
      toast('Handle claimed — verify it below to confirm ownership.', 'success');
      const dest = user.role === 'creator' || user.role === 'council'
        ? '/c/handles'
        : '/become-creator';
      router.push(dest);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Could not claim this handle. Please try again.', 'error');
      setClaiming(false);
    }
  }, [state, user, router, platform, toast]);

  useEffect(() => {
    let cancelled = false;
    if (!KNOWN_PLATFORMS.has(platform.toLowerCase())) {
      setState({ kind: 'not-platform' });
      return;
    }

    (async () => {
      try {
        const res = await creatorsApi.byPlatformHandle(platform, handle);
        if (cancelled) return;

        if (res.match === 'verified') {
          router.replace(`/${res.user.slug}`);
          return;
        }

        setState({ kind: 'unverified', handle: res.handle, bounties: res.bounties });
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        setState({ kind: status === 404 ? 'not-platform' : 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [platform, handle, router]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state.kind === 'loading') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-48 bg-surface border border-border rounded-xl animate-pulse mb-6" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (state.kind === 'not-platform') {
    return (
      <div className="space-y-6 pt-2 max-w-xl">
        <div>
          <SectionLabel>platform handle</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">page not found</h1>
          <p className="text-sm text-muted mt-2">
            We don&apos;t recognize this URL. Browse creators or head home.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/search"><Button variant="primary">Explore Creators</Button></Link>
          <Link href="/"><Button variant="ghost">← Home</Button></Link>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state.kind === 'error') {
    return (
      <div className="space-y-6 pt-2 max-w-xl">
        <p className="text-sm text-bad">
          something went wrong looking that up. try again in a moment.
        </p>
      </div>
    );
  }

  // ── Unverified ──────────────────────────────────────────────────────────────
  const platformKey = platform.toLowerCase() as HandlePlatform;
  const platformLabel = PLATFORM_LABELS[platformKey] ?? platform;
  const prefix = PLATFORM_HANDLE_CONFIG[platformKey]?.prefix ?? '@';
  const fullHandle = `${prefix}${state.handle.username}`;

  const shareText = `${fullHandle} on ${platformLabel} — fans are queueing bounties for them on Artypot. Help get their attention!`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Main column ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Profile card */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-8">
            <div className="flex items-start gap-5">
              {/* Placeholder avatar */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 select-none"
                style={{ background: '#47DFD3', color: '#0a0a0a' }}
              >
                {state.handle.username.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">

                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl font-display font-bold text-foreground break-all">{fullHandle}</h1>
                  <Badge tone="default" lg>Unverified</Badge>
                </div>
                <p className="text-sm text-muted mb-3">{platformLabel}</p>
                <p className="text-muted text-sm leading-relaxed">
                  <span className="font-mono text-creator">{fullHandle}</span>{' '}doesn&apos;t appear to have joined Artypot yet.
                  Tag them on social media to let them know there are fans queueing bounties.
                </p>

                {/* "Is this you?" — self-claim CTA for the handle's real owner */}
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <Button variant="primary" size="sm" onClick={handleClaim} disabled={claiming}>
                    {claiming ? 'Claiming…' : 'Is this you? Claim this handle →'}
                  </Button>
                  <span className="text-xs text-muted">
                    {user
                      ? 'We’ll add it to your account and help you verify it.'
                      : 'Sign in to claim it as your own.'}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <ShareButton
                  path={`/${platform}/${handle}`}
                  title={fullHandle}
                  text={shareText}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Bounties */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground">
                Bounties for {fullHandle}
              </h2>
              {user && (
                <Link
                  href={`/bounties/new?platform=${encodeURIComponent(platform)}&handle=${encodeURIComponent(state.handle.username)}`}
                  className="text-sm bg-fan text-black font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  + New Bounty
                </Link>
              )}
            </div>

            {state.bounties.length === 0 ? (
              <div className="text-center py-16 text-muted border border-border border-dashed rounded-xl">
                No bounties queued for this handle yet.{' '}
                {user ? (
                  <Link
                    href={`/bounties/new?platform=${encodeURIComponent(platform)}&handle=${encodeURIComponent(state.handle.username)}`}
                    className="text-fan hover:underline"
                  >
                    Create the first one
                  </Link>
                ) : (
                  <Link href="/login" className="text-fan hover:underline">
                    Sign in to start one
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {state.bounties.map((b) => (
                  <HandleBountyCard key={b.id} bounty={b} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Spread the word
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Help <span className="font-mono text-creator">{fullHandle}</span> discover their fans on Artypot. Share their page and tag them on {platformLabel}.
            </p>
            <div className="flex justify-end">
              <ShareButton
                path={`/${platform}/${handle}`}
                title={fullHandle}
                text={shareText}
                size="md"
                label="Share & Tag"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
