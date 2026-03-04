import Link from 'next/link';
import type { Pot, PotStatus } from '@/lib/types';

const STATUS_STYLES: Record<PotStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-900/40 text-green-400 border-green-800/50' },
  completed: { label: 'Submitted', className: 'bg-blue-900/40 text-blue-400 border-blue-800/50' },
  approved: { label: 'Approved', className: 'bg-creator/10 text-creator border-creator/30' },
  paid_out: { label: 'Paid Out', className: 'bg-council/10 text-council border-council/30' },
  revoked: { label: 'Revoked', className: 'bg-red-900/40 text-red-400 border-red-800/50' },
};

export default function PotCard({ pot }: { pot: Pot }) {
  const status = STATUS_STYLES[pot.status];
  const backerCount = pot.bids?.filter((b) => !b.revoked_at).length ?? null;

  return (
    <Link
      href={`/pots/${pot.id}`}
      className="block bg-surface border border-border rounded-xl p-5 hover:border-brand/50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-foreground group-hover:text-brand transition-colors line-clamp-2 leading-snug">
          {pot.title}
        </h3>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {pot.description && (
        <p className="text-sm text-muted line-clamp-2 mb-4">{pot.description}</p>
      )}

      <div className="flex items-end justify-between mt-auto pt-3 border-t border-border">
        <div>
          <div className="text-brand font-bold text-lg">
            ${Number(pot.total_pledged).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {backerCount !== null && (
            <div className="text-xs text-muted mt-0.5">
              {backerCount} {backerCount === 1 ? 'backer' : 'backers'}
            </div>
          )}
        </div>
        {pot.summon && (
          <div className="text-right">
            <div className="text-xs text-muted">for</div>
            <div className="text-sm text-creator font-medium truncate max-w-[120px]">
              {pot.summon.display_name}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
