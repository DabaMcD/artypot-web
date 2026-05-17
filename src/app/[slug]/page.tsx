'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { creators as creatorsApi } from '@/lib/api';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Public creator slug resolver — artypot.com/{slug}.
 *
 * - Live slug   → redirects to /creators/{user.id} (which renders the full profile).
 *   Once the profile is canonically slug-based, replace this redirect with an inline render.
 * - Historic slug → 301-style redirect to /{current_slug}.
 * - 404         → friendly "no such creator" panel.
 */
export default function CreatorSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'not-found' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await creatorsApi.bySlug(slug);
        if (cancelled) return;

        if (res.match === 'redirect') {
          // Old slug → bounce to current slug. router.replace so back button works.
          router.replace(`/${res.current_slug}`);
          return;
        }

        // res.match === 'current' → forward to the full profile page.
        router.replace(`/creators/${res.user.id}`);
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        setState(status === 404 ? 'not-found' : 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [slug, router]);

  if (state === 'loading') {
    return (
      <div className="pt-2">
        <Card>
          <div className="h-32 bg-surface-2 animate-pulse rounded" />
        </Card>
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="space-y-6 pt-2 max-w-xl">
        <div>
          <SectionLabel>creator</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">no creator at /{slug}</h1>
          <p className="font-display text-sm text-muted mt-2">
            this slug isn&apos;t taken yet. browse other creators or head home.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/creators"><Button variant="primary">browse creators</Button></Link>
          <Link href="/"><Button variant="ghost">← home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2 max-w-xl">
      <p className="font-display text-sm text-bad">
        something went wrong looking that up. try again in a moment.
      </p>
    </div>
  );
}
