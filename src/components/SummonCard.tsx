import Link from 'next/link';
import type { Summon } from '@/lib/types';

export default function SummonCard({ summon }: { summon: Summon }) {
  const isClaimed = !!summon.claimed_at;

  const hasStats =
    summon.projects_finished != null ||
    summon.projects_open != null ||
    summon.total_votive_sum != null;

  return (
    <Link
      href={`/summons/${summon.id}`}
      className="block bg-surface border border-border rounded-xl p-5 hover:border-creator/50 transition-colors group"
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        {summon.profile_picture ? (
          <img
            src={summon.profile_picture}
            alt={summon.display_name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: '#47DFD3', color: '#0a0a0a' }}
          >
            {summon.display_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <div className="font-semibold text-foreground group-hover:text-creator transition-colors truncate">
            {summon.display_name}
          </div>
          {isClaimed ? (
            <div className="text-xs text-creator">Answered ✓</div>
          ) : (
            <div className="text-xs text-muted">Unanswered</div>
          )}
        </div>
      </div>

      {summon.description && (
        <p className="text-sm text-muted line-clamp-2 mb-3">{summon.description}</p>
      )}

      {hasStats && (
        <div className="flex items-center gap-4 pt-3 border-t border-border text-xs text-muted flex-wrap">
          {summon.projects_finished != null && (
            <span>
              <span className="text-foreground font-medium">{summon.projects_finished}</span>{' '}
              completed
            </span>
          )}
          {summon.projects_open != null && (
            <span>
              <span className="text-foreground font-medium">{summon.projects_open}</span>{' '}
              open
            </span>
          )}
          {summon.total_votive_sum != null && Number(summon.total_votive_sum) > 0 && (
            <span className="ml-auto">
              <span className="text-brand font-semibold">
                ${Number(summon.total_votive_sum).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>{' '}
              summoned
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
