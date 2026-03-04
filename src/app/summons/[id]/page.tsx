'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { summons as summonsApi, pots as potsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Summon, PaginatedResponse, Pot } from '@/lib/types';
import PotCard from '@/components/PotCard';

const SOCIAL_LINKS: { key: keyof Summon; label: string; prefix: string }[] = [
  { key: 'youtube_handle', label: 'YouTube', prefix: 'https://youtube.com/@' },
  { key: 'twitter_handle', label: 'X / Twitter', prefix: 'https://x.com/' },
  { key: 'tiktok_handle', label: 'TikTok', prefix: 'https://tiktok.com/@' },
  { key: 'instagram_handle', label: 'Instagram', prefix: 'https://instagram.com/' },
  { key: 'soundcloud_handle', label: 'SoundCloud', prefix: 'https://soundcloud.com/' },
  { key: 'bandcamp_handle', label: 'Bandcamp', prefix: 'https://' },
  { key: 'domain', label: 'Website', prefix: 'https://' },
];

export default function SummonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  const [summon, setSummon] = useState<Summon | null>(null);
  const [potsData, setPotsData] = useState<PaginatedResponse<Pot> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      summonsApi.get(Number(id)),
      potsApi.list({ summon_id: Number(id) }),
    ])
      .then(([summonRes, potsRes]) => {
        setSummon(summonRes.data);
        setPotsData(potsRes);
      })
      .catch(() => setError('Failed to load creator profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleClaim = async () => {
    if (!summon) return;
    setClaiming(true);
    setClaimError('');
    try {
      await summonsApi.claim(summon.id);
      setClaimSuccess(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setClaimError(e.message ?? 'Failed to submit claim.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-32 bg-surface border border-border rounded-xl animate-pulse mb-6" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summon) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 text-red-400">
        {error || 'Creator not found.'}
      </div>
    );
  }

  const isClaimed = !!summon.claimed_at;
  const canClaim = user && !isClaimed && user.role !== 'council' && !user.summon;

  const socialLinks = SOCIAL_LINKS.filter(({ key }) => summon[key]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <div className="flex items-start gap-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: '#47DFD3', color: '#0a0a0a' }}
          >
            {summon.display_name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-foreground">{summon.display_name}</h1>
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

            {summon.fan_name && (
              <p className="text-sm text-muted mb-2">
                Fans called:{' '}
                <span className="text-foreground">{summon.fan_name_plural ?? summon.fan_name}</span>
              </p>
            )}

            {summon.description && (
              <p className="text-muted text-sm leading-relaxed mt-2">{summon.description}</p>
            )}
          </div>

          <div className="shrink-0">
            {canClaim && !claimSuccess && (
              <div>
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="bg-creator text-black text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {claiming ? 'Submitting…' : 'Claim this profile'}
                </button>
                {claimError && <p className="text-red-400 text-xs mt-1">{claimError}</p>}
              </div>
            )}
            {claimSuccess && (
              <p className="text-creator text-sm">
                Claim submitted! The council will review it shortly.
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-border text-sm">
          {summon.projects_finished != null && (
            <div>
              <div className="text-foreground font-semibold text-lg">{summon.projects_finished}</div>
              <div className="text-muted text-xs">Completed</div>
            </div>
          )}
          {summon.projects_open != null && (
            <div>
              <div className="text-foreground font-semibold text-lg">{summon.projects_open}</div>
              <div className="text-muted text-xs">Open pots</div>
            </div>
          )}
          {summon.amount_earned != null && (
            <div>
              <div className="text-brand font-semibold text-lg">
                ${Number(summon.amount_earned).toLocaleString()}
              </div>
              <div className="text-muted text-xs">Total earned</div>
            </div>
          )}
        </div>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {socialLinks.map(({ key, label, prefix }) => {
              const handle = summon[key] as string;
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

      {/* Pots */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">Pots for {summon.display_name}</h2>
          {user && (
            <Link
              href={`/pots/new?summon_id=${summon.id}`}
              className="text-sm bg-brand text-black font-semibold px-4 py-2 rounded-lg hover:bg-brand-dim transition-colors"
            >
              + New Pot
            </Link>
          )}
        </div>

        {!potsData || potsData.data.length === 0 ? (
          <div className="text-center py-16 text-muted border border-border border-dashed rounded-xl">
            No pots yet for this creator.{' '}
            {user && (
              <Link href={`/pots/new?summon_id=${summon.id}`} className="text-brand hover:underline">
                Create the first one
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {potsData.data.map((pot) => (
              <PotCard key={pot.id} pot={pot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
