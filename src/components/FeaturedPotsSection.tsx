'use client';

import { useState, useEffect } from 'react';
import { featuredPots as featuredPotsApi } from '@/lib/api';
import PotCard from '@/components/PotCard';
import type { Pot } from '@/lib/types';

export default function FeaturedPotsSection() {
  const [pots, setPots] = useState<Pot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    featuredPotsApi
      .list()
      .then((res) => setPots(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Render nothing once loaded if there are no featured pots
  if (!loading && pots.length === 0) return null;

  return (
    <section className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-bold text-foreground mb-2">Open right now.</h2>
        <p className="text-muted mb-10">A few pots worth knowing about.</p>

        <div className="grid sm:grid-cols-3 gap-6">
          {loading
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 bg-surface border border-border rounded-xl animate-pulse"
                />
              ))
            : pots.map((pot) => <PotCard key={pot.id} pot={pot} />)}
        </div>
      </div>
    </section>
  );
}
