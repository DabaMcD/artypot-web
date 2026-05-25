'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { creators as creatorsApi, bounties as bountiesApi, following as followingApi } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { countryFlag, countryName } from '@/lib/countries';
import { useAuth } from '@/lib/auth-context';
import { useViewMode } from '@/lib/view-mode-context';
import type { Creator, PaginatedResponse, Bounty } from '@/lib/types';
import BountyCard from '@/components/BountyCard';
import ShareButton from '@/components/ShareButton';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const SOCIAL_LINKS: { key: keyof Creator; label: string; prefix: string }[] = [
  { key: 'youtube_handle',   label: 'YouTube',    prefix: 'https://youtube.com/@' },
  { key: 'twitter_handle',   label: 'X / Twitter', prefix: 'https://x.com/' },
  { key: 'tiktok_handle',    label: 'TikTok',     prefix: 'https://tiktok.com/@' },
  { key: 'instagram_handle', label: 'Instagram',  prefix: 'https://instagram.com/' },
  { key: 'soundcloud_url',   label: 'SoundCloud', prefix: '' },
  { key: 'bandcamp_url',     label: 'Bandcamp',   prefix: '' },
  { key: 'wikipedia_url',    label: 'Wikipedia',  prefix: '' },
  { key: 'domain',           label: 'Website',    prefix: '' },
];

