'use client';

import { Link } from '@/i18n/routing';
import type { CSSProperties } from 'react';
import type { Creator } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { trackSpotlight } from '@/lib/spotlight';

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function CreatorCard({ creator }: { creator: Creator }) {
  const hasStats =
    creator.supporter_count != null ||
    creator.projects_finished != null ||
    creator.projects_open != null ||
    creator.total_backing_sum != null;

  // Label the supporter stat with the creator's own fan-name when they've set
  // one ("12 parrotheads" beats "12 backers"); the stat cell truncates names
  // too long for the column, with the full term in the title tooltip.
  const supporterLabel =
    creator.supporter_count === 1
      ? creator.fan_name || 'backer'
      : creator.fan_name_plural || creator.fan_name || 'backers';

  return (
    <div
      onMouseMove={trackSpotlight}
      style={{ '--spot-color': 'var(--color-creator)' } as CSSProperties}
      className="relative flex flex-col h-full bg-surface border border-border rounded-xl p-5 transition-[transform,border-color,box-shadow] duration-150 hover:border-creator/25 hover:-translate-y-0.5 hover:shadow-soft group overflow-hidden"
    >
      {/* Static corner glow + cursor-tracking spotlight (border ring + faint
          interior glow following the pointer). */}
      <span
        aria-hidden
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-creator/10 blur-2xl pointer-events-none"
      />
      <span aria-hidden className="ap-spot-ring opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <span aria-hidden className="ap-spot-glow opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="flex items-center gap-3.5 mb-3">
        {/* Avatar */}
        {creator.profile_picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.profile_picture}
            alt={creator.display_name}
            className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-creator/40 ring-offset-2 ring-offset-surface"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 ring-2 ring-creator/40 ring-offset-2 ring-offset-surface"
            style={{ background: 'var(--color-creator)', color: 'var(--color-brand-dark)' }}
          >
            {creator.display_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Stretched link title */}
          <div className="font-semibold text-[15px] text-foreground group-hover:text-creator transition-colors truncate">
            <Link
              href={creator.slug ? `/${creator.slug}` : `/creators/${creator.id}`}
              className="after:absolute after:inset-0 after:rounded-xl focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-creator/60"
            >
              {creator.display_name}
            </Link>
          </div>
          <div className="mt-1 flex items-center gap-2 min-w-0">
            <Badge tone="creator">Creator</Badge>
            {creator.slug && (
              <span className="font-mono text-[11px] text-muted/70 truncate">/{creator.slug}</span>
            )}
          </div>
        </div>
      </div>

      {creator.description ? (
        <p className="text-sm text-muted line-clamp-2 mb-3">{creator.description}</p>
      ) : (
        // Keeps cards in a grid row at equal visual weight when a creator
        // hasn't written a description yet.
        <p className="text-sm text-muted/40 italic mb-3">No description yet.</p>
      )}

      {hasStats && (
        <div className="mt-auto grid grid-cols-4 gap-2 pt-3 border-t border-border/70">
          <CardStat
            value={creator.supporter_count != null ? String(creator.supporter_count) : '—'}
            label={supporterLabel}
          />
          <CardStat
            value={
              creator.total_backing_sum != null && Number(creator.total_backing_sum) > 0
                ? fmtMoney(Number(creator.total_backing_sum))
                : '—'
            }
            label="backed"
            accent
          />
          <CardStat
            value={creator.projects_open != null ? String(creator.projects_open) : '—'}
            label="open"
          />
          <CardStat
            value={creator.projects_finished != null ? String(creator.projects_finished) : '—'}
            label="completed"
          />
        </div>
      )}
    </div>
  );
}

function CardStat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className={`font-mono font-bold text-sm truncate ${accent && value !== '—' ? 'text-fan' : 'text-foreground'}`}>
        {value}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted/70 truncate" title={label}>{label}</div>
    </div>
  );
}
