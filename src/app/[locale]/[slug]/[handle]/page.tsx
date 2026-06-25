'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { creators as creatorsApi, handles as handlesApi } from '@/lib/api';
import { useMoney } from '@/lib/format';
import { normalizeAvatarUrl } from '@/lib/cloudinary';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Button } from '@/components/ui/Button';
import { SectionLabel } from '@/components/ui/Card';
import ShareButton from '@/components/ShareButton';
import { ReportModal } from '@/components/ReportModal';
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
import { CURATED_PLATFORMS, platformLabel as catalogueLabel, bareUsername, platformProfileUrl } from '@/lib/platforms';

const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  CURATED_PLATFORMS.map((slug) => [slug, catalogueLabel(slug)]),
);

const KNOWN_PLATFORMS = new Set<string>(CURATED_PLATFORMS);

type SimpleBounty = { id: number; title: string; status: string; total_backed: string; created_at: string };

type SimpleHandle = { id: number | null; platform: string; username: string };

/** Public identity of a verified owner who hasn't enabled creator mode yet. */
type ClaimedOwner = { display_name: string; profile_picture: string | null };

type ResolveResult =
  | { kind: 'loading' }
  | { kind: 'not-platform' }
  | { kind: 'unverified'; handle: SimpleHandle; bounties: SimpleBounty[] }
  // 'claimed': a verified claim exists but the owner has no creator page yet —
  // this handle page stays their public surface until they enable creator mode.
  | { kind: 'claimed'; handle: SimpleHandle; owner: ClaimedOwner; bounties: SimpleBounty[] }
  | { kind: 'error' };

// ── Mini bounty card (simplified — handle bounties aren't full Bounty objects) ──

