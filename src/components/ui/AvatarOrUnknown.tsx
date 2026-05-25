export interface AvatarOrUnknownProps {
  avatarUrl: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES: Record<NonNullable<AvatarOrUnknownProps['size']>, string> = {
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-18 h-18',
  xl: 'w-24 h-24',
};

export function AvatarOrUnknown({ avatarUrl, size = 'md' }: AvatarOrUnknownProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (avatarUrl !== null) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-muted/20 border border-border flex items-center justify-center shrink-0`}
    >
      <span className="text-muted text-sm font-mono select-none">?</span>
    </div>
  );
}
