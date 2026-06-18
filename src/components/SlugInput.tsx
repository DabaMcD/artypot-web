'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { auth as authApi } from '@/lib/api';
import { FieldLabel, FieldHint } from '@/components/ui/Input';

/**
 * Stable error keys for slug format validation. These map to entries under the
 * `SlugInput` i18n namespace and are resolved to user-facing copy at render
 * time (the validator runs at module scope and cannot call hooks).
 */
export type SlugFormatError =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'invalidChars'
  | 'consecutiveSeparators';

/**
 * Validation rules (must match backend App\Support\CreatorSlug).
 *   - 3..30 chars
 *   - [a-z0-9_-] only
 *   - starts + ends with [a-z0-9]
 *   - no consecutive separators (rejects `__`, `--`, `_-`, `-_`)
 *
 * Returns null if valid, otherwise a stable error key (see SlugFormatError).
 */
export function validateSlugFormat(slug: string): SlugFormatError | null {
  if (!slug) return 'required';
  if (slug.length < 3) return 'tooShort';
  if (slug.length > 30) return 'tooLong';
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(slug)) {
    return 'invalidChars';
  }
  if (/[_-]{2,}/.test(slug)) {
    return 'consecutiveSeparators';
  }
  return null;
}

interface SlugInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional label override. Falls back to the localized default label. */
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
 * Strips leading `@`/`/` and lowercases input so creators get forgiving
 * paste/typing behavior. Slugs are lowercase-canonical: URLs always resolve
 * to lowercase (see App\Support\CreatorSlug), and stylized identity lives in
 * `display_name`. Debounces availability checks against the API.
 */
export default function SlugInput({
  value,
  onChange,
  label,
  disabled,
  onValidityChange,
}: SlugInputProps) {
  const t = useTranslations('SlugInput');
  const [checking, setChecking] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatErrorKey = validateSlugFormat(value);
  const formatError = formatErrorKey ? t(`formatErrors.${formatErrorKey}`) : null;
  // The overall error: format issue wins; otherwise show whatever the server said.
  const error = formatError ?? remoteError;

  // Tell the parent whenever validity changes.
  useEffect(() => {
    onValidityChange?.(checking ? t('checking') : error);
  }, [error, checking, onValidityChange, t]);

  // Debounce a remote availability check after each keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Skip the network call if the value is clearly invalid.
    if (formatErrorKey) {
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
        setRemoteError(res.available ? null : (res.error ?? t('taken')));
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
  }, [value, formatErrorKey, t]);

  // Forgiving paste/typing handling — lowercase live (slugs are
  // lowercase-canonical) and strip an accidental leading '/', '@', or
  // whitespace. Stylized casing belongs in `display_name`, not the URL slug.
  const handleChange = (raw: string) => {
    const cleaned = raw.trim().replace(/^[/@]+/, '').toLowerCase();
    onChange(cleaned);
  };

  return (
    <div>
      <FieldLabel>{label ?? t('defaultLabel')} <span className="text-bad">*</span></FieldLabel>
      <div className={`flex items-center w-full px-3 py-2.5 bg-background border rounded transition-colors text-base ${
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
          placeholder={t('placeholder')}
          disabled={disabled}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={30}
          className="flex-1 bg-transparent outline-none min-w-0 text-foreground placeholder:text-muted/50 disabled:opacity-50"
        />
        <span className="font-mono text-[10px] uppercase tracking-widest shrink-0 ml-2">
          {checking ? (
            <span className="text-muted">{t('checkingStatus')}</span>
          ) : error ? null : available ? (
            <span className="text-good">{t('availableStatus')}</span>
          ) : null}
        </span>
      </div>

      {error ? (
        <p className="text-xs text-bad mt-1">{error}</p>
      ) : (
        <FieldHint>
          {t.rich('hint', {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </FieldHint>
      )}
    </div>
  );
}
