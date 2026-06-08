import type { HandlePlatform } from '@/lib/types';
import { FieldLabel, FieldHint } from './Input';
import {
  OTHER_SLUG,
  PLATFORM_CATALOGUE,
  platformLabel,
  platformPrefix,
  isValidOtherUrl,
  formatPlatformHandle as catalogueFormatPlatformHandle,
} from '@/lib/platforms';

/**
 * Form-specific copy overrides per platform — used only for the input label
 * and placeholder in this component. The canonical platform metadata (prefix,
 * URL template, OAuth flag, etc.) lives in @/lib/platforms.ts. Adding a new
 * platform doesn't require touching this file unless you want a custom label.
 */
interface PlatformFormConfig {
  label: string;
  placeholder: string;
}

const PLATFORM_FORM_OVERRIDES: Record<string, PlatformFormConfig> = {
  youtube:   { label: 'Channel Handle', placeholder: 'zachking' },
  instagram: { label: 'IG Handle',      placeholder: 'zachking' },
  twitter:   { label: 'Handle',         placeholder: 'zachking' },
  tiktok:    { label: 'Username',       placeholder: 'zachking' },
  twitch:    { label: 'Channel Name',   placeholder: 'pokimane' },
  bluesky:   { label: 'Handle',         placeholder: 'markhamillofficial.bsky.social' },
  kick:      { label: 'Channel Name',   placeholder: 'xqc' },
};

/**
 * Backwards-compat re-export. Consumers that imported `PLATFORM_HANDLE_CONFIG`
 * (label + prefix + placeholder) still work; the source of truth is the
 * catalogue + the override map above.
 */
export const PLATFORM_HANDLE_CONFIG: Record<string, { label: string; prefix: string; placeholder: string }> =
  Object.fromEntries(
    Object.keys(PLATFORM_CATALOGUE).map((slug) => [
      slug,
      {
        label:       PLATFORM_FORM_OVERRIDES[slug]?.label       ?? platformLabel(slug),
        prefix:      platformPrefix(slug),
        placeholder: PLATFORM_FORM_OVERRIDES[slug]?.placeholder ?? 'zachking',
      },
    ]),
  );

/** Backwards-compat re-export — delegates to the catalogue formatter. */
export const formatPlatformHandle = catalogueFormatPlatformHandle;

interface PlatformHandleInputProps {
  platform: HandlePlatform | '';
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PlatformHandleInput({ platform, value, onChange, disabled }: PlatformHandleInputProps) {
  if (!platform) return null;

  // ── 'Other' mode — full-URL input, no prefix span ──────────────────────────
  if (platform === OTHER_SLUG) {
    const trimmed = value.trim();
    const showError = trimmed.length > 0 && !isValidOtherUrl(trimmed);

    return (
      <div>
        <FieldLabel>Website URL</FieldLabel>
        <div className={`flex items-center w-full px-3 py-2.5 bg-background border rounded transition-colors text-base ${
          showError ? 'border-bad/60' : 'border-border focus-within:border-[var(--color-role)]'
        }`}>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://wikipedia.org/wiki/Brad_Pitt"
            disabled={disabled}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent outline-none min-w-0 text-foreground placeholder:text-muted/50 disabled:opacity-50"
          />
        </div>
        {showError ? (
          <p className="text-xs text-bad mt-1">Please enter a valid http(s) URL.</p>
        ) : (
          <FieldHint>Paste the full URL to the creator&apos;s profile on any platform we don&apos;t list above.</FieldHint>
        )}
      </div>
    );
  }

  // ── Curated platform — prefix + bare username ──────────────────────────────
  const cfg = PLATFORM_HANDLE_CONFIG[platform] ?? {
    label:       platformLabel(platform),
    prefix:      platformPrefix(platform),
    placeholder: 'zachking',
  };

  return (
    <div>
      <FieldLabel>{cfg.label}</FieldLabel>
      <div className="flex items-center w-full px-3 py-2.5 bg-background border border-border rounded focus-within:border-[var(--color-role)] transition-colors text-base">
        <span className="text-foreground select-none shrink-0 pointer-events-none">{cfg.prefix}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.replace('@', ''))}
          placeholder={cfg.placeholder}
          disabled={disabled}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 bg-transparent outline-none min-w-0 text-foreground placeholder:text-muted/50 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
