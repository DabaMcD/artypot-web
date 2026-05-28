'use client';

import type { ReactNode } from 'react';
import type { BountyHistoryEvent } from '@/lib/types';

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
  pledge_added:       { label: 'Backed',                amountSign: 'pos'   },
  pledge_updated:     { label: 'Updated contribution',  amountSign: 'delta' },
  pledge_revoked:     { label: 'Left',                  amountSign: 'neg'   },
  details_edited:     { label: 'Details edited',        amountSign: 'none'  },
  privilege_transfer: { label: 'Ownership transferred', amountSign: 'none'  },
  pending:            { label: 'Submitted for review',  amountSign: 'none'  },
  completed:          { label: 'Approved',              amountSign: 'none'  },
};

// Clicking these event types snaps the header to the historical state
const CLICKABLE_TYPES = new Set<string>(['created', 'details_edited']);

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

        // Render `pledge_updated` as a stacked pair: −$old above +$new.
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

        return (
          <li
            key={i}
            onClick={() => {
              if (!clickable) return;
              onSelect(isSelected ? null : event);
            }}
            className={[
              'group grid grid-cols-[1fr_auto] items-baseline gap-x-4 px-3 py-2.5 transition-colors',
              clickable ? 'cursor-pointer hover:bg-surface-2' : 'cursor-default',
              isSelected ? 'bg-fan/5' : '',
            ].filter(Boolean).join(' ')}
          >
            {/* Left: label + user + (edit field, if any) */}
            <div className="min-w-0">
              <div className="flex items-baseline gap-x-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground">
                  {meta.label}
                </span>
                {event.user && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60 truncate">
                    {event.user.display_name}
                  </span>
                )}
              </div>
              {event.field != null && event.old_value != null && (
                <p className="font-mono text-[10px] text-muted/60 mt-1 truncate">
                  {event.field}: &ldquo;{event.old_value}&rdquo;
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
