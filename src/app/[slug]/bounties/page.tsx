'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { creators as creatorsApi, bounties as bountiesApi } from '@/lib/api';
import type { Bounty, BountyStatus, Creator, PaginatedResponse } from '@/lib/types';
import BountyCard from '@/components/BountyCard';
import { SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type FilterStatus = BountyStatus | '';

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paid Out', value: 'paid_out' },
];

export default function CreatorBountiesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [bountiesData, setBountiesData] = useState<PaginatedResponse<Bounty> | null>(null);
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);

  // Resolve the creator from the slug. Mirrors src/app/[slug]/page.tsx:244–261.
  useEffect(() => {
    let cancelled = false;
    setPageState('loading');
    (async () => {
      try {
        const res = await creatorsApi.bySlug(slug);
        if (cancelled) return;

        if (res.match === 'redirect') {
          router.replace(`/${res.current_slug}/bounties`);
          return;
        }

        // Canonical-URL redirect: fold case/separator variants of the slug
        // (/JaneDoe/bounties, /jane-doe/bounties) to the creator's stored
        // canonical, lowercase form so the URL settles on one address.
        if (res.user.slug && res.user.slug !== slug) {
          router.replace(`/${res.user.slug}/bounties`);
          return;
        }

        const userId = res.user.id;
        const creatorRes = await creatorsApi.get(userId);
        if (cancelled) return;

        setCreator(creatorRes.data);
        setPageState('ready');
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = (e as { message?: string }).message ?? '';
        if (msg.includes('404') || msg.includes('Not Found')) {
          setPageState('not_found');
        } else {
          setPageState('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [slug, router]);

  // Fetch bounties whenever the creator, filter, or page changes.
  const fetchBounties = useCallback(async (creatorUserId: number, filter: FilterStatus, p: number) => {
    setListLoading(true);
    try {
      const data = await bountiesApi.list({
        creator_id: creatorUserId,
        page: p,
        ...(filter ? { status: filter as BountyStatus } : {}),
      });
      setBountiesData(data);
    } catch {
      setBountiesData(null);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!creator?.id) return;
    fetchBounties(creator.id, statusFilter, page);
  }, [creator?.id, statusFilter, page, fetchBounties]);

  const handleFilterChange = (f: FilterStatus) => {
    setStatusFilter(f);
    setPage(1);
  };

  if (pageState === 'loading') {
    return (
      <div className="max-w-6xl mx-auto px-7 py-10 space-y-7">
        <div className="h-8 w-48 bg-surface animate-pulse rounded" />
        <div className="h-32 bg-surface animate-pulse rounded" />
      </div>
    );
  }

  if (pageState === 'not_found') {
    return (
      <div className="max-w-6xl mx-auto px-7 py-10 space-y-6">
        <div>
          <SectionLabel>not found</SectionLabel>
          <h1 className="font-display font-bold text-[28px] text-foreground mt-1">creator not found</h1>
        </div>
        <p className="text-sm text-muted">
          We couldn&apos;t find a creator with that handle.
        </p>
        <Link href="/" className="text-fan hover:underline text-sm">← back to home</Link>
      </div>
    );
  }

  if (pageState === 'error' || !creator) {
    return (
      <div className="max-w-6xl mx-auto px-7 py-10 space-y-6">
        <h1 className="font-display font-bold text-[28px] text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted">Couldn&apos;t load this creator&apos;s bounties.</p>
      </div>
    );
  }

  const bounties = bountiesData?.data ?? [];
  const lastPage = bountiesData?.last_page ?? 1;
  const emptyMessage = statusFilter
    ? `No ${FILTER_TABS.find((t) => t.value === statusFilter)?.label.toLowerCase()} bounties.`
    : 'No bounties yet for this creator.';

  return (
    <div className="max-w-6xl mx-auto px-7 py-10 space-y-7">
      <div>
        <h1 className="font-display font-bold text-[28px] text-foreground">bounties</h1>
        <Link
          href={`/${creator.slug ?? slug}`}
          className="text-sm font-mono text-muted hover:text-foreground cursor-pointer transition-colors mt-1 block"
        >
          ← {creator.display_name}
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleFilterChange(tab.value)}
            className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? 'bg-creator text-black border-creator font-semibold'
                : 'bg-surface border-border text-muted hover:border-creator/50 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {listLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-surface animate-pulse rounded-xl" />
          ))}
        </div>
      ) : bounties.length === 0 ? (
        <div className="text-center py-16 text-muted border border-border border-dashed rounded-xl">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {bounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="default"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || listLoading}
          >
            ← prev
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {page} / {lastPage}
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage || listLoading}
          >
            next →
          </Button>
        </div>
      )}
    </div>
  );
}
