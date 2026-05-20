import { BILLING_DAY } from '@/lib/config';

interface Balances {
  pending: number;
  clearing: number;
  available: number;
}

interface BalancePipelineProps {
  balances: Balances;
}

export function BalancePipeline({ balances }: BalancePipelineProps) {
  return (
    <div className="grid grid-cols-3 border border-border rounded-md overflow-hidden bg-surface">
      {/* Pending */}
      <div className="ap-pipe-pending p-4 sm:p-5 border-r border-border hover:bg-surface-2 transition-colors">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted mb-2">
          <span className="w-2 h-2 rounded-full bg-warn flex-shrink-0" />
          pending
        </div>
        <div className="font-mono font-medium text-xl text-foreground tabular-nums">
          ${balances.pending.toLocaleString()}
        </div>
        <div className="text-sm text-muted mt-1">verified by Council - bills on the {BILLING_DAY}th</div>
      </div>

      {/* Clearing */}
      <div className="ap-pipe-clearing p-4 sm:p-5 border-r border-border hover:bg-surface-2 transition-colors">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted mb-2">
          <span className="w-2 h-2 rounded-full bg-info flex-shrink-0" />
          clearing
        </div>
        <div className="font-mono font-medium text-xl text-foreground tabular-nums">
          ${balances.clearing.toLocaleString()}
        </div>
        <div className="text-sm text-muted mt-1">fans billed · 7-day clearing window</div>
      </div>

      {/* Available */}
      <div className="ap-pipe-available p-4 sm:p-5 hover:bg-surface-2 transition-colors">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted mb-2">
          <span className="w-2 h-2 rounded-full bg-good flex-shrink-0" />
          available
        </div>
        <div className="font-mono font-medium text-xl text-foreground tabular-nums">
          ${balances.available.toLocaleString()}
        </div>
        <div className="text-sm text-muted mt-1">withdraw to your bank (min $1)</div>
      </div>
    </div>
  );
}
