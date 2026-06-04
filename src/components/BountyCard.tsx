import Link from 'next/link';
import type { Bounty } from '@/lib/types';
import { formatPlatformHandle } from '@/lib/platforms';
import { AvatarOrUnknown } from './ui/AvatarOrUnknown';
import { BountyStatusBadge } from './BountyStatusBadge';
import ShareButton from './ShareButton';

/**
 * Renders an identity string that may wrap. If it contains a "/", the preferred
 * wrap point is right after the *first* slash so platform-qualified handles
 * break cleanly onto two lines (e.g. "youtube/" + "@mrbeast", or
 * "wikipedia.org/" + "wiki/Brad_Pitt") instead of mid-word. `break-words` is the
 * fallback for any single segment that's still too wide for the card.
 */
function WrappableName({ text, className = '' }: { text: string; className?: string }) {
  const slash = text.indexOf('/');
  if (slash === -1) {
    return <span className={`break-words ${className}`}>{text}</span>;
  }
  return (
    <span className={`break-words ${className}`}>
      {text.slice(0, slash + 1)}
      <wbr />
      {text.slice(slash + 1)}
    </span>
  );
}

export default function BountyCard({ bounty }: { bounty: Bounty }) {
  const backerCount = bounty.backings?.filter((v) => !v.revoked_at).length ?? null;
  const fanSingular = bounty.owner_user?.fan_name || 'supporter';
  const fanPlural   = bounty.owner_user?.fan_name_plural || bounty.owner_user?.fan_name || 'supporters';

  return (
    <div className="relative bg-surface border border-border rounded-xl p-5 hover:border-fan/50 transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Stretched link title — ::after pseudo-element covers the whole card */}
        <h3 className="font-semibold text-foreground group-hover:text-fan transition-colors line-clamp-2 leading-snug">
          <Link
            href={`/bounties/${bounty.id}`}
            className="after:absolute after:inset-0 focus:outline-none"
          >
            {bounty.title}
          </Link>
        </h3>
        {/* relative z-10 lifts these above the stretched-link ::after overlay */}
        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
          <ShareButton path={`/bounties/${bounty.id}`} title={bounty.title} />
          <BountyStatusBadge status={bounty.status} />
        </div>
      </div>

      {bounty.description && (
        <p className="text-sm text-muted line-clamp-2 mb-4">{bounty.description}</p>
      )}

      <div className="flex items-end justify-between mt-auto pt-3 border-t border-border">
        <div>
          <div className="text-fan font-bold text-lg">
            ${Number(bounty.total_backed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {backerCount !== null && (
            <div className="text-xs text-muted mt-0.5">
              {backerCount} {backerCount === 1 ? fanSingular : fanPlural}
            </div>
          )}
          {(bounty.status === 'completed' || bounty.status === 'paid_out') && bounty.cleared_amount !== undefined && (
            <div className="text-xs text-muted mt-0.5">
              ${bounty.cleared_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${Number(bounty.total_backed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cleared
            </div>
          )}
        </div>
        {(bounty.avatar_url !== undefined || bounty.owner_user) && (
          <div className="flex items-center gap-2">
            {bounty.owner_user ? (
              // Registered creator: real picture if they have one, otherwise their
              // initial on the creator-colored chip. The "?" placeholder is only
              // for unclaimed handles (the branch below), never a real account.
              bounty.owner_user.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bounty.owner_user.profile_picture}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'var(--color-creator)', color: 'var(--color-brand-dark)' }}
                >
                  {bounty.owner_user.display_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )
            ) : (
              <AvatarOrUnknown avatarUrl={bounty.avatar_url ?? null} size="sm" />
            )}
            <div className="text-right min-w-0">
              <div className="text-xs text-muted">for</div>
              {bounty.owner_user ? (
                <div className="text-sm text-creator font-medium truncate max-w-[120px]">
                  {bounty.owner_user.display_name}
                </div>
              ) : bounty.target_handle ? (
                // No verified account owner — the platform-qualified handle is
                // the only trustworthy identity, so it leads. A fan-supplied
                // display_name is secondary and can't masquerade as someone else.
                <div className="max-w-[150px]">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-mono text-sm text-creator font-medium truncate">
                      {bounty.target_handle.platform === 'other'
                        ? formatPlatformHandle(bounty.target_handle.platform, bounty.target_handle.username)
                        : `${bounty.target_handle.platform}/${formatPlatformHandle(bounty.target_handle.platform, bounty.target_handle.username)}`}
                    </span>
                  </div>
                  {bounty.display_name && (
                    <div className="text-[11px] text-muted truncate">({bounty.display_name})</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-creator font-medium truncate max-w-[120px]">
                  {bounty.display_name}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
