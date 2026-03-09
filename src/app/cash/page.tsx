'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { cash as cashApi } from '@/lib/api';
import type { SummonEarning } from '@/lib/types';

export default function CashPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState<SummonEarning[] | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role === 'mob') { router.push('/billing'); return; }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || user.role === 'mob') return;
    cashApi
      .summonEarnings()
      .then((res) => setEarnings(res.data))
      .catch(() => setError('Failed to load earnings.'))
      .finally(() => setEarningsLoading(false));
  }, [user]);

  // Auth / role loading skeleton
  if (loading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        <div className="h-8 w-40 bg-surface animate-pulse rounded" />
        <div className="h-28 bg-surface animate-pulse rounded-xl" />
        <div className="h-28 bg-surface animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Earnings</h1>
        <p className="text-muted text-sm">
          Your earnings from approved pots, grouped by project.
        </p>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {earningsLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-surface animate-pulse rounded-xl border border-border" />
          ))}
        </div>
      ) : earnings && earnings.length > 0 ? (
        <div className="space-y-4">
          {earnings.map((earning) => {
            const earnedPct = earning.total > 0 ? (earning.earned / earning.total) * 100 : 0;
            const statusLabel = earning.pot.status.replace('_', ' ');

            return (
              <div key={earning.pot.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <Link
                    href={`/pots/${earning.pot.id}`}
                    className="text-creator font-semibold hover:underline leading-snug"
                  >
                    {earning.pot.title}
                  </Link>
                  <span className="text-xs text-muted shrink-0 capitalize">{statusLabel}</span>
                </div>

                {/* Progress bar: earned of total */}
                <div className="h-1.5 bg-surface-2 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-creator rounded-full transition-all"
                    style={{ width: `${Math.min(earnedPct, 100)}%` }}
                  />
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      ${earning.earned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted">
                      of ${earning.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} potential
                    </p>
                  </div>
                  {earning.incoming > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-amber-400">
                        +${earning.incoming.toLocaleString('en-US', { minimumFractionDigits: 2 })} incoming
                      </p>
                      <p className="text-xs text-muted">gross, pre-fee estimate</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <p className="text-xs text-muted text-center pt-2">
            Incoming amounts are gross fan charges — your actual credit will be lower after Stripe and platform fees.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="text-muted text-sm">No pot earnings yet.</p>
          <p className="text-muted text-xs mt-2">
            Earnings appear here once a pot you own has been approved by the Council.
          </p>
        </div>
      )}
    </div>
  );
}
