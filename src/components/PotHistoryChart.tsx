'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Customized,
} from 'recharts';
import type { PotHistoryEvent } from '@/lib/types';

interface Props {
  events: PotHistoryEvent[];
  onHover: (event: PotHistoryEvent | null) => void;
  onClickEdit: (event: PotHistoryEvent) => void;
}

// ── Colour palette ────────────────────────────────────────────────────────────
const MILESTONE_COLORS: Record<string, string> = {
  created:            '#F5A623', // brand gold
  details_edited:     '#3b82f6', // blue  — clickable
  privilege_transfer: '#8A2BE2', // council purple
  completed:          '#47DFD3', // creator teal
  approved:           '#22c55e', // green
};

const MILESTONE_TYPES = new Set([
  'created',
  'details_edited',
  'privilege_transfer',
  'completed',
  'approved',
]);

// ── Custom tooltip ────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  created:            '🌱 Pot created',
  votive_added:       '💰 Votive placed',
  votive_revoked:     '↩️ Votive revoked',
  details_edited:     '✏️ Details edited',
  privilege_transfer: '👑 Ownership transferred',
  completed:          '✅ Submitted',
  approved:           '🎉 Approved',
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { event: PotHistoryEvent } }> }) {
  if (!active || !payload?.length) return null;
  const { event } = payload[0].payload;

  const dateStr = new Date(event.at).toLocaleString('en-US', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-2.5 text-xs shadow-xl max-w-[200px]">
      <p className="text-foreground font-semibold mb-1">{TYPE_LABELS[event.type] ?? event.type}</p>
      {event.user && <p className="text-muted">{event.user.name}</p>}
      {event.amount != null && (
        <p className="text-brand font-semibold">${event.amount.toFixed(2)}</p>
      )}
      {event.old_value != null && event.field && (
        <p className="text-muted truncate">{event.field}: &ldquo;{event.old_value}&rdquo;</p>
      )}
      <p className="text-brand/80 mt-1 font-medium">
        ${event.running_total.toLocaleString('en-US', { minimumFractionDigits: 2 })} total
      </p>
      <p className="text-muted/60 mt-0.5">{dateStr}</p>
    </div>
  );
}

// ── Main chart component ──────────────────────────────────────────────────────
export default function PotHistoryChart({ events, onHover, onClickEdit }: Props) {
  const chartData = useMemo(
    () =>
      events.map((e) => ({
        ts:            new Date(e.at).getTime(),
        running_total: e.running_total,
        event:         e,
      })),
    [events],
  );

  const votiveAdded   = useMemo(() => events.filter((e) => e.type === 'votive_added'),   [events]);
  const votiveRevoked = useMemo(() => events.filter((e) => e.type === 'votive_revoked'), [events]);
  const milestones    = useMemo(() => events.filter((e) => MILESTONE_TYPES.has(e.type)), [events]);

  if (events.length === 0) {
    return <p className="text-muted text-sm">No history events yet.</p>;
  }

  // Ensure the area chart always shows a valid range on both axes
  const xDomain: [number, number] = [
    chartData[0].ts,
    chartData[chartData.length - 1].ts === chartData[0].ts
      ? chartData[0].ts + 1
      : chartData[chartData.length - 1].ts,
  ];

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-px bg-brand opacity-70" />
          Votive added
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-px bg-red-500 opacity-70" />
          Revoked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand inline-block" />
          Milestone
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          Edited
          <span className="text-muted/60">(click to view)</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          onMouseMove={(state: unknown) => {
            const s = state as { activePayload?: Array<{ payload?: { event?: PotHistoryEvent } }> } | undefined;
            const payload = s?.activePayload?.[0]?.payload;
            if (payload?.event) onHover(payload.event);
          }}
          onMouseLeave={() => onHover(null)}
        >
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={xDomain}
            hide
          />
          <YAxis
            dataKey="running_total"
            tickFormatter={(v: number) => `$${v}`}
            width={54}
            tick={{ fontSize: 10, fill: '#888' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#2a2a2a', strokeWidth: 1 }}
          />

          {/* Main area — step-after matches the discrete nature of votive changes */}
          <Area
            type="stepAfter"
            dataKey="running_total"
            stroke="#F5A623"
            fill="#F5A623"
            fillOpacity={0.07}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: '#F5A623', strokeWidth: 0 }}
            isAnimationActive={false}
          />

          {/* Vertical lines for votive additions */}
          {votiveAdded.map((e, i) => (
            <ReferenceLine
              key={`va-${i}`}
              x={new Date(e.at).getTime()}
              stroke="#F5A623"
              strokeOpacity={0.45}
              strokeDasharray="3 3"
            />
          ))}

          {/* Vertical lines for votive revocations */}
          {votiveRevoked.map((e, i) => (
            <ReferenceLine
              key={`vr-${i}`}
              x={new Date(e.at).getTime()}
              stroke="#ef4444"
              strokeOpacity={0.45}
              strokeDasharray="3 3"
            />
          ))}

          {/* Milestone dots — rendered via Customized so we get SVG pixel coords */}
          <Customized
            component={(props: Record<string, unknown>) => {
              // recharts passes xAxisMap/yAxisMap with d3 scale functions
              const xAxisMap = props.xAxisMap as Record<string, { scale: (v: number) => number }> | undefined;
              const yAxisMap = props.yAxisMap as Record<string, { scale: (v: number) => number }> | undefined;

              const xScale = xAxisMap?.['0']?.scale;
              const yScale = yAxisMap?.['0']?.scale;
              if (!xScale || !yScale) return null;

              return (
                <g>
                  {milestones.map((event, i) => {
                    const cx = xScale(new Date(event.at).getTime());
                    const cy = yScale(event.running_total);
                    const color = MILESTONE_COLORS[event.type] ?? '#888';
                    const clickable = event.type === 'details_edited';

                    return (
                      <g key={i}>
                        {/* Outer ring for visibility */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={7}
                          fill={color}
                          fillOpacity={0.18}
                          stroke="none"
                        />
                        {/* Inner dot */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4.5}
                          fill={color}
                          stroke="#0a0a0a"
                          strokeWidth={1.5}
                          style={{ cursor: clickable ? 'pointer' : 'default' }}
                          onClick={() => clickable && onClickEdit(event)}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
