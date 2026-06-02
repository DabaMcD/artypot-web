import Link from 'next/link';
import type { Bounty } from '@/lib/types';
import { formatPlatformHandle } from '@/lib/platforms';
import { AvatarOrUnknown } from './ui/AvatarOrUnknown';
import { BountyStatusBadge } from './BountyStatusBadge';
import ShareButton from './ShareButton';

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
            <AvatarOrUnknown
              avatarUrl={bounty.avatar_url ?? bounty.owner_user?.profile_picture ?? null}
              size="sm"
            />
            <div className="text-right min-w-0">
              <div className="text-xs text-muted">for</div>
              {bounty.owner_user ? (
                <div className="text-sm text-creator font-medium truncate max-w-[120px]">
                  {bounty.owner_user.display_name}
                </div>
              ) : bounty.target_handle ? (
                // No verified account owner — always surface the real handle so
                // a fan-supplied display_name can't masquerade as someone else.
                <div className="max-w-[140px]">
                  {bounty.display_name && (
                    <div className="text-sm text-creator font-medium truncate">{bounty.display_name}</div>
                  )}
                  <div className="flex items-center justify-end gap-1">
                    <span className={`font-mono truncate ${bounty.display_name ? 'text-[10px] text-muted' : 'text-sm text-creator font-medium'}`}>
                      {formatPlatformHandle(bounty.target_handle.platform, bounty.target_handle.username)}
                    </span>
                    {bounty.target_handle.status !== 'verified' && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted bg-surface-2 border border-border px-1 py-px rounded-full shrink-0">
                        unverified
                      </span>
                    )}
                  </div>
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
