interface PipelineStage {
  label: string;
  amount: string;
  sub: string;
  isActive?: boolean;
  loading?: boolean;
}

interface EarningsPipelineProps {
  stages: PipelineStage[];
  loading?: boolean;
}

export default function EarningsPipeline({ stages, loading }: EarningsPipelineProps) {
  return (
    <div>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="flex overflow-x-auto">
          {stages.map((stage, i) => (
            <div
              key={i}
              className={`flex-1 min-w-[120px] p-3 md:p-4 border-r border-border last:border-r-0 ${
                stage.isActive ? 'bg-creator/5 border-t-2 border-t-creator' : ''
              }`}
            >
              <div className="text-xs text-muted uppercase tracking-wider mb-1">{stage.label}</div>
              {loading || stage.loading ? (
                <div className="h-6 w-20 bg-surface-2 animate-pulse rounded mb-0.5" />
              ) : (
                <div className="text-lg md:text-xl font-bold font-mono tabular-nums text-foreground">
                  {stage.amount}
                </div>
              )}
              <div className="text-xs text-muted mt-0.5">{stage.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted mt-2">
        Contributions flow left &rarr; right. Council approval moves funds to Pending Payment. The 24th moves them into Clearing. 7 days later they&apos;re available to withdraw.
      </p>
    </div>
  );
}
