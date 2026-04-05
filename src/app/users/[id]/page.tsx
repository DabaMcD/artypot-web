'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { users as usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PublicUser } from '@/lib/types';
import { COLORS } from '@/lib/theme';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatExpiry(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: authUser } = useAuth();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = Number(id);
  const isOwnProfile = authUser?.id === userId;

  useEffect(() => {
    setLoading(true);
    usersApi
      .get(userId)
      .then((res) => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('User not found.');
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <div className="bg-surface border border-border rounded-xl p-8">
          <p className="text-red-400 mb-4">{error || 'User not found.'}</p>
          <Link href="/" className="text-creator hover:underline text-sm">← Home</Link>
        </div>
      </div>
    );
  }

  const totalVotives = profile.votives.reduce((sum, v) => sum + Number(v.amount), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="shrink-0">
            {profile.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt={profile.name}
                className="w-16 h-16 rounded-full object-cover border border-border"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border border-border"
                style={{ background: COLORS.brand, color: '#0a0a0a' }}
              >
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
              {isOwnProfile && (
                <span className="text-xs bg-creator/20 text-creator px-2 py-0.5 rounded-full font-medium">
                  You
                </span>
              )}
            </div>
            <p className="text-sm text-muted mt-0.5">
              Member since {formatDate(profile.created_at)}
            </p>
            {isOwnProfile && (
              <Link
                href="/settings"
                className="inline-block mt-2 text-xs text-muted hover:text-foreground transition-colors"
              >
                Edit settings →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Votives */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-foreground">
              Top Votives
            </h2>
            {!profile.is_anonymous && profile.votives.length === 10 && (
              <p className="text-xs text-muted mt-0.5">Showing top 10 by amount</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {profile.votives.length > 0 && (
              <span className="text-sm text-muted">
                <span className="text-creator font-semibold">${totalVotives.toFixed(2)}</span>
              </span>
            )}
            {isOwnProfile && (
              <Link
                href="/votives"
                className="text-xs text-brand hover:underline"
              >
                View all →
              </Link>
            )}
          </div>
        </div>

        {profile.is_anonymous && !isOwnProfile ? (
          <p className="text-muted text-sm">This user has chosen to remain anonymous.</p>
        ) : profile.votives.length === 0 ? (
          <p className="text-muted text-sm">
            {isOwnProfile ? "You haven't placed any votives on open projects yet." : 'No active votives.'}
          </p>
        ) : (
          <div className="space-y-2">
            {profile.votives.map((votive) => (
              <div
                key={votive.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  {votive.pot ? (
                    <Link
                      href={`/pots/${votive.pot_id}`}
                      className="text-sm font-medium text-foreground hover:underline truncate block"
                    >
                      {votive.pot.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted">Project #{votive.pot_id}</span>
                  )}
                  {votive.expires_at && (
                    <p className="text-xs text-muted mt-0.5">
                      Expires {formatExpiry(votive.expires_at)}
                    </p>
                  )}
                </div>
                <span className="text-creator font-semibold text-sm ml-4">
                  ${Number(votive.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
