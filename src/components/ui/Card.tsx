import { ReactNode, CSSProperties } from 'react';

interface CardProps {
  title?: string;
  right?: ReactNode;
  dashed?: boolean;
  accent?: boolean;
  roleAccent?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Card({ title, right, dashed, accent, roleAccent, className = '', style, children }: CardProps) {
  const base = 'relative border rounded-md p-4 sm:p-5';
  const variant = dashed
    ? 'border-dashed border-border bg-transparent'
    : accent
    ? 'border-border bg-surface-2'
    : 'border-border bg-surface';

  return (
    <div
      className={`${base} ${variant} ${roleAccent ? 'ap-card-role-accent' : ''} ${className}`}
      style={style}
    >
      {title && (
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>{title}</SectionLabel>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
}

export function SectionLabel({ children, className = '' }: SectionLabelProps) {
  return (
    <div className={`ap-section-label-bar font-mono text-xs tracking-[2px] uppercase text-muted flex items-center ${className}`}>
      {children}
    </div>
  );
}
