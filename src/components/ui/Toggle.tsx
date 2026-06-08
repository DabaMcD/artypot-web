'use client';

interface ToggleProps {
  on: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function Toggle({ on, onChange, label, className = '', disabled = false }: ToggleProps) {
  return (
    <div
      role="switch"
      aria-checked={on}
      aria-disabled={disabled}
      className={`inline-flex items-center gap-2.5 select-none text-sm text-foreground ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={() => { if (!disabled) onChange(!on); }}
    >
      {/* Track — 42×22 outer, 1px border → 40×20 inner padding box */}
      <div
        className={`relative w-[42px] h-[22px] border rounded-full transition-colors duration-150 flex-shrink-0 ${on ? 'ap-toggle-track-on' : 'ap-toggle-track-off bg-background'}`}
      >
        {/* Thumb — 14px circle, centered: (20-14)/2 = 3px inset on every side.
            On-position slides 20px right (40-14-3-3) to keep an equal 3px gap. */}
        <div
          className={`absolute w-3.5 h-3.5 rounded-full transition-transform duration-150 ${on ? 'ap-toggle-thumb-on' : 'bg-muted'}`}
          style={{ top: 3, left: 3, transform: on ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </div>
      {label && <span>{label}</span>}
    </div>
  );
}
