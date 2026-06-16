import { Badge } from '@/components/ui/Badge';
import SpotCard from '@/components/about/SpotCard';

interface MockBountyCardProps {
  caption: string;
  amount: string;
  backers: string[];
  /** Overflow chip text for backers beyond the visible initials, e.g. '+209'. */
  overflow?: string;
  backerCount: string;
  grown?: boolean;
}

/** A believable, hand-rolled bounty card — pure JSX, no data fetch. */
function MockBountyCard({ caption, amount, backers, overflow, backerCount, grown }: MockBountyCardProps) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted mb-2">{caption}</p>
      <SpotCard
        spotColor="var(--color-fan)"
        className={`border-border bg-surface p-5 ${grown ? 'rotate-1' : '-rotate-1'}`}
      >
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <p className="font-semibold text-foreground leading-snug">
            Play the first album live, front to back
          </p>
          <Badge tone="fan" className="mt-0.5 shrink-0">open</Badge>
        </div>
        <p className="text-sm text-muted mb-5">
          for <span className="text-creator">@yourfavoriteband</span>
        </p>
        <div className="flex items-end justify-between gap-3 pt-4 border-t border-border/70">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted mb-1">in the pot</p>
            <p className={`font-mono font-bold text-fan ${grown ? 'text-2xl sm:text-3xl' : 'text-2xl'}`}>{amount}</p>
          </div>
          <div className="text-right shrink-0">
            <div aria-hidden className="flex justify-end mb-1.5">
              {backers.map((initials) => (
                <span
                  key={initials}
                  className="w-7 h-7 shrink-0 -ml-2 first:ml-0 rounded-full bg-surface-2 border-2 border-surface flex items-center justify-center font-mono text-[10px] text-muted"
                >
                  {initials}
                </span>
              ))}
              {overflow && (
                <span className="h-7 min-w-7 px-1.5 shrink-0 -ml-2 rounded-full bg-fan border-2 border-surface flex items-center justify-center font-mono text-[10px] font-bold text-brand-dark">
                  {overflow}
                </span>
              )}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">{backerCount}</p>
          </div>
        </div>
      </SpotCard>
    </div>
  );
}

/**
 * The product object this page keeps describing, shown instead of described:
 * the same mock bounty twice — a small pot, then the pot a month later.
 */
export default function BountyGrowthDemo() {
  return (
    <div className="w-full max-w-md mx-auto lg:mx-0">
      <MockBountyCard
        caption="week one"
        amount="$45.00"
        backers={['KT', 'DM', 'JR']}
        backerCount="3 backers"
      />

      <div className="flex flex-col items-center py-1">
        <span aria-hidden className="h-5 w-px border-l border-dashed border-border" />
        <p className="font-mono text-[10px] uppercase tracking-[2px] text-fan py-1.5">
          211 strangers chip in
        </p>
        <span aria-hidden className="h-5 w-px border-l border-dashed border-border" />
      </div>

      {/* Three initials + overflow chip keeps the footer's min-content width
          inside a 360px viewport (page gutters + card padding leave ~264px). */}
      <MockBountyCard
        grown
        caption="week five"
        amount="$10,240.00"
        backers={['KT', 'DM', 'JR']}
        overflow="+211"
        backerCount="214 backers"
      />
    </div>
  );
}
