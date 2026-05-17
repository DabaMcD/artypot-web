import type { HandlePlatform } from '@/lib/types';
import { FieldLabel } from './Input';

interface PlatformConfig {
  label: string;
  prefix: string;
  placeholder: string;
}

export const PLATFORM_HANDLE_CONFIG: Record<HandlePlatform, PlatformConfig> = {
  youtube:   { label: 'Channel Handle', prefix: '@',          placeholder: 'zachking' },
  instagram: { label: 'IG Handle',      prefix: '@',          placeholder: 'zachking' },
  twitter:   { label: 'Handle',         prefix: '@',          placeholder: 'zachking' },
  tiktok:    { label: 'Username',       prefix: '@',          placeholder: 'zachking' },
  twitch:    { label: 'Channel Name',   prefix: 'twitch.tv/', placeholder: 'pokimane' },
  bluesky:   { label: 'Handle',         prefix: '@',          placeholder: 'zachking.bsky.social' },
};

/** Format a stored bare username for display, with the correct platform prefix. */
export function formatPlatformHandle(platform: HandlePlatform, username: string): string {
  return `${PLATFORM_HANDLE_CONFIG[platform].prefix}${username}`;
}

interface PlatformHandleInputProps {
  platform: HandlePlatform | '';
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PlatformHandleInput({ platform, value, onChange, disabled }: PlatformHandleInputProps) {
  if (!platform) return null;

  const config = PLATFORM_HANDLE_CONFIG[platform];

  return (
    <div>
      <FieldLabel>
        {config.label} <span className="text-bad">*</span>
      </FieldLabel>
      <div className="flex items-center w-full px-3 py-2.5 bg-background border border-border rounded focus-within:border-[var(--color-role)] transition-colors text-base">
        <span className="text-foreground select-none shrink-0 pointer-events-none">{config.prefix}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.replace('@', ''))}
          placeholder={config.placeholder}
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
