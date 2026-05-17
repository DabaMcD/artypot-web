'use client';

import { Badge } from './Badge';
import { BILLING_DAY } from '@/lib/config';

type BountyState = 'collecting' | 'creator-claimed' | 'submitted' | 'verified' | 'settled';

interface BountyCardData {
  id: string;
  title: string;
  targetHandle?: { platform: string; username: string };
  handleStatus?: 'verified' | 'unverified';
  state: BountyState;
  fundedTotal: number;
  contributors: number;
  yourPledge?: number;
}

interface BountyCardProps {
  b: BountyCardData;
  onClick?: () => void;
  hideTarget?: boolean;
}

const stateMap: Record<BountyState, { tone: 'default' | 'info' | 'warn' | 'pending' | 'good'; label: string }> = {
  'collecting':      { tone: 'default',  label: 'collecting' },
  'creator-claimed': { tone: 'info',     label: 'creator claimed' },
  'submitted':       { tone: 'warn',     label: 'submitted · council reviewing' },
  'verified':        { tone: 'pending',  label: `verified · bills on the ${BILLING_DAY}th` },
  'settled':         { tone: 'good',     label: 'settled' },
};

export function BountyCard({ b, onClick, hideTarget }: BountyCardProps) {
  const st = stateMap[b.state] ?? { tone: 'default' as const, label: b.state };
  return (
    <div
      className="ap-bounty-card flex gap-3.5 border border-border rounded-md p-4 bg-surface cursor-pointer transition-[transform,background,border-color] duration-100 hover:bg-surface-2"
      onClick={onClick}
    >
      {/* Placeholder thumb */}
      <div className="w-[70px] h-[70px] flex-shrink-0 rounded border border-dashed border-border bg-surface-2 flex items-center justify-center font-mono text-[10px] uppercase text-muted">
        ◇
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-[17px] text-foreground truncate">{b.title}</h4>
          <Badge tone={st.tone} className="flex-shrink-0">{st.label}</Badge>
        </div>

        {!hideTarget && b.targetHandle && (
          <div className="flex items-center gap-2 flex-wrap font-mono text-[11px] text-muted">
            <span>→ {b.targetHandle.platform} {b.targetHandle.username}</span>
            <span>·</span>
            <span>{b.contributors} backers</span>
            {b.handleStatus === 'unverified' && (
              <Badge tone="warn">unverified handle</Badge>
            )}
          </div>
        )}

        <div className="flex justify-between mt-2.5 font-mono text-[11px]">
          <span>
            <strong className="text-foreground">${b.fundedTotal.toLocaleString()}</strong>
            <span className="text-muted"> raised · {b.contributors} {b.contributors === 1 ? 'backer' : 'backers'}</span>
          </span>
          {b.yourPledge != null && (
            <span className="text-muted">your pledge ${b.yourPledge}</span>
          )}
        </div>
      </div>
    </div>
  );
}
