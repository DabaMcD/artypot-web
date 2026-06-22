'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/**
 * The single home for settings edit dialogs. Wraps the shared <Modal> and bakes
 * in the behaviour the bare Modal lacks, scoped to the settings surface:
 *
 *  - real <form> semantics so Enter submits (and the submit button is type=submit);
 *  - Escape-to-close and backdrop-close, both suppressed while `busy` so a
 *    half-finished save can't be dismissed;
 *  - body scroll-lock while open;
 *  - autofocus the first field, a simple Tab focus-trap, and focus restoration
 *    to the trigger on close;
 *  - a standardized Cancel / Submit footer (Submit swaps to `savingLabel` while busy).
 *
 * Pass `onSubmit` to get the form + footer. Omit it (and pass `footer`) for a
 * fully custom action row, e.g. a multi-step confirm.
 */
export function SettingEditModal({
  title,
  onClose,
  onSubmit,
  submitLabel,
  savingLabel,
  cancelLabel,
  submitDisabled = false,
  busy = false,
  submitVariant = 'primary',
  lg = false,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  /** When set, children are wrapped in a <form> and the default footer renders. */
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  savingLabel?: string;
  cancelLabel: string;
  submitDisabled?: boolean;
  busy?: boolean;
  submitVariant?: 'primary' | 'danger';
  lg?: boolean;
  /** Replaces the default footer entirely (rendered inside the form). */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape (unless saving) + lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [busy, onClose]);

  // Autofocus the first field; restore focus to the trigger element on close.
  useEffect(() => {
    const prevFocused = document.activeElement as HTMLElement | null;
    const first = containerRef.current?.querySelector<HTMLElement>(
      'input, select, textarea',
    );
    first?.focus();
    return () => prevFocused?.focus?.();
  }, []);

  // Minimal Tab focus-trap so keyboard focus stays within the dialog.
  const onKeyDownTrap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusables = containerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const list = Array.from(focusables).filter((el) => el.offsetParent !== null);
    if (list.length === 0) return;
    const firstEl = list[0];
    const lastEl = list[list.length - 1];
    const active = document.activeElement as HTMLElement;
    if (e.shiftKey && active === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && active === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || submitDisabled) return;
    onSubmit?.();
  };

  const defaultFooter = (
    <>
      <Button type="button" variant="ghost" onClick={() => !busy && onClose()} disabled={busy}>
        {cancelLabel}
      </Button>
      {onSubmit && (
        <Button type="submit" variant={submitVariant} disabled={submitDisabled || busy}>
          {busy ? savingLabel ?? submitLabel : submitLabel}
        </Button>
      )}
    </>
  );

  return (
    <Modal title={title} onClose={() => !busy && onClose()} lg={lg}>
      <div ref={containerRef} onKeyDown={onKeyDownTrap}>
        <form onSubmit={handleSubmit}>
          {children}
          <div className="flex items-center justify-end gap-2 mt-6">{footer ?? defaultFooter}</div>
        </form>
      </div>
    </Modal>
  );
}
