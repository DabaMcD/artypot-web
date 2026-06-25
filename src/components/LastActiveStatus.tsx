'use client';

import { useTranslations } from 'next-intl';
import { useDateFormats } from '@/lib/format';

interface LastActiveStatusProps {
  /** ISO timestamp of the user's last recorded activity. */
  lastActiveAt?: string | null;
  /** Server-computed: true when within the presence window. */
  isOnline?: boolean | null;
  className?: string;
}

/**
 * Public-profile presence indicator. Shows a green "currently active" dot when
 * the user is within the server-side presence window, otherwise a muted
 * "active {time ago}". Renders nothing when there's no activity data — e.g.
 * anonymous users, whose presence the API withholds.
 *
 * The relative phrase reuses the CommentSection.timeAgo strings so it stays
 * localized across every locale (including eo and en-x-brainrot, which aren't
 * real Intl locales — hence no Intl.RelativeTimeFormat here).
 */
export function LastActiveStatus({ lastActiveAt, isOnline, className = '' }: LastActiveStatusProps) {
  const t = useTranslations('Profiles');
  const ta = useTranslations('CommentSection');
  const dateFmt = useDateFormats();

  if (isOnline) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-good ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-good" aria-hidden="true" />
        {t('activity.activeNow')}
      </span>
    );
  }

  if (!lastActiveAt) return null;

  const seconds = Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 1000);
  let ago: string;
  if (seconds < 60) ago = ta('timeAgo.justNow');
  else if (seconds < 3600) ago = ta('timeAgo.minutes', { count: Math.floor(seconds / 60) });
  else if (seconds < 86400) ago = ta('timeAgo.hours', { count: Math.floor(seconds / 3600) });
  else if (seconds < 2592000) ago = ta('timeAgo.days', { count: Math.floor(seconds / 86400) });
  else ago = dateFmt.short(lastActiveAt);

  return (
    <span className={`text-xs text-muted ${className}`}>
      {t('activity.lastActive', { time: ago })}
    </span>
  );
}
