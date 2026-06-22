'use client';

export interface PillOption {
  value: string;
  label: string;
  /** Optional result count shown after the label. */
  count?: number;
}

/**
 * A row of single-select filter/sort pills, shared by the /bounties and
 * /creators browse pages. When an option carries a `count`, it renders inline
 * after the label so each chip advertises how many results sit under it.
 */
export function Pills({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
              active
                ? 'bg-fan text-black border-fan font-semibold'
                : 'bg-surface border-border text-muted hover:border-fan/50 hover:text-foreground'
            }`}
          >
            {o.label}
            {o.count != null && (
              <span className={`ml-1.5 tabular-nums ${active ? 'text-black/60' : 'text-muted/60'}`}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A labelled control group: a small caption above a Pills row. */
export function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-widest text-muted/70 mb-1.5">{label}</div>
      {children}
    </div>
  );
}
