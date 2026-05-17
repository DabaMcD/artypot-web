import { ReactNode } from 'react';

type BannerTone = 'default' | 'warn' | 'bad' | 'good';

interface BannerProps {
  tone?: BannerTone;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

const toneClasses: Record<BannerTone, string> = {
  default: 'bg-surface border-info border-l-info',
  warn:    'bg-warn-soft border-warn border-l-warn',
  bad:     'bg-bad-soft  border-bad  border-l-bad',
  good:    'bg-good-soft border-good border-l-good',
};

export function Banner({ tone = 'default', children, action, className = '' }: BannerProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border rounded-md px-4 py-3 mb-5 ${toneClasses[tone]} ${className}`}
    >
      <div className="flex-1 text-base text-foreground">{children}</div>
      {action}
    </div>
  );
}
