import Link from 'next/link';
import type { Bounty, BountyStatus } from '@/lib/types';
import { AvatarOrUnknown } from './ui/AvatarOrUnknown';

const STATUS_STYLES: Record<BountyStatus, { label: string; className: string }> = {
  open:      { label: 'Open',           className: 'bg-green-900/40 text-green-400 border-green-800/50' },
  pending:   { label: 'Pending Review', className: 'bg-blue-900/40 text-blue-400 border-blue-800/50' },
  completed: { label: 'Completed',      className: 'bg-creator/10 text-creator border-creator/30' },
  paid_out:  { label: 'Paid Out',       className: 'bg-council/10 text-council border-council/30' },
  revoked:   { label: 'Revoked',        className: 'bg-red-900/40 text-red-400 border-red-800/50' },
};

export default function BountyCard({ bounty }: { bounty: Bounty }) {
  const status = STATUS_STYLES[bounty.status];
  const backerCount = bounty.pledges?.filter((v) => !v.revoked_at).length ?? null;
  const fanSingular = 'supporter';
  const fanPlural   = 'supporters';

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
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {bounty.description && (
        <p className="text-sm text-muted line-clamp-2 mb-4">{bounty.description}</p>
      )}

      <div className="flex items-end justify-between mt-auto pt-3 border-t border-border">
        <div>
          <div className="text-fan font-bold text-lg">
            ${Number(bounty.total_pledged).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {backerCount !== null && (
            <div className="text-xs text-muted mt-0.5">
              {backerCount} {backerCount === 1 ? fanSingular : fanPlural}
            </div>
          )}
          {(bounty.status === 'completed' || bounty.status === 'paid_out') && bounty.cleared_amount !== undefined && (
            <div className="text-xs text-muted mt-0.5">
              ${bounty.cleared_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${Number(bounty.total_pledged).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cleared
            </div>
          )}
        </div>
        {(bounty.avatar_url !== undefined || bounty.owner_user) && (
          <div className="flex items-center gap-2">
            <AvatarOrUnknown
              avatarUrl={bounty.avatar_url ?? bounty.owner_user?.profile_picture ?? null}
              size="sm"
            />
            <div className="text-right">
              <div className="text-xs text-muted">for</div>
              <div className="text-sm text-creator font-medium truncate max-w-[100px]">
                {bounty.target_display_name ?? bounty.owner_user?.display_name}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
