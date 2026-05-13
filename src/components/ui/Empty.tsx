import { ReactNode } from 'react';

interface EmptyProps {
  title?: string;
  message?: string;
  icon?: string;
  children?: ReactNode;
  className?: string;
}

export function Empty({ title, message, icon, children, className = '' }: EmptyProps) {
  return (
    <div
      className={`text-center py-14 px-5 border border-dashed border-border rounded-md bg-surface text-muted font-display ${className}`}
    >
      {icon && <div className="font-mono text-2xl text-muted/40 mb-3">{icon}</div>}
      {(title || message) && <div className="text-base text-foreground mb-3">{title ?? message}</div>}
      {children}
    </div>
  );
}
