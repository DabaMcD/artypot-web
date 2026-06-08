'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { BountyHistoryEvent } from '@/lib/types';
import { normalizeAvatarUrl } from '@/lib/cloudinary';

interface Props {
  events: BountyHistoryEvent[];
  selectedEvent: BountyHistoryEvent | null;
  onSelect: (event: BountyHistoryEvent | null) => void;
}

/**
 * Visual metadata per event type. `amountSign` controls the amount column:
 *   'pos'    → `+$x.xx`
 *   'neg'    → `−$x.xx`
 *   'delta'  → two stacked lines: `−$old` over `+$new`
 *   'none'   → suppressed
 */
const EVENT_META: Record<
  string,
  { label: string; amountSign: 'pos' | 'neg' | 'delta' | 'none' }
> = {
  created:            { label: 'Initialized',           amountSign: 'pos'   },
  backing_added:       { label: 'Backed',                amountSign: 'pos'   },
  backing_updated:     { label: 'Synced their feelings', amountSign: 'delta' },
  backing_revoked:     { label: 'Left',                  amountSign: 'neg'   },
  details_edited:     { label: 'Edited details',        amountSign: 'none'  },
  privilege_transfer: { label: 'Transferred ownership', amountSign: 'none'  },
  creator_assigned:   { label: 'Verified & claimed',    amountSign: 'none'  },
  pending:            { label: 'Submitted for review',  amountSign: 'none'  },
  completed:          { label: 'Approved',              amountSign: 'none'  },
};

// Clicking these event types snaps the header to the historical state
const CLICKABLE_TYPES = new Set<string>(['created', 'details_edited']);

// Friendly labels for edited fields; falls back to the raw field name.
const FIELD_LABELS: Record<string, string> = {
  title: 'title',
  description: 'description',
  display_name: 'creator display name',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function BountyHistoryChart({ events, selectedEvent, onSelect }: Props) {
  if (events.length === 0) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted/60">
        No history yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/60 border-y border-border/60">
      {events.map((event, i) => {
        const meta      = EVENT_META[event.type] ?? { label: event.type, amountSign: 'none' as const };
        const clickable = CLICKABLE_TYPES.has(event.type);
        // Identity match on type + timestamp (events are unique by these two)
        const isSelected =
          selectedEvent?.at === event.at && selectedEvent?.type === event.type;

        // Render `backing_updated` as a stacked pair: −$old above +$new.
        // Other types render a single signed amount in the right column.
        let amountNode: ReactNode = null;
        if (meta.amountSign === 'delta' && event.amount != null && event.old_amount != null) {
          amountNode = (
            <div className="flex flex-col items-end leading-tight">
              <span className="font-mono text-sm font-semibold tabular-nums text-bad">
                −${event.old_amount.toFixed(2)}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-fan">
                +${event.amount.toFixed(2)}
              </span>
            </div>
          );
        } else if (event.amount != null && meta.amountSign !== 'none') {
          const sign = meta.amountSign === 'neg' ? '−' : '+';
          const cls  = meta.amountSign === 'neg' ? 'text-bad' : 'text-fan';
          amountNode = (
            <span className={`font-mono text-sm font-semibold tabular-nums ${cls}`}>
              {sign}${event.amount.toFixed(2)}
            </span>
          );
        }

        // Avatar: linked to the user's profile when known, anonymous-safe.
        // event.user.id === 0 indicates a masked anonymous user.
        const u           = event.user ?? null;
        const isAnon      = !!u && u.id === 0;
        const hasProfile  = !!u && !isAnon;
        const avatarSrc   = hasProfile ? normalizeAvatarUrl(u!.profile_picture ?? null) : null;
        const initial     = u?.display_name?.charAt(0).toUpperCase() ?? '·';

        const avatarInner = avatarSrc ? (
          <img
            src={avatarSrc}
            alt={u!.display_name}
            className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shrink-0 border border-border"
            style={
              hasProfile
                ? { background: '#F5A623', color: '#0a0a0a' }
                : { background: 'var(--surface-2)', color: 'var(--muted)' }
            }
          >
            {hasProfile ? initial : '·'}
          </div>
        );

        const avatarNode = hasProfile ? (
          <Link
            href={`/users/${u!.id}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 hover:opacity-80 transition-opacity"
            aria-label={u!.display_name}
          >
            {avatarInner}
          </Link>
        ) : (
          <div className="shrink-0">{avatarInner}</div>
        );

        return (
          <li
            key={i}
            onClick={() => {
              if (!clickable) return;
              onSelect(isSelected ? null : event);
            }}
            className={[
              'group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 px-3 py-2.5 transition-colors',
              clickable ? 'cursor-pointer hover:bg-surface-2' : 'cursor-default',
              isSelected ? 'bg-fan/5' : '',
            ].filter(Boolean).join(' ')}
          >
            {/* Left: avatar */}
            {avatarNode}

            {/* Middle: label + user + (edit field, if any) */}
            <div className="min-w-0 self-center">
              <div className="flex items-baseline gap-x-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground">
                  {u && (
                    hasProfile ? (
                      <Link
                        href={`/users/${u.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted/70 hover:text-foreground hover:underline"
                      >
                        {u.display_name}
                      </Link>
                    ) : (
                      <span className="text-muted/60">{u.display_name}</span>
                    )
                  )}
                  {u && ' '}{meta.label}
                </span>
              </div>
              {event.field != null && event.old_value != null && (
                <p className="font-mono text-[10px] text-muted/60 mt-1 truncate">
                  {FIELD_LABELS[event.field] ?? event.field}: &ldquo;{event.old_value}&rdquo;
                </p>
              )}
              {event.type === 'creator_assigned' && event.meta != null && (
                <p className="font-mono text-[10px] text-muted/60 mt-1 truncate">
                  originally{' '}
                  {typeof event.meta.handle_username === 'string' && (
                    <span className="text-muted/80">
                      {String(event.meta.handle_username)}
                      {typeof event.meta.handle_platform === 'string'
                        ? ` on ${String(event.meta.handle_platform)}`
                        : ''}
                    </span>
                  )}
                  {typeof event.meta.display_name === 'string' && event.meta.display_name && (
                    <> &middot; &ldquo;{String(event.meta.display_name)}&rdquo;</>
                  )}
                </p>
              )}
              <p className="font-mono text-[10px] text-muted/50 tabular-nums mt-1">
                {formatDate(event.at)}
                {clickable && (
                  <span className={`ml-2 uppercase tracking-widest ${isSelected ? 'text-fan/70' : 'text-muted/40 group-hover:text-muted/70'}`}>
                    {isSelected ? '● viewing' : 'click to view'}
                  </span>
                )}
              </p>
            </div>

            {/* Right: amount */}
            {amountNode && <div className="shrink-0">{amountNode}</div>}
          </li>
        );
      })}
    </ul>
  );
}
