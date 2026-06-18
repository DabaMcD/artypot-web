'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { handles as handlesApi } from '@/lib/api';
import { normalizeAvatarUrl } from '@/lib/cloudinary';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Button } from '@/components/ui/Button';
import { SectionLabel } from '@/components/ui/Card';
import ShareButton from '@/components/ShareButton';
import { BountyStatusBadge } from '@/components/BountyStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { KNOWN_PLATFORMS } from '@/lib/platforms';
import { useMoney } from '@/lib/format';

/**
 * Universal handle page, keyed by numeric id: artypot.com/h/{id}.
 *
 * This is the home for 'other'-platform handles — whose identifier is a full
 * URL and so can't live in the /{platform}/{handle} path. Curated handles that
 * land here (e.g. a stale link) are redirected to their pretty
 * /{platform}/{username} URL; verified owners redirect to their creator slug.
 */

type SimpleBounty = { id: number; title: string; status: string; total_backed: string; created_at: string };

type OtherHandle = { id: number; platform: string; username: string; profile_url: string | null; status: string };
type Owner = { id: number; display_name: string; slug: string | null; profile_picture: string | null };

type ResolveResult =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  // Renders here only for 'other' handles. Curated/verified cases redirect away.
  | { kind: 'unverified'; handle: OtherHandle; bounties: SimpleBounty[] }
  | { kind: 'claimed'; handle: OtherHandle; owner: Owner; bounties: SimpleBounty[] };

/** The external URL for an 'other' handle (stored canonical URL → https://). */
function externalUrl(handle: OtherHandle): string {
  return handle.profile_url ?? `https://${handle.username.replace(/^\/+/, '')}`;
}

/** The bare domain, for a tidy "Visit {domain} ↗" label. */
function domainOf(handle: OtherHandle): string {
  return handle.username.split('/')[0] || handle.username;
}

// ── Mini bounty card (handle bounties aren't full Bounty objects) ──────────────

