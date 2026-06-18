'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { featuredBounties as featuredBountiesApi } from '@/lib/api';
import BountyCard from '@/components/BountyCard';
import type { Bounty } from '@/lib/types';

export default function FeaturedBountiesSection() {
  const t = useTranslations('FeaturedBounties');
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    featuredBountiesApi
      .list()
      .then((res) => setBounties(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Render nothing once loaded if there are no featured bounties
  if (!loading && bounties.length === 0) return null;

  return (
    <section className="border-t border-border">
      <div className="max-w-6xl mx-auto px-7 py-20">
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">{t('heading')}</h2>
        <p className="text-muted mb-10">{t('subheading')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 bg-surface border border-border rounded-xl animate-pulse"
                />
              ))
            : bounties.map((bounty) => <BountyCard key={bounty.id} bounty={bounty} />)}
        </div>
      </div>
    </section>
  );
}
