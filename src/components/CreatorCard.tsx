import Link from 'next/link';
import type { Creator } from '@/lib/types';


export default function CreatorCard({ creator }: { creator: Creator }) {
  const isClaimed = !!creator.claimed_at;

  const hasStats =
    creator.projects_finished != null ||
    creator.projects_open != null ||
    creator.total_votive_sum != null;

  return (
    <div className="relative bg-surface border border-border rounded-xl p-5 hover:border-creator/50 transition-colors group">
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        {creator.profile_picture ? (
          <img
            src={creator.profile_picture}
            alt={creator.display_name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'var(--color-creator)', color: 'var(--color-brand-dark)' }}
          >
            {creator.display_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Stretched link title */}
          <div className="font-semibold text-foreground group-hover:text-creator transition-colors truncate">
            <Link
              href={`/creators/${creator.id}`}
              className="after:absolute after:inset-0 focus:outline-none"
            >
              {creator.display_name}
            </Link>
          </div>
          {isClaimed ? (
            <div className="text-xs text-creator">Answered ✓</div>
          ) : (
            <div className="text-xs text-muted">Unanswered</div>
          )}
        </div>

      </div>

      {creator.description && (
        <p className="text-sm text-muted line-clamp-2 mb-3">{creator.description}</p>
      )}

      {hasStats && (
        <div className="flex items-center gap-4 pt-3 border-t border-border text-xs text-muted flex-wrap">
          {creator.projects_finished != null && (
            <span>
              <span className="text-foreground font-medium">{creator.projects_finished}</span>{' '}
              completed
            </span>
          )}
          {creator.projects_open != null && (
            <span>
              <span className="text-foreground font-medium">{creator.projects_open}</span>{' '}
              open
            </span>
          )}
          {creator.total_votive_sum != null && Number(creator.total_votive_sum) > 0 && (
            <span className="ml-auto">
              <span className="text-fan font-semibold">
                ${Number(creator.total_votive_sum).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>{' '}
              backed
            </span>
          )}
        </div>
      )}
    </div>
  );
}
