'use client';

import { useEffect, useRef, useState } from 'react';

// Crisp, size-controlled inline icons (the app has no icon webfont). currentColor
// + flex centering keeps them aligned regardless of the surrounding text metrics.
function ChevronIcon({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="shrink-0">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 opacity-80 -ml-0.5">
      <path d="M8 20V5M4.5 8.5 8 5l3.5 3.5" />
      <path d="M16 4v15M12.5 15.5 16 19l3.5-3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export interface FilterOption {
  value: string;
  label: string;
  /** Optional result count shown right-aligned in the menu. */
  count?: number;
}

interface FilterDropdownProps {
  /** Dimension name shown when nothing is selected (e.g. "Platform"). */
  label: string;
  value: string | null;
  options: FilterOption[];
  onChange: (value: string | null) => void;
  /** Sort behaves as a dropdown that always keeps a value (no clear). */
  clearable?: boolean;
  /** Leading icon (only "sort" today). */
  icon?: 'sort';
  /** Anchor the menu to the button's right edge (use for right-aligned controls). */
  align?: 'left' | 'right';
}

/**
 * A compact filter/sort control: a pill button that opens a small popover of
 * options. Unselected, it reads as the dimension name (e.g. "Platform") in a
 * muted style — the absence of a selection IS "all", so there is no "All"
 * option. Selected, it becomes an accent chip showing the value with an × to
 * clear. Sort uses clearable={false} so it always shows its current value.
 */
export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  clearable = true,
  icon,
  align = 'left',
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value != null;
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (v: string) => {
    // Re-picking the active value clears it (back to "all") when clearable.
    onChange(clearable && v === value ? null : v);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 h-9 pl-3.5 pr-2.5 rounded-full border text-sm transition-colors ${
          active
            ? 'bg-fan/15 border-fan/55 text-foreground font-medium'
            : 'bg-surface border-border text-muted hover:border-fan/40 hover:text-foreground'
        }`}
      >
        {icon === 'sort' && <SortIcon />}
        <span className="whitespace-nowrap">{active ? selected?.label ?? label : label}</span>
        {active && clearable ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear filter"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              setOpen(false);
            }}
            className="-mr-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-muted hover:text-foreground hover:bg-fan/25 transition-colors"
          >
            <XIcon />
          </span>
        ) : (
          <ChevronIcon open={open} />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1.5 min-w-[11rem] max-w-[calc(100vw-2rem)] max-h-72 overflow-auto rounded-xl border border-border bg-surface shadow-soft p-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((o) => {
            const isSel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => pick(o.value)}
                className={`flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                  isSel ? 'bg-fan/15 text-foreground font-medium' : 'text-muted hover:bg-surface-2 hover:text-foreground'
                }`}
              >
                <span className="w-3.5 shrink-0 text-fan">{isSel && <CheckIcon />}</span>
                <span className="flex-1 truncate">{o.label}</span>
                {o.count != null && <span className="tabular-nums text-xs text-muted/60">{o.count}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface SegmentOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * A binary/required toggle (always exactly one active) — used for the /creators
 * master axis. Full-width on mobile, inline on desktop.
 */
export function SegmentedToggle({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: SegmentOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex w-full sm:inline-flex sm:w-auto p-0.5 rounded-full border border-border bg-surface"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-full text-sm transition-colors ${
              active ? 'bg-fan text-black font-semibold' : 'text-muted hover:text-foreground'
            }`}
          >
            <span className="whitespace-nowrap">{o.label}</span>
            {o.count != null && (
              <span className={`tabular-nums text-xs ${active ? 'text-black/55' : 'text-muted/55'}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
