import { ReactNode } from 'react';

type BadgeTone =
  | 'default' | 'solid' | 'warn' | 'good' | 'bad' | 'info' | 'role'
  | 'fan' | 'creator' | 'council'
  | 'pending' | 'clearing' | 'available';

interface BadgeProps {
  tone?: BadgeTone;
  lg?: boolean;
  className?: string;
  children: ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  default:   'bg-surface-2 text-muted border-border',
  solid:     'bg-foreground text-background border-foreground',
  warn:      'bg-warn-soft text-warn border-warn',
  good:      'bg-good-soft text-good border-good',
  bad:       'bg-bad-soft text-bad border-bad',
  info:      'bg-info-soft text-info border-info',
  role:      'border-[var(--color-role)] text-[var(--color-role)]',
  fan:       'bg-[#2d2208] text-fan border-fan',
  creator:   'bg-[#0a2220] text-creator border-creator',
  council:   'bg-[#0e1630] text-council border-council',
  pending:   'bg-warn-soft text-warn border-warn',
  clearing:  'bg-info-soft text-info border-info',
  available: 'bg-good-soft text-good border-good',
};

export function Badge({ tone = 'default', lg, className = '', children }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 border rounded-full font-mono uppercase tracking-wide whitespace-nowrap
        ${lg ? 'text-[11px] px-2.5 py-0.5' : 'text-[10px] px-2 py-px'}
        ${tone === 'role' ? 'bg-[var(--color-role-soft)]' : ''}
        ${toneClasses[tone]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
