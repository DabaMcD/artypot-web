'use client';

import { useEffect, useRef, useState } from 'react';
import { auth as authApi } from '@/lib/api';
import { FieldLabel, FieldHint } from '@/components/ui/Input';

/**
 * Validation rules (must match backend App\Support\CreatorSlug).
 *   - 3..30 chars
 *   - [a-z0-9_-] only
 *   - starts + ends with [a-z0-9]
 *   - no consecutive separators (rejects `__`, `--`, `_-`, `-_`)
 *
 * Returns null if valid, otherwise a user-facing error message.
 */
export function validateSlugFormat(slug: string): string | null {
  if (!slug) return 'Slug is required.';
  if (slug.length < 3) return 'Slug must be at least 3 characters.';
  if (slug.length > 30) return 'Slug must be 30 characters or fewer.';
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(slug)) {
    return 'Use only lowercase letters, numbers, underscores, and hyphens — and start and end with a letter or number.';
  }
  if (/[_-]{2,}/.test(slug)) {
    return 'No consecutive underscores or hyphens.';
  }
  return null;
}

interface SlugInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional label override. Defaults to "your creator URL". */
  label?: string;
  /** Disable async availability checks (e.g. when re-rendering with the same value). */
  disabled?: boolean;
  /**
   * Called whenever validation state changes. `null` ⇒ valid + available.
   * Use this to gate the parent's submit button.
   */
  onValidityChange?: (error: string | null) => void;
}

/**
 * Slug picker with live format + availability validation.
 *
 * Strips leading `@`/`/` and uppercase chars from input so creators get
 * forgiving paste behavior. Debounces availability checks against the API.
 */
export default function SlugInput({
  value,
  onChange,
  label = 'your creator URL',
  disabled,
  onValidityChange,
}: SlugInputProps) {
  const [checking, setChecking] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatError = validateSlugFormat(value);
  // The overall error: format issue wins; otherwise show whatever the server said.
  const error = formatError ?? remoteError;

  // Tell the parent whenever validity changes.
  useEffect(() => {
    onValidityChange?.(checking ? 'Checking…' : error);
  }, [error, checking, onValidityChange]);

  // Debounce a remote availability check after each keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Skip the network call if the value is clearly invalid.
    if (formatError) {
      setRemoteError(null);
      setAvailable(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await authApi.checkSlug(value);
        setAvailable(res.available);
        setRemoteError(res.available ? null : (res.error ?? 'That slug is already taken.'));
      } catch {
        setRemoteError(null);
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, formatError]);

  // Forgiving paste handling — strip an accidental leading '/', '@', or whitespace.
  const handleChange = (raw: string) => {
    const cleaned = raw.trim().replace(/^[/@]+/, '');
    onChange(cleaned);
  };

  return (
    <div>
      <FieldLabel>{label} <span className="text-bad">*</span></FieldLabel>
      <div className={`flex items-center w-full px-3 py-2.5 bg-background border rounded transition-colors font-display text-base ${
        error
          ? 'border-bad/60 focus-within:border-bad'
          : available
            ? 'border-good/60 focus-within:border-good'
            : 'border-border focus-within:border-[var(--color-role)]'
      }`}>
        <span className="text-muted select-none shrink-0 pointer-events-none">artypot.com/</span>
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="yourname"
          disabled={disabled}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={30}
          className="flex-1 bg-transparent outline-none min-w-0 text-foreground placeholder:text-muted/50 disabled:opacity-50"
        />
        <span className="font-mono text-[10px] uppercase tracking-widest shrink-0 ml-2">
          {checking ? (
            <span className="text-muted">checking…</span>
          ) : error ? null : available ? (
            <span className="text-good">available</span>
          ) : null}
        </span>
      </div>

      {error ? (
        <p className="font-display text-xs text-bad mt-1">{error}</p>
      ) : (
        <FieldHint>
          3–30 characters · lowercase letters, numbers, <code>_</code>, <code>-</code> · no leading or trailing separator
        </FieldHint>
      )}
    </div>
  );
}