function HandleBountyCard({ bounty }: { bounty: SimpleBounty }) {
  const money = useMoney();
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
          {money(Number(bounty.total_backed))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlatformHandlePage({ params }: { params: Promise<{ slug: string; handle: string }> }) {
  const { slug: platform, handle } = use(params);
  const router = useRouter();
  const t = useTranslations('PublicProfile');
  const tReport = useTranslations('Report');
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<ResolveResult>({ kind: 'loading' });
  const [claiming, setClaiming] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // Guards the auto-resume so we only fire one claim per ?claim=1 arrival.
  const autoClaimFired = useRef(false);

  // "Is this you?" — create an unverified claim for the authenticated user,
  // then drop them onto the handles section to verify ownership. Creators land
  // on /c/handles; everyone else goes through /become-creator, which hosts the
  // same HandlesSection (and won't bounce non-creators the way /c/* does).
  const handleClaim = useCallback(async () => {
    if (state.kind !== 'unverified') return;
    if (!user) {
      // Send them to sign up / log in, then bring them right back here with a
      // flag that auto-resumes the claim — so the CTA they clicked actually
      // completes instead of dead-ending on the dashboard.
      const next = `/${platform}/${handle}?claim=1`;
      router.push(`/register?next=${encodeURIComponent(next)}`);
      return;
    }
    setClaiming(true);
    try {
      const platformKey = platform.toLowerCase() as HandlePlatform;
      await handlesApi.store(platformKey, state.handle.username);
      toast(t('claim.successToast'), 'success');
      const dest = user.role === 'creator' || user.role === 'council'
        ? '/c/handles'
        : '/become-creator';
      router.push(dest);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? t('claim.errorToast'), 'error');
      setClaiming(false);
    }
  }, [state, user, router, platform, handle, toast, t]);

  // Resume a claim that was interrupted by the login round-trip: a logged-out
  // visitor who clicked "Claim this handle" lands back here as ?claim=1 once
  // authenticated, and we fire the claim automatically.
  useEffect(() => {
    if (autoClaimFired.current) return;
    if (state.kind !== 'unverified' || !user) return;
    if (new URLSearchParams(window.location.search).get('claim') !== '1') return;
    autoClaimFired.current = true;
    // Deliberate one-shot side effect: resume the interrupted claim (an API
    // call) now that auth is present. Guarded by autoClaimFired so it can't loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleClaim();
  }, [state, user, handleClaim]);

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

        if (res.match === 'claimed') {
          setState({ kind: 'claimed', handle: res.handle, owner: res.owner, bounties: res.bounties });
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
      <div className="max-w-6xl mx-auto px-7 py-10">
        <div className="h-48 bg-surface border border-border rounded-xl animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
      <div className="max-w-6xl mx-auto px-7 py-10 space-y-6">
        <div>
          <SectionLabel>{t('handleNotFound.label')}</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">{t('handleNotFound.heading')}</h1>
          <p className="text-sm text-muted mt-2">
            {t('handleNotFound.body')}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/search"><Button variant="primary">{t('notFound.exploreCreators')}</Button></Link>
          <Link href="/"><Button variant="ghost">{t('notFound.home')}</Button></Link>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state.kind === 'error') {
    return (
      <div className="max-w-6xl mx-auto px-7 py-10 space-y-6">
        <p className="text-sm text-bad">
          {t('error.lookup')}
        </p>
      </div>
    );
  }

  // ── Unverified / claimed ─────────────────────────────────────────────────────
  const claimedOwner = state.kind === 'claimed' ? state.owner : null;
  const platformKey = platform.toLowerCase() as HandlePlatform;
  const platformLabel = PLATFORM_LABELS[platformKey] ?? platform;
  const prefix = PLATFORM_HANDLE_CONFIG[platformKey]?.prefix ?? '@';
  // Bare, non-normalized username (e.g. "MrBeast") for the platform-qualified
  // header `youtube/MrBeast`; `fullHandle` (@MrBeast) is used everywhere copy
  // refers to the creator by handle.
  const bare = bareUsername(platformKey, state.handle.username);
  const fullHandle = `${prefix}${bare}`;
  const headerHandle = `${platformKey}/${bare}`;
  const profileUrl = platformProfileUrl(platformKey, bare);
  // The "doesn't appear to have joined" line reads as a social @-mention
  // (@MrBeast, @pokimane) regardless of the platform's native prefix
  // (twitch.tv/, kick.com/ …) — the platform is already named in the header.
  const atHandle = `@${bare}`;

  const shareText = claimedOwner
    ? t('share.claimedText', { handle: fullHandle, platform: platformLabel, name: claimedOwner.display_name })
    : t('share.unverifiedText', { handle: fullHandle, platform: platformLabel });

  return (
    <div className="max-w-6xl mx-auto px-7 py-10">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Main column ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Profile card */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-8">
            <div className="flex items-start gap-5">
              {/* Owner avatar (claimed) or placeholder initial */}
              {claimedOwner?.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={normalizeAvatarUrl(claimedOwner.profile_picture)!}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover shrink-0 ring-1 ring-creator/40 select-none"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 select-none"
                  style={{ background: '#47DFD3', color: '#0a0a0a' }}
                >
                  {(claimedOwner?.display_name ?? state.handle.username).charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">

                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl font-display font-bold text-foreground break-all normal-case">{headerHandle}</h1>
                  {claimedOwner ? (
                    <Badge tone="good" lg>{t('badge.verified')}</Badge>
                  ) : (
                    <Badge tone="default" lg>{t('badge.unverified')}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted mb-3 flex items-center gap-2 flex-wrap">
                  {claimedOwner && (
                    <>
                      <span>{claimedOwner.display_name}</span>
                      <span aria-hidden>·</span>
                    </>
                  )}
                  {/* Inline external link to the creator's real platform profile. */}
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-creator hover:underline"
                  >
                    {t('viewOnPlatform', { platform: platformLabel })} <span aria-hidden>↗</span>
                  </a>
                </p>
                {claimedOwner ? (
                  // Verified owner, no creator page yet. No claim CTA here — the
                  // handle is taken, so claiming could only ever 422.
                  <p className="text-muted text-sm leading-relaxed">
                    {t.rich('claimed.verifiedBlurb', {
                      name: claimedOwner.display_name,
                      strong: (chunks) => <span className="text-foreground font-medium">{chunks}</span>,
                    })}
                  </p>
                ) : (
                  <>
                    <p className="text-muted text-sm leading-relaxed">
                      {t.rich('unverified.blurb', {
                        handle: atHandle,
                        mono: (chunks) => <span className="font-mono text-creator">{chunks}</span>,
                      })}
                    </p>

                    {/* "Is this you?" — self-claim CTA for the handle's real owner */}
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <Button variant="primary" size="sm" onClick={handleClaim} disabled={claiming}>
                        {claiming ? t('claim.claiming') : t('claim.cta')}
                      </Button>
                      <span className="text-xs text-muted">
                        {user
                          ? t('claim.helperLoggedIn')
                          : t('claim.helperLoggedOut')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="shrink-0 flex flex-col items-end gap-2">
                <ShareButton
                  path={`/${platform}/${handle}`}
                  title={fullHandle}
                  text={shareText}
                  size="sm"
                />
                {user && state.handle.id != null && (
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted/50 hover:text-bad transition-colors cursor-pointer"
                  >
                    {tReport('trigger.handle')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {state.handle.id != null && (
            <ReportModal
              open={reportOpen}
              onClose={() => setReportOpen(false)}
              subjectType="handle"
              subjectId={state.handle.id}
            />
          )}

          {/* Bounties */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground">
                {t('bounties.heading', { name: fullHandle })}
              </h2>
              {user && (
                <Link
                  href={`/bounties/new?platform=${encodeURIComponent(platform)}&handle=${encodeURIComponent(state.handle.username)}`}
                  className="text-sm bg-fan text-black font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  {t('bounties.newBounty')}
                </Link>
              )}
            </div>

            {state.bounties.length === 0 ? (
              <div className="text-center py-16 text-muted border border-border border-dashed rounded-xl">
                {t('bounties.emptyHandle')}{' '}
                {user ? (
                  <Link
                    href={`/bounties/new?platform=${encodeURIComponent(platform)}&handle=${encodeURIComponent(state.handle.username)}`}
                    className="text-fan hover:underline"
                  >
                    {t('bounties.createFirst')}
                  </Link>
                ) : (
                  <Link href={`/login?next=${encodeURIComponent(`/${platform}/${handle}`)}`} className="text-fan hover:underline">
                    {t('bounties.signInToStart')}
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
              {t('spreadWord.title')}
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              {claimedOwner ? (
                t.rich('spreadWord.claimedBody', {
                  handle: fullHandle,
                  mono: (chunks) => <span className="font-mono text-creator">{chunks}</span>,
                })
              ) : (
                t.rich('spreadWord.unverifiedBody', {
                  handle: fullHandle,
                  platform: platformLabel,
                  mono: (chunks) => <span className="font-mono text-creator">{chunks}</span>,
                })
              )}
            </p>
            <div className="flex justify-end">
              <ShareButton
                path={`/${platform}/${handle}`}
                title={fullHandle}
                text={shareText}
                size="md"
                label={t('spreadWord.shareLabel')}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
