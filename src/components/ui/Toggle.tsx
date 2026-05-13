'use client';

interface ToggleProps {
  on: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  className?: string;
}

export function Toggle({ on, onChange, label, className = '' }: ToggleProps) {
  return (
    <div
      role="switch"
      aria-checked={on}
      className={`inline-flex items-center gap-2.5 cursor-pointer font-display text-sm text-foreground select-none ${className}`}
      onClick={() => onChange(!on)}
    >
      {/* Track */}
      <div
        className={`relative w-[42px] h-[22px] border rounded-xl transition-colors duration-150 flex-shrink-0 ${on ? 'ap-toggle-track-on border-[var(--color-role)] bg-[var(--color-role-soft)]' : 'border-border bg-background'}`}
      >
        {/* Thumb */}
        <div
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all duration-150 ${on ? 'ap-toggle-thumb-on' : 'bg-muted'}`}
          style={on ? { transform: 'translateX(20px)', background: 'var(--color-role)' } : {}}
        />
      </div>
      {label && <span>{label}</span>}
    </div>
  );
}
