import { Fragment, ReactNode } from 'react';

interface TimelineItem {
  when: string;
  what: string | ReactNode;
  amount?: string;
  hint?: string;
  done?: boolean;
  current?: boolean;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="grid gap-0" style={{ gridTemplateColumns: 'auto 1fr' }}>
      {items.map((item, i) => (
        <Fragment key={i}>
          {/* Dot */}
          <div className="flex flex-col items-center">
            <div
              className={`w-3.5 h-3.5 rounded-full border-2 mt-1 z-10 flex-shrink-0 ${
                item.current
                  ? 'border-[var(--color-role)] bg-[var(--color-role)] shadow-[0_0_0_4px_var(--color-role-soft)]'
                  : item.done
                  ? 'border-[var(--color-role)] bg-[var(--color-role)]'
                  : 'border-border bg-surface'
              }`}
            />
            {/* Connector line */}
            {i < items.length - 1 && (
              <div
                className="w-0.5 flex-1 min-h-[30px] mt-1"
                style={{
                  background: `repeating-linear-gradient(to bottom, var(--color-border) 0 4px, transparent 4px 8px)`,
                }}
              />
            )}
          </div>

          {/* Content */}
          <div className={`pl-4 ${i < items.length - 1 ? 'pb-5' : ''}`}>
            <div className="font-mono text-[10px] tracking-widest uppercase text-muted">{item.when}</div>
            <div className="text-base text-foreground mt-0.5">{item.what}</div>
            {item.amount && <div className="font-mono text-sm text-muted/80 mt-0.5">{item.amount}</div>}
            {item.hint && <div className="font-mono text-[10px] uppercase tracking-wider text-muted/60 mt-1">{item.hint}</div>}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