function HandleBountyCard({ bounty }: { bounty: SimpleBounty }) {
  const money = useMoney();
  return (
    <div className="relative bg-surface border border-border rounded-xl p-5 hover:border-fan/50 transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-3">
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
export default function HandleByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<ResolveResult>({ kind: 'loading' });
  const [claiming, setClaiming] = useState(false);
  const autoClaimFired = useRef(false);

  // "Is this you?" — create an unverified claim for the authenticated user,
  // then drop them onto the handles section to verify ownership. 'other' handles
  // claim by URL (admin review is the only verification route for them).
  const handleClaim = useCallback(async () => {
    if (state.kind !== 'unverified') return;
    if (!user) {
      const next = `/h/${id}?claim=1`;
      router.push(`/register?next=${encodeURIComponent(next)}`);
      return;
    }
    setClaiming(true);
    try {
      await handlesApi.store('other', externalUrl(state.handle));
      toast('Identity claimed — verify it below to confirm ownership.', 'success');
      const dest = user.role === 'creator' || user.role === 'council'
        ? '/c/handles'
        : '/become-creator';
      router.push(dest);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Could not claim this identity. Please try again.', 'error');
      setClaiming(false);
    }
  }, [state, user, router, id, toast]);

  // Resume a claim interrupted by the login round-trip (?claim=1 on return).
  useEffect(() => {
    if (autoClaimFired.current) return;
    if (state.kind !== 'unverified' || !user) return;
    if (new URLSearchParams(window.location.search).get('claim') !== '1') return;
    autoClaimFired.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleClaim();
  }, [state, user, handleClaim]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await handlesApi.page(id);
        if (cancelled) return;

        const platform = res.handle.platform;
        const username = res.handle.username;

        // Curated handle reached by id → send to its pretty canonical URL.
        if (KNOWN_PLATFORMS.has(platform) && !username.includes('/')) {
          router.replace(`/${platform}/${username}`);
          return;
        }

        // Verified owner with a creator page → their slug is canonical.
        if (res.match === 'verified' && res.owner?.slug) {
          router.replace(`/${res.owner.slug}`);
          return;
        }

        if (res.match === 'claimed' && res.owner) {
          setState({ kind: 'claimed', handle: res.handle, owner: res.owner, bounties: res.bounties });
          return;
        }

        setState({ kind: 'unverified', handle: res.handle, bounties: res.bounties });
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        setState({ kind: status === 404 ? 'not-found' : 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [id, router]);

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
  if (state.kind === 'not-found') {
    return (
      <div className="max-w-6xl mx-auto px-7 py-10 space-y-6">
        <div>
          <SectionLabel>handle</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">page not found</h1>
          <p className="text-sm text-muted mt-2">
            We don&apos;t recognize this handle. Browse creators or head home.
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
      <div className="max-w-6xl mx-auto px-7 py-10 space-y-6">
        <p className="text-sm text-bad">
          something went wrong looking that up. try again in a moment.
        </p>
      </div>
    );
  }

  // ── Unverified / claimed (an 'other' handle) ─────────────────────────────────
  const claimedOwner = state.kind === 'claimed' ? state.owner : null;
  const handle = state.handle;
  const url = externalUrl(handle);
  const domain = domainOf(handle);
  const sharePath = `/h/${handle.id}`;
  const shareText = claimedOwner
    ? `${handle.username} — ${claimedOwner.display_name} is on Artypot. Back a bounty for them!`
    : `${handle.username} — fans are queueing bounties for them on Artypot. Help get their attention!`;

  return (
    <div className="max-w-6xl mx-auto px-7 py-10">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Main column ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Profile card */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-8">
            <div className="flex items-start gap-5">
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
                  {(claimedOwner?.display_name ?? handle.username).charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl font-display font-bold text-foreground break-all">{handle.username}</h1>
                  {claimedOwner ? (
                    <Badge tone="good" lg>Verified</Badge>
                  ) : (
                    <Badge tone="default" lg>Unverified</Badge>
                  )}
                </div>
                <p className="text-sm text-muted mb-3">
                  {claimedOwner ? `${claimedOwner.display_name} · External link` : 'External link'}
                </p>

                {/* Visit the actual URL — the headline action for an 'other' handle */}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 text-sm bg-surface-2 border border-border hover:border-fan/50 text-foreground font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Visit {domain} <span aria-hidden>↗</span>
                </a>

                {claimedOwner ? (
                  <p className="text-muted text-sm leading-relaxed mt-4">
                    <span className="text-foreground font-medium">{claimedOwner.display_name}</span> has verified this
                    identity — bounties here already count toward them.
                  </p>
                ) : (
                  <>
                    <p className="text-muted text-sm leading-relaxed mt-4">
                      No one has claimed this identity on Artypot yet. If it&apos;s yours, claim it to receive the
                      bounties fans are queueing for you.
                    </p>
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <Button variant="primary" size="sm" onClick={handleClaim} disabled={claiming}>
                        {claiming ? 'Claiming…' : 'Is this you? Claim this identity →'}
                      </Button>
                      <span className="text-xs text-muted">
                        {user
                          ? 'We’ll add it to your account and walk you through verification.'
                          : 'Sign in to claim it as your own.'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="shrink-0">
                <ShareButton path={sharePath} title={handle.username} text={shareText} size="sm" />
              </div>
            </div>
          </div>

          {/* Bounties */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground break-all">
                Bounties for {handle.username}
              </h2>
              {user && (
                <Link
                  href={`/bounties/new?platform=other&handle=${encodeURIComponent(handle.username)}`}
                  className="text-sm bg-fan text-black font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shrink-0"
                >
                  + New Bounty
                </Link>
              )}
            </div>

            {state.bounties.length === 0 ? (
              <div className="text-center py-16 text-muted border border-border border-dashed rounded-xl">
                No bounties queued for this identity yet.{' '}
                {user ? (
                  <Link
                    href={`/bounties/new?platform=other&handle=${encodeURIComponent(handle.username)}`}
                    className="text-fan hover:underline"
                  >
                    Create the first one
                  </Link>
                ) : (
                  <Link href={`/login?next=${encodeURIComponent(sharePath)}`} className="text-fan hover:underline">
                    Sign in to start one
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
              Spread the word
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Help <span className="font-mono text-creator break-all">{handle.username}</span> discover their fans on
              Artypot. Share this page and tag them.
            </p>
            <div className="flex justify-end">
              <ShareButton path={sharePath} title={handle.username} text={shareText} size="md" label="Share & Tag" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
