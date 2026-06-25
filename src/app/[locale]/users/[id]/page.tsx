'use client';

import { useState, useEffect, use } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { users as usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useMoney, useDateFormats } from '@/lib/format';
import type { PublicUser } from '@/lib/types';
import { LastActiveStatus } from '@/components/LastActiveStatus';

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: authUser } = useAuth();
  const router = useRouter();
  const t = useTranslations('Profiles');
  const money = useMoney();
  const dateFmt = useDateFormats();

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
        // Creators have a public vanity URL — redirect there and keep the
        // skeleton up so the user page never flashes.
        if (res.data.slug) {
          router.replace(`/${res.data.slug}`);
          return;
        }
        setProfile(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError(t('errors.userNotFound'));
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
          <p className="text-red-400 mb-4">{error || t('errors.userNotFound')}</p>
          <Link href="/" className="text-creator hover:underline text-sm">← {t('nav.home')}</Link>
        </div>
      </div>
    );
  }

  // Use server-computed total (all active unrevoked backings) when available;
  // fall back to summing the displayed top-10 slice only if not present.
  const totalBackings = profile.total_backing_amount ?? profile.backings.reduce((sum, v) => sum + Number(v.amount), 0);

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
                alt={profile.display_name}
                className="w-16 h-16 rounded-full object-cover border border-border"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border border-border"
                style={{ background: 'var(--color-fan)', color: 'var(--color-brand-dark)' }}
              >
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{profile.display_name}</h1>
              {isOwnProfile && (
                <span className="text-xs bg-creator/20 text-creator px-2 py-0.5 rounded-full font-medium">
                  {t('header.youBadge')}
                </span>
              )}
            </div>
            {profile.created_at && (
              <p className="text-sm text-muted mt-0.5">
                {t('header.memberSince', { date: dateFmt.short(profile.created_at) })}
              </p>
            )}
            <LastActiveStatus
              lastActiveAt={profile.last_active_at}
              isOnline={profile.is_online}
              className="mt-1"
            />
            {isOwnProfile && (
              <>
                {' '}
                <Link
                  href="/settings"
                  className="inline-block mt-2 text-xs text-muted hover:text-foreground transition-colors"
                >
                  {t('header.editSettings')} →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Backings */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-foreground">
              {t('backings.title')}
            </h2>
            {!profile.is_anonymous && profile.backings.length === 10 && (
              <p className="text-xs text-muted mt-0.5">{t('backings.topTenNote')}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {profile.backings.length > 0 && (
              <span className="text-sm text-muted">
                <span className="text-creator font-semibold">{money(totalBackings)}</span>
              </span>
            )}
            {isOwnProfile && (
              <Link
                href="/backings"
                className="text-xs text-fan hover:underline"
              >
                {t('backings.viewAll')} →
              </Link>
            )}
          </div>
        </div>

        {profile.is_anonymous && !isOwnProfile ? (
          <p className="text-muted text-sm">{t('backings.anonymous')}</p>
        ) : profile.backings.length === 0 ? (
          <p className="text-muted text-sm">
            {isOwnProfile ? t('backings.emptyOwn') : t('backings.emptyOther')}
          </p>
        ) : (
          <div className="space-y-2">
            {profile.backings.map((backing) => (
              <div
                key={backing.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  {backing.bounty ? (
                    <Link
                      href={`/bounties/${backing.bounty_id}`}
                      className="text-sm font-medium text-foreground hover:underline truncate block"
                    >
                      {backing.bounty.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted">{t('backings.projectFallback', { id: backing.bounty_id })}</span>
                  )}
                  {backing.expires_at && (
                    <p className="text-xs text-muted mt-0.5">
                      {t('backings.expires', { date: dateFmt.short(backing.expires_at) })}
                    </p>
                  )}
                </div>
                <span className="text-creator font-semibold text-sm ml-4">
                  {money(Number(backing.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
