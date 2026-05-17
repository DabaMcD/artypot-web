'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { creators as creatorsApi } from '@/lib/api';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Empty } from '@/components/ui/Empty';
import { useToast } from '@/lib/toast-context';
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

const PLATFORM_LABELS: Record<HandlePlatform, string> = {
  twitter:   'X / Twitter',
  youtube:   'YouTube',
  instagram: 'Instagram',
  tiktok:    'TikTok',
  twitch:    'Twitch',
  bluesky:   'Bluesky',
};

const KNOWN_PLATFORMS = new Set<string>(['twitter', 'youtube', 'instagram', 'tiktok', 'twitch', 'bluesky']);

type ResolveResult =
  | { kind: 'loading' }
  | { kind: 'not-platform' }
  | { kind: 'unclaimed'; handle: { id: number | null; platform: string; username: string }; bounties: Array<{ id: number; title: string; status: string; total_pledged: string; created_at: string }> }
  | { kind: 'error' };

export default function PlatformHandlePage({ params }: { params: Promise<{ slug: string; handle: string }> }) {
  const { slug: platform, handle } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<ResolveResult>({ kind: 'loading' });

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

        if (res.match === 'claimed') {
          router.replace(`/${res.user.slug}`);
          return;
        }

        setState({ kind: 'unclaimed', handle: res.handle, bounties: res.bounties });
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        setState({ kind: status === 404 ? 'not-platform' : 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [platform, handle, router]);

  // ── Render branches ────────────────────────────────────────────────────────

  if (state.kind === 'loading') {
    return (
      <div className="pt-2 space-y-4">
        <Card><div className="h-24 bg-surface-2 animate-pulse rounded" /></Card>
        <Card><div className="h-40 bg-surface-2 animate-pulse rounded" /></Card>
      </div>
    );
  }

  if (state.kind === 'not-platform') {
    return (
      <div className="space-y-6 pt-2 max-w-xl">
        <h1 className="font-display font-bold text-[28px] text-foreground">page not found</h1>
        <p className="font-display text-sm text-muted">
          we don&apos;t recognize this URL. browse creators or head home.
        </p>
        <div className="flex gap-3">
          <Link href="/creators"><Button variant="primary">browse creators</Button></Link>
          <Link href="/"><Button variant="ghost">← home</Button></Link>
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="pt-2">
        <Banner tone="bad">something went wrong looking that up. try again in a moment.</Banner>
      </div>
    );
  }

  // Unclaimed ─────────────────────────────────────────────────────────────────
  const platformKey = platform.toLowerCase() as HandlePlatform;
  const platformLabel = PLATFORM_LABELS[platformKey] ?? platform;
  const prefix = PLATFORM_HANDLE_CONFIG[platformKey]?.prefix ?? '@';
  const fullHandle = `${prefix}${state.handle.username}`;

  const shareUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://artypot.com/${platform}/${handle}`;
  const shareText = `${fullHandle} on ${platformLabel} — fans are queueing bounties for them on Artypot. Help get their attention!`;

  const handleShare = async () => {
    if (typeof navigator === 'undefined') return;
    try {
      const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
      if (typeof nav.share === 'function') {
        await nav.share({ title: `tag ${fullHandle}`, text: shareText, url: shareUrl });
        return;
      }
      await nav.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast('Share link copied to clipboard.', 'success');
    } catch {
      // user cancelled — silent
    }
  };

  return (
    <div className="space-y-6 pt-2 max-w-2xl">
      {/* Header */}
      <div>
        <SectionLabel>{platformLabel}</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1 break-all">{fullHandle}</h1>
      </div>

      {/* Not-joined banner with share CTA */}
      <Card>
        <p className="font-display text-base text-foreground leading-relaxed">
          <span className="font-mono text-creator">{fullHandle}</span> doesn&apos;t appear to have joined Artypot yet.
          That can change with your help! Tag them on social media to let them know there are fans queueing bounties.
        </p>
        <div className="mt-4 flex gap-3 flex-wrap">
          <Button variant="primary" onClick={handleShare}>share & tag →</Button>
        </div>
      </Card>

      {/* Bounty list */}
      <div>
        <h2 className="font-display font-bold text-lg text-foreground mb-3">
          bounties queued for {fullHandle} <span className="font-mono text-xs text-muted">{state.bounties.length}</span>
        </h2>
        {state.bounties.length === 0 ? (
          <Card>
            <Empty>no bounties queued for this handle yet — be the first to start one!</Empty>
            <div className="mt-3">
              <Link href={`/bounties/new?platform=${encodeURIComponent(platform)}&handle=${encodeURIComponent(state.handle.username)}`}>
                <Button variant="default" size="sm">+ start a bounty</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border -mx-5 -my-4">
              {state.bounties.map((b) => (
                <li key={b.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/bounties/${b.id}`} className="font-display font-medium text-foreground hover:underline">
                      {b.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge tone={b.status === 'open' ? 'default' : 'warn'}>{b.status}</Badge>
                      <span className="font-mono text-[10px] text-muted">${b.total_pledged} pledged</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
