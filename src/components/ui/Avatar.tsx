import { CSSProperties } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  initials?: string;
  src?: string;
  size?: AvatarSize;
  style?: CSSProperties;
  className?: string;
}

const sizeClasses: Record<AvatarSize, { wrapper: string; text: string }> = {
  sm: { wrapper: 'w-7 h-7',   text: 'text-xs' },
  md: { wrapper: 'w-10 h-10', text: 'text-sm' },
  lg: { wrapper: 'w-18 h-18', text: 'text-2xl' },
  xl: { wrapper: 'w-24 h-24', text: 'text-4xl' },
};

export function Avatar({ initials, src, size = 'md', style, className = '' }: AvatarProps) {
  const { wrapper, text } = sizeClasses[size];
  return (
    <div
      className={`${wrapper} rounded-full border border-border bg-surface-2 flex items-center justify-center font-display font-bold flex-shrink-0 overflow-hidden ${text} ${className}`}
      style={style}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
