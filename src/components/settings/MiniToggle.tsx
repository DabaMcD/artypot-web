'use client';

/**
 * Compact switch used inside the notification preference matrix on both the fan
 * and creator settings pages. Lifted out of the two page files (where it was
 * duplicated verbatim) so the channel grid stays consistent across surfaces.
 *
 * - `disabled` — channel unavailable (no email/phone) or a mandatory row: 40% opacity, non-interactive.
 * - `dimmed`   — channel master is off so this child is effectively muted: 50% opacity, still toggleable.
 */
export function MiniToggle({
  checked,
  onChange,
  saving,
  label,
  disabled = false,
  dimmed = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  saving: boolean;
  label: string;
  disabled?: boolean;
  dimmed?: boolean;
}) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={label}
      disabled={saving || disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-role)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        disabled ? 'opacity-40' : dimmed ? 'opacity-50' : ''
      } ${checked ? 'bg-[var(--color-role)]' : 'bg-surface-2 border border-border'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
