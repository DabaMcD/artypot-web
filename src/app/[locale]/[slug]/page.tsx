'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { creators as creatorsApi, bounties as bountiesApi, following as followingApi } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { countryFlag, countryName } from '@/lib/countries';
import { useAuth } from '@/lib/auth-context';
import { useViewMode } from '@/lib/view-mode-context';
import type { Creator, PaginatedResponse, Bounty } from '@/lib/types';
import BountyCard from '@/components/BountyCard';
import ShareButton from '@/components/ShareButton';
import { SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';

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

        // Canonical-URL redirect: the slug resolved, but the URL may be a
        // case or separator variant of the creator's canonical slug
        // (e.g. /JaneDoe or /jane-doe → /jane_doe). Fold it to the stored
        // form so every variant settles on one canonical, lowercase URL.
        if (res.user.slug && res.user.slug !== slug) {
          router.replace(`/${res.user.slug}`);
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
            setIsFollowing(f.users.includes(creatorRes.data.id));
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

  const handleFollowToggle = async () => {
    if (!user || !creator) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followingApi.unfollow('user', creator.id);
        setIsFollowing(false);
        toast('Unfollowed.', 'success');
      } else {
        await followingApi.follow('user', creator.id);
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
  if (pageState === 'not-found') {
    return (
      <div className="max-w-6xl mx-auto px-7 py-10 space-y-6">
        <div>
          <SectionLabel>creator</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">no creator at /{slug}</h1>
          <p className="text-sm text-muted mt-2">
            This slug isn&apos;t taken yet. Browse other creators or head home.
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
  if (pageState === 'error' || !creator) {
    return (
      <div className="max-w-6xl mx-auto px-7 py-10 space-y-6">
        <p className="text-sm text-bad">
          something went wrong looking that up. try again in a moment.
        </p>
      </div>
    );
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  // In the new system every creator page belongs to a verified creator user —
  // the backend returns 404 for any slug that isn't an enabled creator. There
  // is no longer an "unverified creator profile" / claim concept; unverified
  // entities are Handles (separate system) not Creator pages.
  const socialLinks = SOCIAL_LINKS.filter(({ key }) => creator[key]);

  return (
    <div className="max-w-6xl mx-auto px-7 py-10">
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
                      text={`Support ${creator.display_name} on Artypot!`}
                      size="sm"
                    />
                    <Badge tone="creator" lg>Creator</Badge>
                  </div>

                  <p className="text-sm text-muted mb-2">
                    Supported by{' '}
                    <span className="text-foreground">{(creator.supporter_count ?? 0).toLocaleString()}</span>{' '}
                    <span className="text-foreground">
                      {creator.supporter_count === 1
                        ? (creator.fan_name ?? 'fan')
                        : (creator.fan_name_plural ?? creator.fan_name ?? 'fans')}
                    </span>
                  </p>

                  {creator.country_code && (
                    <p className="text-sm text-muted mb-2">
                      {countryFlag(creator.country_code)}{' '}
                      <span className="text-foreground">{countryName(creator.country_code)}</span>
                    </p>
                  )}

                  {creator.bio && (
                    <p className="text-muted text-sm leading-relaxed mt-2 whitespace-pre-wrap">{creator.bio}</p>
                  )}
                </div>

                {/* Action buttons — only visible in creator mode */}
                {isCreatorMode && (
                  <div className="shrink-0 flex flex-col gap-2 items-end">
                    {user && creator.can_edit && (
                      <Link
                        href="/c/settings"
                        className="bg-creator text-black text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Edit Profile
                      </Link>
                    )}
                  </div>
                )}

                {/* Follow button — shown to any logged-in user who isn't the creator */}
                {user && user.id !== creator.id && (
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
                {creator.total_backing_sum != null && (
                  <div>
                    <div className="text-fan font-semibold text-lg">
                      ${Number(creator.total_backing_sum).toLocaleString()}
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

            {/* Phase 1 US-only gate: this creator's country isn't supported yet, so any
                bounties placed for them can't be completed or paid out until we launch there. */}
            {creator.creator_market_open === false && (
              <Banner tone="warn">
                <div>
                  <strong className="text-foreground">Bounties for {creator.display_name} are on hold.</strong>{' '}
                  Artypot hasn&apos;t launched creator support in their country yet, so bounties can&apos;t be
                  completed or paid out for now. You can still follow along — we&apos;ll get going here as soon
                  as we expand.
                </div>
              </Banner>
            )}

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
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {bountiesData.data.map((bounty) => (
                      <BountyCard key={bounty.id} bounty={bounty} />
                    ))}
                  </div>
                  {(bountiesData.last_page ?? 1) > 1 && (
                    <div className="mt-4 text-right">
                      <Link
                        href={`/${creator.slug ?? slug}/bounties`}
                        className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
                      >
                        see all →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
  );
}
