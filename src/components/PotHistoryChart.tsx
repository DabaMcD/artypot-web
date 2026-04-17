'use client';

import type { PotHistoryEvent } from '@/lib/types';

interface Props {
  events: PotHistoryEvent[];
  selectedEvent: PotHistoryEvent | null;
  onSelect: (event: PotHistoryEvent | null) => void;
}

const EVENT_META: Record<string, { label: string; icon: string; colorClass: string }> = {
  created:            { label: 'Pot initialized',        icon: '🌱', colorClass: 'text-fan' },
  votive_added:       { label: 'Backed',                  icon: '💰', colorClass: 'text-green-400' },
  votive_revoked:     { label: 'Backed out',             icon: '↩️',  colorClass: 'text-red-400' },
  details_edited:     { label: 'Details edited',         icon: '✏️',  colorClass: 'text-blue-400' },
  privilege_transfer: { label: 'Ownership transferred',  icon: '👑', colorClass: 'text-council' },
  completed:          { label: 'Submitted for approval', icon: '✅', colorClass: 'text-creator' },
  approved:           { label: 'Approved by Council',    icon: '🎉', colorClass: 'text-green-400' },
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

export default function PotHistoryChart({ events, selectedEvent, onSelect }: Props) {
  if (events.length === 0) {
    return <p className="text-muted text-sm">No history yet.</p>;
  }

  return (
    <div className="space-y-0.5">
      {events.map((event, i) => {
        const meta     = EVENT_META[event.type] ?? { label: event.type, icon: '·', colorClass: 'text-muted' };
        const clickable = CLICKABLE_TYPES.has(event.type);
        // Identity match on type + timestamp (events are unique by these two)
        const isSelected =
          selectedEvent?.at === event.at && selectedEvent?.type === event.type;

        return (
          <div
            key={i}
            onClick={() => {
              if (!clickable) return;
              onSelect(isSelected ? null : event);
            }}
            className={[
              'flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors',
              clickable ? 'cursor-pointer hover:bg-surface-2' : 'cursor-default',
              isSelected ? 'bg-fan/5 ring-1 ring-inset ring-fan/25' : '',
            ].filter(Boolean).join(' ')}
          >
            {/* Icon */}
            <span className="text-sm mt-0.5 shrink-0 w-5 text-center leading-none">
              {meta.icon}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline flex-wrap gap-x-2">
                <span className={`text-sm font-medium ${meta.colorClass}`}>
                  {meta.label}
                </span>
                {event.user && (
                  <span className="text-xs text-muted">{event.user.name}</span>
                )}
                {event.amount != null && (
                  <span className="text-xs text-fan font-semibold ml-auto shrink-0">
                    ${event.amount.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Extra detail row for edits */}
              {event.field != null && event.old_value != null && (
                <p className="text-xs text-muted/60 mt-0.5 truncate">
                  {event.field}: &ldquo;{event.old_value}&rdquo;
                </p>
              )}

              {/* Timestamp + click hint */}
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-muted/50">{formatDate(event.at)}</p>
                {clickable && (
                  <p className={`text-xs shrink-0 ${isSelected ? 'text-fan/60' : 'text-muted/40'}`}>
                    {isSelected ? '● viewing' : 'click to view'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