function fmt(n: number | null | undefined) {
  return `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Herald gate modal ─────────────────────────────────────────────────────────
function HeraldGateModal({
  creator,
  userName,
  onClose,
}: {
  creator: Creator;
  userName: string;
  onClose: () => void;
}) {
  const heraldName  = creator.herald?.display_name ?? 'The current Herald';
  const heraldTotal = Number(creator.herald_total_pledge ?? 0);
  const userTotal   = Number(creator.user_aged_pledge_total ?? 0);
  const deficit     = Math.max(0, heraldTotal - userTotal);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Herald Protected</h2>
            <p className="text-xs text-muted mt-0.5">{creator.display_name}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors text-xl leading-none mt-0.5">✕</button>
        </div>

        <p className="text-sm text-muted leading-relaxed mb-5">
          {creator.herald?.id ? (
            <Link href={`/users/${creator.herald.id}`} onClick={onClose} className="text-fan font-semibold hover:underline">
              {heraldName}
            </Link>
          ) : (
            <span className="text-fan font-semibold">{heraldName}</span>
          )}{' '}
          is the current Herald for this unclaimed profile. The Herald is the top backer who earns
          the right to keep this profile up to date. To take the edit seat, the total amount you&apos;ve
          committed (24+ hours old) must exceed theirs.
        </p>

        <div className="bg-surface-2 border border-border rounded-xl overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-creator uppercase tracking-wider">Herald</span>
              {creator.herald?.id ? (
                <Link href={`/users/${creator.herald.id}`} onClick={onClose} className="text-sm font-medium text-foreground hover:underline">
                  {heraldName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-foreground">{heraldName}</span>
              )}
            </div>
            <span className="text-sm font-bold text-fan">{fmt(heraldTotal)}*</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">You</span>
              <span className="text-sm font-medium text-foreground">{userName}</span>
            </div>
            <span className={`text-sm font-bold ${userTotal > 0 ? 'text-foreground' : 'text-muted'}`}>
              {fmt(userTotal)}
              <span className="text-xs text-muted font-normal ml-1">(24h+)</span>
            </span>
          </div>
        </div>

        {deficit > 0 && (
          <p className="text-xs text-muted text-center mb-3">
            You need{' '}
            <span className="text-foreground font-semibold">{fmt(deficit)} more</span>
            {' '}committed (aged over 24 hours) to take the Herald seat.
          </p>
        )}

        <p className="text-xs text-muted/60 mb-5">
          * {heraldName}&apos;s qualifying total is recorded at the time of their last edit to{' '}
          {creator.display_name}&apos;s profile.
        </p>

        <Link
          href={`/bounties?creator_id=${creator.id}`}
          onClick={onClose}
          className="block w-full text-center bg-fan text-black font-semibold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          View bounties to back →
        </Link>
      </div>
    </div>
  );
}

// ── Claim confirmation modal ───────────────────────────────────────────────────
function ClaimModal({
  creator,
  onClose,
  onSuccess,
}: {
  creator: Creator;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactInfo.trim().length < 10) {
      setError('Please provide a bit more detail (at least 10 characters).');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await creatorsApi.claim(creator.id, contactInfo.trim());
      onSuccess();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Claim this Profile</h2>
            <p className="text-xs text-muted mt-0.5">{creator.display_name}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors text-xl leading-none mt-0.5">✕</button>
        </div>

        <p className="text-sm text-muted leading-relaxed mb-5">
          The council will review your claim and verify your identity before approving. Let us know
          the best way to contact or verify you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              How can the council verify your identity?
            </label>
            <textarea
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="e.g. My YouTube channel is linked on this page. You can also reach me at manager@example.com or DM @myhandle on X."
              rows={4}
              maxLength={1000}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-creator/60 resize-none"
            />
            <p className="text-xs text-muted mt-1 text-right">{contactInfo.length}/1000</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-foreground text-sm font-medium py-2.5 rounded-lg hover:border-foreground/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || contactInfo.trim().length < 10}
              className="flex-1 bg-creator text-black text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreatorSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { mode } = useViewMode();
  const isCreatorMode = mode === 'creator';

  const [creator, setCreator] = useState<Creator | null>(null);
  const [bountiesData, setBountiesData] = useState<PaginatedResponse<Bounty> | null>(null);
  const [pageState, setPageState] = useState<'loading' | 'not-found' | 'error' | 'ready'>('loading');
  const [showHeraldModal, setShowHeraldModal] = useState(false);

  // Claim state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPageState('loading');
    (async () => {
      try {
        const res = await creatorsApi.bySlug(slug);
        if (cancelled) return;

        if (res.match === 'redirect') {
          router.replace(`/${res.current_slug}`);
          return;
        }

        // res.match === 'current' — load full profile data
        const userId = res.user.id;
        const [creatorRes, bountiesRes] = await Promise.all([
          creatorsApi.get(userId),
          bountiesApi.list({ creator_id: userId }),
        ]);
        if (cancelled) return;

        setCreator(creatorRes.data);
        setBountiesData(bountiesRes);
        setPageState('ready');

        // Load following state for logged-in users
        if (user) {
          followingApi.index().then((f) => {
            if (cancelled) return;
            setIsFollowing(f.users.includes(creatorRes.data.user_id ?? -1));
          }).catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        setPageState(status === 404 ? 'not-found' : 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [slug, router]);

  const handleEditClick = () => {
    if (!creator) return;
    if (creator.can_edit) {
      router.push(`/${slug}/edit`);
    } else {
      setShowHeraldModal(true);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !creator) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followingApi.unfollow('user', creator.user_id!);
        setIsFollowing(false);
        toast('Unfollowed.', 'success');
      } else {
        await followingApi.follow('user', creator.user_id!);
        setIsFollowing(true);
        toast('Following!', 'success');
      }
    } catch {
      toast('Failed to update follow status.', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
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
  if (pageState === 'not-found') {
    return (
      <div className="space-y-6 pt-2 max-w-xl">
        <div>
          <SectionLabel>creator</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">no creator at /{slug}</h1>
          <p className="text-sm text-muted mt-2">
            This slug isn&apos;t taken yet. Browse other creators or head home.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/creators"><Button variant="primary">Browse Creators</Button></Link>
          <Link href="/"><Button variant="ghost">← Home</Button></Link>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (pageState === 'error' || !creator) {
    return (
      <div className="space-y-6 pt-2 max-w-xl">
        <p className="text-sm text-bad">
          something went wrong looking that up. try again in a moment.
        </p>
      </div>
    );
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  // In the new system every creator page belongs to a verified creator user —
  // the backend returns 404 for any slug that isn't an enabled creator.
  // There is no longer an "unclaimed creator profile" concept; unverified
  // entities are Handles (separate system) not Creator pages.
  const isClaimed = true;
  const canClaim  = false;
  const isOwner   = user && creator.user_id === user.id;
  const isHerald  = user && creator.herald_user_id === user.id;
  const socialLinks = SOCIAL_LINKS.filter(({ key }) => creator[key]);

  return (
    <>
      {showHeraldModal && user && (
        <HeraldGateModal
          creator={creator}
          userName={user.display_name}
          onClose={() => setShowHeraldModal(false)}
        />
      )}
      {showClaimModal && creator && (
        <ClaimModal
          creator={creator}
          onClose={() => setShowClaimModal(false)}
          onSuccess={() => { setShowClaimModal(false); setClaimSuccess(true); }}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Main column ────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-surface border border-border rounded-xl p-6 mb-8">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                {creator.profile_picture ? (
                  <img
                    src={creator.profile_picture}
                    alt={creator.display_name}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                    style={{ background: '#47DFD3', color: '#0a0a0a' }}
                  >
                    {creator.display_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="text-2xl font-display font-bold text-foreground normal-case">{creator.display_name}</h1>
                    <ShareButton
                      path={`/${slug}`}
                      title={creator.display_name}
                      text={`Support ${creator.display_name} on artypot!`}
                      size="sm"
                    />
                    {isClaimed ? (
                      <span className="text-xs font-medium bg-creator/10 text-creator border border-creator/30 px-2 py-0.5 rounded-full">
                        Verified Creator
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-surface-2 text-muted border border-border px-2 py-0.5 rounded-full">
                        Unclaimed
                      </span>
                    )}
                  </div>

                  {creator.fan_name && (
                    <p className="text-sm text-muted mb-2">
                      Fans called:{' '}
                      <span className="text-foreground">{creator.fan_name_plural ?? creator.fan_name}</span>
                    </p>
                  )}

                  {creator.country_code && (
                    <p className="text-sm text-muted mb-2">
                      {countryFlag(creator.country_code)}{' '}
                      <span className="text-foreground">{countryName(creator.country_code)}</span>
                    </p>
                  )}

                  {creator.description && (
                    <p className="text-muted text-sm leading-relaxed mt-2">{creator.description}</p>
                  )}
                </div>

                {/* Action buttons — only visible in creator mode */}
                {isCreatorMode && (
                  <div className="shrink-0 flex flex-col gap-2 items-end">
                    {user && !isClaimed && (
                      <button
                        onClick={handleEditClick}
                        className="bg-creator text-black text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Edit Profile
                      </button>
                    )}
                    {user && isClaimed && creator.can_edit && (
                      <Link
                        href={`/${slug}/edit`}
                        className="bg-creator text-black text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Edit Profile
                      </Link>
                    )}
                  </div>
                )}

                {/* Follow button — shown to any logged-in user who isn't the creator */}
                {user && user.id !== (creator.user_id ?? -1) && (
                  <div className="shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                    >
                      {followLoading ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                  </div>
                )}

                {canClaim && !claimSuccess && (
                  <div className="shrink-0">
                    <button
                      onClick={() => setShowClaimModal(true)}
                      className="bg-surface-2 border border-creator/40 text-creator text-sm font-semibold px-4 py-2 rounded-lg hover:border-creator transition-colors"
                    >
                      Claim this profile
                    </button>
                  </div>
                )}
                {claimSuccess && (
                  <p className="text-creator text-sm shrink-0">Claim submitted! The council will review it shortly.</p>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-border text-sm">
                {creator.projects_open != null && (
                  <div>
                    <div className="text-foreground font-semibold text-lg">{creator.projects_open}</div>
                    <div className="text-muted text-xs">Open bounties</div>
                  </div>
                )}
                {creator.projects_finished != null && (
                  <div>
                    <div className="text-foreground font-semibold text-lg">{creator.projects_finished}</div>
                    <div className="text-muted text-xs">Completed</div>
                  </div>
                )}
                {creator.amount_earned != null && (
                  <div>
                    <div className="text-fan font-semibold text-lg">
                      ${Number(creator.amount_earned).toLocaleString()}
                    </div>
                    <div className="text-muted text-xs">Total earned</div>
                  </div>
                )}
                {creator.total_pledge_sum != null && (
                  <div>
                    <div className="text-fan font-semibold text-lg">
                      ${Number(creator.total_pledge_sum).toLocaleString()}
                    </div>
                    <div className="text-muted text-xs">Active backing</div>
                  </div>
                )}
              </div>

              {/* Social links */}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {socialLinks.map(({ key, label, prefix }) => {
                    const handle = creator[key] as string;
                    return (
                      <a
                        key={key}
                        href={`${prefix}${handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted border border-border rounded-full px-3 py-1 hover:border-creator/50 hover:text-creator transition-colors"
                      >
                        {label}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bounties */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-foreground">Bounties for {creator.display_name}</h2>
                {user && (
                  <Link
                    href={`/bounties/new?creator_id=${creator.id}`}
                    className="text-sm bg-fan text-black font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    + New Bounty
                  </Link>
                )}
              </div>

              {!bountiesData || bountiesData.data.length === 0 ? (
                <div className="text-center py-16 text-muted border border-border border-dashed rounded-xl">
                  No bounties yet for this creator.{' '}
                  {user && (
                    <Link href={`/bounties/new?creator_id=${creator.id}`} className="text-fan hover:underline">
                      Create the first one
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {bountiesData.data.map((bounty) => (
                    <BountyCard key={bounty.id} bounty={bounty} />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
