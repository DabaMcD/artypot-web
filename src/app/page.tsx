'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SummonSearchWidget from '@/components/SummonSearchWidget';
import type { Summon } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [selectedSummon, setSelectedSummon] = useState<Summon | null>(null);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 -mt-7">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3 leading-tight">
          Find a creator.
          <br />
          <span className="text-brand">Fund the work.</span>
        </h1>
        <p className="text-muted text-lg mb-8 leading-relaxed">
          Search for any creator, artist, or public figure — e.g. Mr Beast
        </p>

        <div className="w-full">
          <SummonSearchWidget
            selectedSummon={selectedSummon}
            onSelect={setSelectedSummon}
            onClear={() => setSelectedSummon(null)}
            placeholder="Search for a creator, artist, or public figure…"
          />

          {selectedSummon && (
            <button
              onClick={() => router.push(`/summons/${selectedSummon.id}`)}
              className="mt-3 w-full bg-brand text-black font-semibold py-3 rounded-lg hover:bg-brand-dim transition-colors text-sm"
            >
              See Pots →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
